"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BatMark } from "@/components/theme/icons/BatMark";
import { lessonHref } from "@/content/lockIn/villains";
import { getActiveChapter, useLockInState } from "@/lib/lockInMode";

/**
 * Mounted once in the root layout (see `layout.tsx`), alongside
 * `NightOpsAtmosphere`. An earlier version tried to enforce a genuinely
 * hard lock here — a history-buffer trap re-armed on every route change,
 * plus a forced `router.replace` bouncing any off-track page back to the
 * run's current chapter. Both were real, working mechanisms, but they
 * were also fragile (subtle bugs around Next's own history/router-cache
 * interactions) and confusing to reason about for what this feature
 * actually needs — see conversation. Deliberately simpler now:
 *
 *  1. `beforeunload` — still nags on tab-close/refresh/typed-URL
 *     navigation while a run is active, via the browser's native
 *     "leave site?" confirm. The one piece of real friction kept as-is.
 *  2. A persistent "return to your lock-in" pill, bottom-right on every
 *     page while a run is active. Not a redirect — just an always-there
 *     way back, so wandering off (an `/entities/*` page, `/workshop`,
 *     wherever) is never a dead end the way it could be before, when
 *     nothing on an off-track page could get you back to a working
 *     "Defeat" action.
 *
 * Everything else — hiding a locked lesson page's own nav chrome — is
 * `LockInHeaderNav`/`HideWhileLockedIn`'s job, unchanged.
 */
export function LockInGuard() {
  const state = useLockInState();
  const pathname = usePathname();
  const active = state.active;

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);

  const chapter = getActiveChapter(state);
  const target = chapter ? lessonHref(chapter.lesson) : "/batman-mode/victory";

  // Also hidden while already on the page it would point to — a pill
  // telling you to "return" to where you're standing is just noise.
  if (!active || pathname === target) return null;

  const label = chapter ? `return to ${chapter.villain.name}` : "return to claim victory";

  return (
    <Link
      href={target}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 border border-signal/50 bg-bg-elevated px-3 py-2 font-mono text-xs uppercase tracking-wide text-signal shadow-elevated transition-colors duration-fast ease-standard hover:bg-bg-panel hover:border-signal"
    >
      <BatMark className="size-3.5" aria-hidden />
      Batman Mode active — {label} →
    </Link>
  );
}
