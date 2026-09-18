"use client";

import { useAuth } from "@/lib/auth/authStore";

/**
 * Mounted once, in the root layout, alongside `ThemeProvider`/`LockInGuard`
 * — renders nothing, exists purely to call `useAuth()` so its bootstrap
 * effect (read localStorage tokens, re-fetch `/me`) runs on EVERY page
 * load, not just the ones that happen to render `AuthStatus`.
 *
 * A real gap this closes: before this existed, a session with valid
 * tokens landing directly on `/workshop` (which renders no `useAuth()`
 * caller of its own) never bootstrapped at all — `getCurrentUser()`
 * stayed `null` for the whole visit even though the user WAS signed in,
 * silently breaking Increment 2's Timed Challenge → backend attempt
 * wiring for anyone who didn't happen to visit `/problems` first in that
 * session. Caught live, in a real browser, not assumed away — see
 * masterdoc/phase-frontend-integration/decisions.md.
 */
export function AuthBootstrap() {
  useAuth();
  return null;
}
