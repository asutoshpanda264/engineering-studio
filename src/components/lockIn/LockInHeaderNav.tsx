"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { BatMark } from "@/components/theme/icons/BatMark";
import { useLockInState } from "@/lib/lockInMode";

/**
 * Wraps a lesson page's header row (the "All lessons" link on the left,
 * theme toggle + "Open Workshop" on the right). While a run is active,
 * swaps both slots for plain, non-interactive locked indicators instead
 * of rendering `left`/`right` at all — this is what actually removes the
 * escape hatches `LockInGuard`'s history/beforeunload trap can't reach
 * (in-app `<Link>`/button navigation never fires `popstate` or
 * `beforeunload`). Losing the theme toggle specifically also means
 * there's no way to step out of `night-ops` mid-run, which is the point.
 */
export function LockInHeaderNav({ left, right }: { left: ReactNode; right: ReactNode }) {
  const state = useLockInState();

  if (!state.active) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }

  return (
    <>
      <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-signal">
        <Lock className="size-3.5" aria-hidden />
        Locked
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
        <BatMark className="size-3.5" aria-hidden />
        Batman Mode
      </span>
    </>
  );
}
