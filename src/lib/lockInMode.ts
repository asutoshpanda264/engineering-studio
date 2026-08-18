import { useSyncExternalStore } from "react";
import { VILLAIN_SEQUENCE, type LockInLessonRef, type LockInVillain } from "@/content/lockIn/villains";

/**
 * State machine for "Batman Mode" lock-in — see `src/content/lockIn/villains.ts`
 * for the content this drives. Plain `localStorage`, matching
 * `problemProgress.ts`'s (and originally `ThemeProvider.tsx`'s)
 * module-level-cache + listener-set + `useSyncExternalStore` convention,
 * rather than this codebase's first Zustand `persist` middleware for a
 * single feature. Persisting matters here beyond the usual "nice to
 * have": a refresh should resume an active run rather than quietly
 * dropping it.
 *
 * `chapterIndex` runs 0..3: 0/1/2 is "currently reading that chapter", 3
 * means all three villains are defeated and the victory screen should
 * show. `active` stays true through the victory screen — only `reset()`
 * (called from that screen) clears it.
 *
 * Reworked from an earlier version that (a) fixed the 3 lessons to one
 * curated trilogy startable only from its own chapter 1, and (b) tried to
 * enforce "can't leave" via browser history tricks and a forced redirect.
 * Both turned out to cause more problems than they solved — see
 * conversation. Now: `chapters` is resolved dynamically per-run (any
 * lesson + the next 2 in its course, see `resolveLockInChapters`), and
 * enforcement is deliberately soft — `LockInGuard` just nags on
 * tab-close and offers an always-visible way back, it doesn't trap.
 */

export interface LockInState {
  readonly active: boolean;
  readonly chapters: readonly [LockInLessonRef, LockInLessonRef, LockInLessonRef] | null;
  readonly chapterIndex: 0 | 1 | 2 | 3;
  readonly defeatedVillainIds: readonly string[];
}

export interface LockInChapter {
  readonly lesson: LockInLessonRef;
  readonly villain: LockInVillain;
}

const STORAGE_KEY = "engineering-studio:lock-in";

const INACTIVE_STATE: LockInState = {
  active: false,
  chapters: null,
  chapterIndex: 0,
  defeatedVillainIds: [],
};

const listeners = new Set<() => void>();
let cache: LockInState | null = null;

function isLessonRef(value: unknown): value is LockInLessonRef {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<LockInLessonRef>;
  return (
    (v.courseModule === "foundations" || v.courseModule === "lld") && typeof v.slug === "string"
  );
}

function isValid(value: unknown): value is LockInState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<LockInState>;
  return (
    typeof v.active === "boolean" &&
    (v.chapters === null || (Array.isArray(v.chapters) && v.chapters.length === 3 && v.chapters.every(isLessonRef))) &&
    typeof v.chapterIndex === "number" &&
    v.chapterIndex >= 0 &&
    v.chapterIndex <= 3 &&
    Array.isArray(v.defeatedVillainIds)
  );
}

function read(): LockInState {
  if (cache) return cache;
  if (typeof window === "undefined") return INACTIVE_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    cache = isValid(parsed) ? parsed : INACTIVE_STATE;
  } catch {
    // Corrupt JSON or storage disabled — start fresh rather than throw.
    cache = INACTIVE_STATE;
  }
  return cache;
}

function write(next: LockInState) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / storage disabled — the run just won't survive a
    // refresh, same tradeoff problemProgress.ts already accepts. The
    // in-tab state still works via `cache`.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getLockInState(): LockInState {
  return read();
}

/** Reactive read for components — rerenders on any start/complete/reset call. */
export function useLockInState(): LockInState {
  return useSyncExternalStore(subscribe, read, () => INACTIVE_STATE);
}

/**
 * The lesson + villain for the state's current position, if any is
 * active. `chapterIndex === 3` (victory) has no "current chapter" —
 * callers wanting the just-defeated villain in that case should read
 * `defeatedVillainIds` instead.
 */
export function getActiveChapter(state: LockInState): LockInChapter | undefined {
  if (!state.active || !state.chapters || state.chapterIndex === 3) return undefined;
  return { lesson: state.chapters[state.chapterIndex], villain: VILLAIN_SEQUENCE[state.chapterIndex] };
}

/** Begins a run over the given 3 chapters (see `resolveLockInChapters`). No-op (returns false) if a run is already active. */
export function startLockIn(
  chapters: readonly [LockInLessonRef, LockInLessonRef, LockInLessonRef]
): boolean {
  const current = read();
  if (current.active) return false;
  write({ active: true, chapters, chapterIndex: 0, defeatedVillainIds: [] });
  return true;
}

/**
 * Marks the current chapter's villain defeated and advances. On the third
 * chapter this moves `chapterIndex` to 3 (victory) rather than clearing
 * the run — the victory screen is itself part of the experience, and
 * `resetLockIn()` is the explicit, separate step back to a normal state.
 * No-op (returns false) if no run is active or it's already at victory.
 */
export function completeCurrentChapter(): boolean {
  const current = read();
  const chapter = getActiveChapter(current);
  if (!current.active || !chapter) return false;
  write({
    ...current,
    chapterIndex: (current.chapterIndex + 1) as LockInState["chapterIndex"],
    defeatedVillainIds: [...current.defeatedVillainIds, chapter.villain.id],
  });
  return true;
}

/** The sanctioned way out of an active run — called from the victory screen once `chapterIndex === 3`. */
export function resetLockIn(): void {
  write(INACTIVE_STATE);
}
