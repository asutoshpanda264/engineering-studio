import { useSyncExternalStore } from "react";

/**
 * Client-side "solved this problem" tracking for the `/problems` catalogue
 * — plain `localStorage`, matching `ThemeProvider.tsx`'s established
 * convention (module-level cache + listener set + `useSyncExternalStore`
 * for reactivity) rather than introducing this codebase's first Zustand
 * `persist` middleware for a single feature. No accounts exist yet — this
 * is intentionally a stopgap, to be superseded by server-side progress
 * once the real-backend pivot lands (see the memory note on that
 * decision); the shape here is deliberately simple so migrating later is
 * a data-source swap, not a rewrite of every call site.
 */

export type ProblemStatus = "unattempted" | "attempted" | "solved";

export interface ProblemProgressEntry {
  status: "attempted" | "solved";
  /** Best star rating ever achieved on this scenario across attempts — never downgraded by a later, worse run. */
  bestStars: 0 | 1 | 2 | 3 | 5;
  /** True once solved within a Timed Challenge's limit at least once — sticky, like `bestStars`. */
  underTimeAchieved: boolean;
  lastAttemptedAt: number;
}

// `| undefined` explicit on the value, not just `Record<string, T>` — a
// lookup by an arbitrary scenario id is usually a miss (most scenarios
// have never been attempted), and this codebase doesn't set
// `noUncheckedIndexedAccess`, so without this every `progress[id]` would
// type-check as always-present and silently swallow the `?? "unattempted"`
// fallback callers rely on (see `/problems/page.tsx`).
export type ProblemProgress = Record<string, ProblemProgressEntry | undefined>;

const STORAGE_KEY = "engineering-studio:problem-progress";

const listeners = new Set<() => void>();
let cache: ProblemProgress | null = null;

function read(): ProblemProgress {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as ProblemProgress) : {};
  } catch {
    // Corrupt JSON or storage disabled — start fresh rather than throw.
    cache = {};
  }
  return cache;
}

function write(next: ProblemProgress) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / storage disabled — progress just won't persist
    // across visits, same tradeoff ThemeProvider.tsx already accepts.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

const EMPTY_PROGRESS: ProblemProgress = {};

export function getProblemProgress(): ProblemProgress {
  return read();
}

export function getProblemStatus(scenarioId: string): ProblemStatus {
  return read()[scenarioId]?.status ?? "unattempted";
}

/**
 * Fires whenever a scenario is loaded onto the canvas (`loadScenario` in
 * `workshopStore.ts`) — the lightest possible signal that a student
 * looked at this problem. Never downgrades an existing "solved" entry
 * back to "attempted"; only `lastAttemptedAt` moves.
 */
export function recordAttempted(scenarioId: string): void {
  const current = read();
  const existing = current[scenarioId];
  write({
    ...current,
    [scenarioId]: {
      status: existing?.status ?? "attempted",
      bestStars: existing?.bestStars ?? 0,
      underTimeAchieved: existing?.underTimeAchieved ?? false,
      lastAttemptedAt: Date.now(),
    },
  });
}

/**
 * Fires from `ScenarioCompletionToast.tsx`'s existing `gatesPassed ===
 * true` branch — the one place that already knows a genuine new passing
 * run happened. `bestStars`/`underTimeAchieved` only ever improve, never
 * regress on a later, weaker run.
 */
export function recordSolved(
  scenarioId: string,
  stars: 0 | 1 | 2 | 3 | 5,
  underTime: boolean
): void {
  const current = read();
  const existing = current[scenarioId];
  const bestStars = Math.max(existing?.bestStars ?? 0, stars) as 0 | 1 | 2 | 3 | 5;
  write({
    ...current,
    [scenarioId]: {
      status: "solved",
      bestStars,
      underTimeAchieved: (existing?.underTimeAchieved ?? false) || underTime,
      lastAttemptedAt: Date.now(),
    },
  });
}

/** Reactive read for components (e.g. the `/problems` list) — rerenders on any recordAttempted/recordSolved call, same tab or not (a future BroadcastChannel/storage-event listener could extend `subscribe` for cross-tab sync; not needed yet). */
export function useProblemProgress(): ProblemProgress {
  return useSyncExternalStore(subscribe, read, () => EMPTY_PROGRESS);
}
