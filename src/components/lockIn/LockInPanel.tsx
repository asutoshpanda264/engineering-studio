"use client";

import { villainForChapter, type LockInLessonRef } from "@/content/lockIn/villains";
import { getActiveChapter, useLockInState } from "@/lib/lockInMode";
import { LockInChapterBanner } from "@/components/lockIn/LockInChapterBanner";
import { LockInEntryPrompt } from "@/components/lockIn/LockInEntryPrompt";

/**
 * Mounted on every `/foundations/[slug]` and `/lld/[slug]` page, right
 * after the hero. Two independent jobs:
 *
 * - If an active run's current chapter is *this* lesson, show the
 *   banner — including a recap of whichever villain was just defeated to
 *   arrive here (`precedingVillain`, chapters 2/3 only).
 * - Always mount `LockInEntryPrompt`, which watches for this lesson's
 *   theme toggle landing on night-ops and offers to start a run from
 *   here (it renders nothing itself unless that happens).
 *
 * The "Defeat" action lives separately, further down the page — see
 * `LockInChapterAction`, mounted next to Summary/Exercise.
 */
export function LockInPanel({ courseModule, slug }: LockInLessonRef) {
  const state = useLockInState();

  const activeChapter = getActiveChapter(state);
  const isActiveChapter =
    activeChapter &&
    activeChapter.lesson.courseModule === courseModule &&
    activeChapter.lesson.slug === slug;

  return (
    <>
      {isActiveChapter && (
        <LockInChapterBanner
          chapter={activeChapter}
          chapterIndex={state.chapterIndex as 0 | 1 | 2}
          precedingVillain={state.chapterIndex > 0 ? villainForChapter((state.chapterIndex - 1) as 0 | 1 | 2) : undefined}
        />
      )}
      <LockInEntryPrompt courseModule={courseModule} slug={slug} />
    </>
  );
}
