/**
 * Plain localStorage read/write for the JWT access+refresh pair — same
 * `engineering-studio:*` key namespace and try/catch-and-ignore-storage-failures
 * convention as `@/lib/problemProgress`. Deliberately has no reactivity of
 * its own (no listeners/useSyncExternalStore here) — `auth/authStore.ts`
 * owns the reactive `user` state that actually changes when these do; this
 * module is just where the two strings live.
 */

const ACCESS_TOKEN_KEY = "engineering-studio:access-token";
const REFRESH_TOKEN_KEY = "engineering-studio:refresh-token";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function readTokens(): TokenPair | null {
  if (typeof window === "undefined") return null;
  try {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export function writeTokens(tokens: TokenPair): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    // Private browsing / storage disabled — the session still works for
    // this page load, it just won't survive a reload.
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Nothing to do if storage is unavailable — there was nothing durable to clear anyway.
  }
}
