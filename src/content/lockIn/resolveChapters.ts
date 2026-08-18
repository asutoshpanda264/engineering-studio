import { FOUNDATION_LESSONS } from "@/content/foundations";
import { LLD_LESSONS } from "@/content/lld";
import type { LockInLessonRef } from "./villains";

/**
 * Given the lesson a student is currently reading, resolves the 3 lessons
 * a run starting *here* would cover — this lesson, then the next two in
 * that same course's own sequence (`FOUNDATION_LESSONS`/`LLD_LESSONS`
 * array order, the same source of truth the prev/next nav already reads).
 * Undefined if the lesson doesn't exist, or if there aren't 2 more
 * lessons after it — lock-in can't be offered from the last or
 * second-to-last lesson of a course, since there'd be nothing to fill
 * chapter 2 or 3.
 */
export function resolveLockInChapters(
  courseModule: LockInLessonRef["courseModule"],
  slug: string
): readonly [LockInLessonRef, LockInLessonRef, LockInLessonRef] | undefined {
  const lessons = courseModule === "foundations" ? FOUNDATION_LESSONS : LLD_LESSONS;
  const index = lessons.findIndex((lesson) => lesson.slug === slug);
  if (index === -1 || index + 2 >= lessons.length) return undefined;

  return [
    { courseModule, slug: lessons[index].slug },
    { courseModule, slug: lessons[index + 1].slug },
    { courseModule, slug: lessons[index + 2].slug },
  ] as [LockInLessonRef, LockInLessonRef, LockInLessonRef];
}
