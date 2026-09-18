"use client";

import Link from "next/link";
import { Flame, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/authStore";

/**
 * The Workshop header's own compact auth indicator — a separate component
 * from `AuthStatus` (not a shared one) because `WorkshopHeader.tsx`
 * already needed ~1335px with zero breakpoints before this (see
 * masterdoc/phase-frontend-integration/decisions.md #11 in the backend
 * repo) — squeezing `AppHeader`'s own layout in was rejected as a real
 * layout regression risk for a polish item. Both are icon-only once
 * signed in (no visible display name, per the Sept 18 nav plan's item 4),
 * so the two components now render the *same way*, just at different
 * widths — this one keeps its "Sign In" label and streak count behind an
 * `xl:` breakpoint that `AppHeader`'s wider layout doesn't need.
 */
export function WorkshopAuthStatus() {
  const { user, status, logout } = useAuth();

  if (status !== "ready") {
    return <div className="size-8 shrink-0" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 px-3 text-xs font-medium text-text-muted transition-colors duration-fast ease-standard hover:bg-bg-elevated hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        aria-label="Sign in — track solves, points, and leaderboard rank"
        title="Sign in to track solves, points, and leaderboard rank"
      >
        <LogIn className="size-4 shrink-0" aria-hidden />
        <span className="hidden xl:inline">Sign In</span>
      </Link>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {user.currentStreak > 0 && (
        <span
          className="hidden items-center gap-1 font-mono text-xs text-text-muted xl:flex"
          title={`${user.currentStreak}-day streak (longest: ${user.longestStreak})`}
        >
          <Flame className="size-3.5 text-status-degraded" aria-hidden />
          {user.currentStreak}
        </span>
      )}
      <span
        className="flex size-8 shrink-0 items-center justify-center text-text-muted"
        title={`Signed in as ${user.displayName}`}
        aria-label={`Signed in as ${user.displayName}`}
      >
        <User className="size-4 shrink-0" aria-hidden />
      </span>
      <Button
        variant="ghost"
        size="sm"
        icon={<LogOut className="size-4" aria-hidden />}
        onClick={() => logout()}
        aria-label="Sign out"
        title="Sign out"
      />
    </div>
  );
}
