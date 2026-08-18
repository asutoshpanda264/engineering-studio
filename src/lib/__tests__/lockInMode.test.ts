import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeCurrentChapter,
  getActiveChapter,
  getLockInState,
  resetLockIn,
  startLockIn,
} from "../lockInMode";
import type { LockInLessonRef } from "@/content/lockIn/villains";

const CHAPTERS: readonly [LockInLessonRef, LockInLessonRef, LockInLessonRef] = [
  { courseModule: "foundations", slug: "lesson-a" },
  { courseModule: "foundations", slug: "lesson-b" },
  { courseModule: "foundations", slug: "lesson-c" },
];

describe("lockInMode", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLockIn();
  });

  it("starts inactive with no chapters", () => {
    const state = getLockInState();
    expect(state.active).toBe(false);
    expect(state.chapters).toBeNull();
    expect(state.chapterIndex).toBe(0);
    expect(state.defeatedVillainIds).toEqual([]);
  });

  it("startLockIn activates chapter 0 over the given chapters", () => {
    expect(startLockIn(CHAPTERS)).toBe(true);
    const state = getLockInState();
    expect(state.active).toBe(true);
    expect(state.chapters).toEqual(CHAPTERS);
    expect(state.chapterIndex).toBe(0);
    expect(getActiveChapter(state)?.lesson).toEqual(CHAPTERS[0]);
    expect(getActiveChapter(state)?.villain.id).toBe("ras-al-ghul");
  });

  it("startLockIn refuses to start a second run while one is active", () => {
    startLockIn(CHAPTERS);
    expect(startLockIn(CHAPTERS)).toBe(false);
  });

  it("completeCurrentChapter walks through all three villains, then reaches victory", () => {
    startLockIn(CHAPTERS);

    expect(completeCurrentChapter()).toBe(true);
    let state = getLockInState();
    expect(state.chapterIndex).toBe(1);
    expect(state.defeatedVillainIds).toEqual(["ras-al-ghul"]);
    expect(getActiveChapter(state)?.lesson).toEqual(CHAPTERS[1]);
    expect(getActiveChapter(state)?.villain.id).toBe("joker");

    expect(completeCurrentChapter()).toBe(true);
    state = getLockInState();
    expect(state.chapterIndex).toBe(2);
    expect(state.defeatedVillainIds).toEqual(["ras-al-ghul", "joker"]);
    expect(getActiveChapter(state)?.lesson).toEqual(CHAPTERS[2]);
    expect(getActiveChapter(state)?.villain.id).toBe("bane");

    expect(completeCurrentChapter()).toBe(true);
    state = getLockInState();
    expect(state.chapterIndex).toBe(3);
    expect(state.defeatedVillainIds).toEqual(["ras-al-ghul", "joker", "bane"]);
    // Victory: no "current" chapter left, but the run is still active
    // (only resetLockIn() clears it) — see module docblock.
    expect(getActiveChapter(state)).toBeUndefined();
    expect(state.active).toBe(true);
  });

  it("completeCurrentChapter is a no-op once at victory", () => {
    startLockIn(CHAPTERS);
    completeCurrentChapter();
    completeCurrentChapter();
    completeCurrentChapter();
    expect(completeCurrentChapter()).toBe(false);
    expect(getLockInState().defeatedVillainIds).toHaveLength(3);
  });

  it("completeCurrentChapter is a no-op when no run is active", () => {
    expect(completeCurrentChapter()).toBe(false);
  });

  it("resetLockIn returns to the inactive state from any point", () => {
    startLockIn(CHAPTERS);
    completeCurrentChapter();
    resetLockIn();
    expect(getLockInState()).toEqual({
      active: false,
      chapters: null,
      chapterIndex: 0,
      defeatedVillainIds: [],
    });
  });

  it("persists across the module's read cache being dropped (simulates a reload)", async () => {
    startLockIn(CHAPTERS);
    completeCurrentChapter();

    // Force a fresh module instance (new top-level `cache`, still the same
    // localStorage) the way a real page reload would, and confirm state
    // resumes from localStorage alone rather than the in-memory cache.
    vi.resetModules();
    const fresh = await import("../lockInMode");
    const state = fresh.getLockInState();
    expect(state.active).toBe(true);
    expect(state.chapterIndex).toBe(1);
    expect(state.defeatedVillainIds).toEqual(["ras-al-ghul"]);
  });
});
