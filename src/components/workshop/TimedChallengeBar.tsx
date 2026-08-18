"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useWorkshopStore } from "@/store/workshopStore";
import { getScenario } from "@/scenarios";
import { formatCountdown, timeLimitMsFor } from "@/lib/timedChallenge";

/**
 * Countdown for the active scenario's Timed Challenge attempt — renders
 * nothing until `timedModeStartedAt` is set (via the `?scenario=<id>&
 * timed=1` deep link, see `ScenarioDeepLink` in `src/app/workshop/
 * page.tsx`, or the Inspector's Restart-while-timed path in
 * `workshopStore.ts`'s `loadScenario`).
 *
 * Doesn't force-fail on expiry — a late solve still counts, it just
 * won't earn the "beat the clock" badge (`problemProgress.ts`'s
 * `underTimeAchieved`), the same "the clock keeps running, it doesn't
 * lock you out" contract most timed contests use.
 */
export function TimedChallengeBar() {
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const timedModeStartedAt = useWorkshopStore((s) => s.timedModeStartedAt);
  const scenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timedModeStartedAt === null) return;
    // Ticks every second; `now`'s initial value already came from
    // `Date.now()` at mount (see useState above), so this only needs to
    // keep it moving from here, not force an immediate first tick — a
    // fresh `timedModeStartedAt` (e.g. a mid-challenge Restart) can be up
    // to 1s stale for a single render, a cosmetic gap not worth a
    // setState-in-effect to close.
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timedModeStartedAt]);

  if (!scenario || timedModeStartedAt === null) return null;

  const remainingMs = timedModeStartedAt + timeLimitMsFor(scenario) - now;
  const expired = remainingMs <= 0;
  const critical = !expired && remainingMs <= 60_000;

  return (
    <div
      role="timer"
      aria-label={
        expired ? "Timed challenge expired" : `Timed challenge, ${formatCountdown(remainingMs)} remaining`
      }
      className={`flex h-8 shrink-0 items-center gap-1.5 border px-2.5 font-mono text-xs tabular-nums ${
        expired
          ? "border-status-critical/50 text-status-critical"
          : critical
            ? "border-status-degraded/50 text-status-degraded"
            : "border-border text-text-muted"
      }`}
    >
      <Timer className="size-3.5" aria-hidden />
      {expired ? "Time's up" : formatCountdown(remainingMs)}
    </div>
  );
}
