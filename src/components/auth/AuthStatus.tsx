"use client";

import Link from "next/link";
import { Flame, LogOut, User } from "lucide-react";
import { LinkButton } from "@/components/ui/LinkButton";
import { useAuth } from "@/lib/auth/authStore";

/**
 * Rendered by `AppHeader` itself (always at the far right, past
 * `ThemeToggle`) — the one place a signed-in session becomes visible
 * across the app. `status === "idle" | "loading"` both render nothing
 * rather than a flash of "signed out" followed by a flash of the real
 * state — the bootstrap check (`useAuth()`'s own effect) resolves fast
 * enough on a real session that a loading spinner here would just be
 * noise. Icon-only once signed in (no visible display name — see the
 * Sept 18 nav plan, item 4); the name is still available as a native
 * tooltip on the user icon.
 */
export function AuthStatus() {
  const { user, status, logout } = useAuth();

  if (status !== "ready") {
    return <div className="h-9 w-20" aria-hidden />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="font-mono text-xs uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-text"
        >
          Sign in
        </Link>
        <LinkButton href="/register" variant="secondary" size="sm">
          Create account
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.currentStreak > 0 && (
        <span
          className="flex items-center gap-1 font-mono text-xs text-text-muted"
          title={`${user.currentStreak}-day streak (longest: ${user.longestStreak})`}
        >
          <Flame className="size-3.5 text-status-degraded" aria-hidden />
          {user.currentStreak}
        </span>
      )}
      <span
        className="flex size-8 items-center justify-center text-text-muted"
        title={`Signed in as ${user.displayName}`}
        aria-label={`Signed in as ${user.displayName}`}
      >
        <User className="size-4" aria-hidden />
      </span>
      <button
        type="button"
        onClick={() => logout()}
        title="Sign out"
        aria-label="Sign out"
        className="flex size-8 items-center justify-center text-text-muted transition-colors duration-fast ease-standard hover:text-text"
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </div>
  );
}
