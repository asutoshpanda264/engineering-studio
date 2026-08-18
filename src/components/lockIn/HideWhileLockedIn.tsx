"use client";

import type { ReactNode } from "react";
import { useLockInState } from "@/lib/lockInMode";

/**
 * Renders `children` normally, or nothing while a lock-in run is active —
 * for nav affordances that don't need a locked-state placeholder in their
 * place (unlike `LockInHeaderNav`'s header slots, which do). Used for the
 * prev/next-lesson row: it walks the whole course sequence, not the
 * trilogy's 3 chapters, so it's a plain escape hatch during a run, not
 * something worth explaining inline — the chapter banner above the lesson
 * body already says where the student actually is.
 */
export function HideWhileLockedIn({ children }: { children: ReactNode }) {
  const state = useLockInState();
  if (state.active) return null;
  return <>{children}</>;
}
