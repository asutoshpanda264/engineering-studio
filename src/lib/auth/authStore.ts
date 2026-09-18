"use client";

import { useEffect, useSyncExternalStore } from "react";
import { apiRequest, ApiError } from "@/lib/api/client";
import type { LoginRequest, RegisterRequest, TokenPairResponse, UserResponse } from "@/lib/api/types";
import { clearTokens, readTokens, writeTokens } from "./tokens";

/**
 * The reactive "who's signed in" store for the whole app — same
 * module-level-cache + listener-set + `useSyncExternalStore` shape as
 * `@/components/theme/ThemeProvider` and `@/lib/problemProgress`, not a
 * Context provider (no wrapping `<AuthProvider>` needed anywhere — any
 * component just calls `useAuth()` directly, matching
 * `useProblemProgress`'s existing precedent) and not Zustand (this
 * codebase's own established preference — see `problemProgress.ts`'s
 * header comment — is this lighter pattern over introducing `persist`
 * middleware for a single cross-cutting feature).
 *
 * `status: "idle"` is the SSR-safe initial value (no `window`, so no way
 * to know yet) — `useAuth()`'s effect kicks off `bootstrap()` once
 * mounted client-side, matching `ThemeProvider`'s "server assumes the
 * default, reconciles right after hydration" shape.
 */
interface AuthState {
  user: UserResponse | null;
  status: "idle" | "loading" | "ready";
}

// A stable, module-level constant — not a fresh object literal — for both
// the initial state AND getServerSnapshot's return value below. Same fix
// `@/lib/problemProgress`'s own `EMPTY_PROGRESS` constant already applies:
// `useSyncExternalStore` requires getServerSnapshot to return a
// REFERENTIALLY STABLE value when nothing has changed — a new `{ ... }`
// literal on every call reads as "changed" on every render, which React
// surfaces as "The result of getServerSnapshot should be cached to avoid
// an infinite loop" (caught live, in a real browser, not just inferred).
const IDLE_STATE: AuthState = { user: null, status: "idle" };

let state: AuthState = IDLE_STATE;
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot(): AuthState {
  return state;
}

function getServerSnapshot(): AuthState {
  return IDLE_STATE;
}

/**
 * A plain (non-hook) read of the current user — for code outside React's
 * render cycle that still needs "is anyone signed in right now" (Increment
 * 2: `workshopStore.ts`, a Zustand store, isn't a component and can't call
 * `useAuth()`). Components should use `useAuth()` instead, so they
 * actually re-render when this changes — this is a point-in-time snapshot,
 * not reactive.
 */
export function getCurrentUser(): UserResponse | null {
  return state.user;
}

/**
 * Wraps `apiRequest` with the current access token plus a single
 * refresh-and-retry on a 401 — the one place this project's "an expired
 * 15-minute access token shouldn't force a re-login" behavior lives.
 * Exported so any other authenticated API module (attempts, progress, ...
 * as the integration grows) reuses this instead of re-implementing its
 * own retry.
 */
export async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const tokens = readTokens();
  if (!tokens) {
    throw new ApiError({
      timestamp: new Date().toISOString(),
      status: 401,
      error: "Unauthorized",
      message: "Not signed in",
      fieldErrors: {},
    });
  }

  try {
    return await apiRequest<T>(path, { ...options, accessToken: tokens.accessToken });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    // Access token rejected (almost certainly just expired) — try
    // exactly once to refresh before giving up. A second 401 here means
    // the refresh token itself is gone/expired/revoked, not a fluke.
    try {
      const refreshed = await apiRequest<TokenPairResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      writeTokens(refreshed);
      return await apiRequest<T>(path, { ...options, accessToken: refreshed.accessToken });
    } catch {
      clearTokens();
      setState({ user: null, status: "ready" });
      throw error;
    }
  }
}

async function bootstrap() {
  if (state.status !== "idle") return;
  const tokens = readTokens();
  if (!tokens) {
    setState({ user: null, status: "ready" });
    return;
  }
  setState({ ...state, status: "loading" });
  try {
    const user = await authenticatedRequest<UserResponse>("/me");
    setState({ user, status: "ready" });
  } catch {
    // Both the access token AND a refresh attempt failed — genuinely
    // logged out, not a transient error worth surfacing on page load.
    setState({ user: null, status: "ready" });
  }
}

/**
 * Re-fetches `/me` and updates the store — call after anything that
 * could have changed the signed-in user's own server-tracked state
 * without this tab knowing (Increment 2: a successful backend attempt
 * submit can move `currentStreak`/points, and `AuthStatus`'s streak badge
 * has no other way to find out). A no-op if nobody's signed in.
 */
export async function refreshUser(): Promise<void> {
  if (!state.user) return;
  try {
    const user = await authenticatedRequest<UserResponse>("/me");
    setState({ user, status: "ready" });
  } catch {
    // Best-effort — if this fails, the UI just keeps showing the
    // previous (still-valid) snapshot until the next successful refresh.
  }
}

export async function login(request: LoginRequest): Promise<void> {
  const tokens = await apiRequest<TokenPairResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  });
  writeTokens(tokens);
  const user = await authenticatedRequest<UserResponse>("/me");
  setState({ user, status: "ready" });
}

export async function register(request: RegisterRequest): Promise<void> {
  // POST /auth/register only ever creates a plain USER (see
  // engineering-studio-backend's AuthService) and returns the new user,
  // not a token pair — logging in right after makes "create an account"
  // and "be signed in" feel like one action instead of two.
  await apiRequest("/auth/register", { method: "POST", body: JSON.stringify(request) });
  await login({ email: request.email, password: request.password });
}

export async function logout(): Promise<void> {
  const tokens = readTokens();
  clearTokens();
  setState({ user: null, status: "ready" });
  if (tokens) {
    // Best-effort — revokes the refresh token server-side so it can't be
    // replayed later, but a logout must never hang on (or fail because
    // of) this network call; the local sign-out above already happened.
    apiRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    }).catch(() => {});
  }
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    bootstrap();
  }, []);

  return { ...snapshot, login, register, logout };
}
