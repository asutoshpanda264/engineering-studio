import { useSyncExternalStore } from "react";
import type { FoundationLesson } from "@/content/foundations/types";

/**
 * Client-side "read this lesson" tracking that drives the `/foundations`
 * forest map (`FoundationsMap`) — plain `localStorage`, matching
 * `problemProgress.ts`/`lockInMode.ts`'s established convention
 * (module-level cache + listener set + `useSyncExternalStore`) rather than
 * this codebase's first Zustand `persist` middleware for a single feature.
 * Same stopgap framing as `problemProgress.ts`: no accounts exist yet, this
 * is superseded by server-side progress once the real-backend pivot lands,
 * and the shape here stays a plain slug array so that migration is a
 * data-source swap, not a rewrite of every call site.
 */

const STORAGE_KEY = "engineering-studio:foundations-progress";

const EMPTY_SLUGS: readonly string[] = [];

const listeners = new Set<() => void>();
let cache: string[] | null = null;

function isValid(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function read(): string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = isValid(parsed) ? parsed : [];
  } catch {
    // Corrupt JSON or storage disabled — start fresh rather than throw.
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / storage disabled — progress just won't persist
    // across visits, same tradeoff problemProgress.ts already accepts.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getCompletedFoundationSlugs(): string[] {
  return read();
}

export function isLessonComplete(slug: string): boolean {
  return read().includes(slug);
}

export function markLessonComplete(slug: string): void {
  const current = read();
  if (current.includes(slug)) return;
  write([...current, slug]);
}

/** Powers the "Mark complete" toggle re-clicking itself off — a reader correcting a mistaken click, not a feature anyone needs to reach for often. */
export function markLessonIncomplete(slug: string): void {
  const current = read();
  if (!current.includes(slug)) return;
  write(current.filter((item) => item !== slug));
}

/** Reactive read for components (the map, the lesson page's toggle) — rerenders on any markLessonComplete/markLessonIncomplete call, same tab or not. */
export function useFoundationsProgress(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY_SLUGS as string[]);
}

// Separate key, separate concern from `STORAGE_KEY` above: not "what's
// complete" but "what had the reader already seen completed, last time
// they looked at the map." `FoundationsMap` diffs current-vs-this on
// mount to know which nodes to play a reveal transition for (yellow→green
// on a lesson finished since last visit, dark→yellow on whatever that
// unlocks) rather than replaying the same reveal on every single visit
// regardless of whether anything actually changed. No listeners/reactive
// hook needed — nothing subscribes to this live, it's read and written
// once per map mount.
const SEEN_STORAGE_KEY = "engineering-studio:foundations-map-seen";

/**
 * The completed-slugs snapshot as of the reader's last visit to the map.
 * Defaults to the *current* completed set (not `[]`) when nothing's been
 * recorded yet — first-ever use of this key, whether a brand-new reader
 * or an existing one whose real progress predates this feature — so nothing
 * spuriously animates as "just unlocked" the first time this ships against
 * progress that's actually old news.
 */
export function getLastSeenFoundationSlugs(): string[] {
  if (typeof window === "undefined") return getCompletedFoundationSlugs();
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isValid(parsed)) return parsed;
  } catch {
    // Corrupt JSON or storage disabled — fall through to the same
    // no-spurious-animation default as "never recorded."
  }
  return getCompletedFoundationSlugs();
}

/** Call once the reveal diff for this mount has been computed — marks the current completed set as "seen" so the next visit doesn't replay it. */
export function markFoundationsMapSeen(slugs: readonly string[]): void {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Private browsing / storage disabled — same tradeoff `write` above
    // already accepts; worst case the reveal replays next visit too.
  }
}

export type FoundationLessonStatus = "locked" | "available" | "completed";

/**
 * Derives a map node's state from its `prerequisites` — pure, so the map,
 * the lesson-page toggle, and tests can all call it without touching
 * storage directly. A lesson with no prerequisites (a root) is always at
 * least `available`. `completedSlugs` only needs to support `.includes`,
 * so either the raw array from `useFoundationsProgress`/`read` or a `Set`
 * built from it works.
 *
 * Prerequisite gating is only ever *consulted* by `FoundationsMap` (Batman
 * Mode's arcade map, gated on `data-theme="night-ops"`) — `FoundationsJourney`
 * (the default theme's index) never calls this function, and
 * `/foundations/[slug]` itself has always been directly reachable
 * regardless of a lesson's map status ("browsing is always free" — a
 * `"locked"` node is a torch-lit *preview*, not an access gate). So a
 * `"locked"` result only ever changes what the Batman-mode map draws, never
 * what a reader can actually open.
 */
export function getLessonStatus(
  lesson: Pick<FoundationLesson, "slug" | "prerequisites">,
  completedSlugs: readonly string[] | ReadonlySet<string>
): FoundationLessonStatus {
  // Normalize to a `Set` once rather than branching per lookup — both
  // input shapes are `Iterable<string>`, so this works regardless of which
  // one was passed in without fighting TS's narrowing over the union.
  const completed = completedSlugs instanceof Set ? completedSlugs : new Set(completedSlugs);
  const has = (slug: string) => completed.has(slug);

  if (has(lesson.slug)) return "completed";

  const prerequisites = lesson.prerequisites ?? [];
  const allMet = prerequisites.every((prereq) => has(prereq));
  return allMet ? "available" : "locked";
}
