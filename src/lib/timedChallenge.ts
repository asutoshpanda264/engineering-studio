import type { Scenario } from "@/scenarios";

/**
 * Fallback countdown length by difficulty, minutes — used whenever a
 * scenario doesn't set its own `suggestedTimeLimitMinutes`. Scales
 * gently, not proportionally: a difficulty-5 scenario isn't 5x harder to
 * *think through* than a difficulty-1 one, just meaningfully harder.
 */
const DEFAULT_TIME_LIMIT_MINUTES: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 10,
  2: 15,
  3: 20,
  4: 25,
  5: 30,
};

export function timeLimitMinutesFor(scenario: Scenario): number {
  return scenario.suggestedTimeLimitMinutes ?? DEFAULT_TIME_LIMIT_MINUTES[scenario.difficulty];
}

export function timeLimitMsFor(scenario: Scenario): number {
  return timeLimitMinutesFor(scenario) * 60_000;
}

/** `m:ss`, clamped at 0 — never a negative countdown once time's up. */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
