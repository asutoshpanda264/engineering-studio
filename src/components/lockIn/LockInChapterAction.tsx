"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BatMark } from "@/components/theme/icons/BatMark";
import { lessonHref, type LockInLessonRef } from "@/content/lockIn/villains";
import { completeCurrentChapter, getActiveChapter, getLockInState, useLockInState } from "@/lib/lockInMode";

/**
 * The one sanctioned way to advance a lock-in run — mounted near
 * Summary/Exercise on a lesson page, in place of the prev/next nav
 * `HideWhileLockedIn` suppresses there. Only renders when this lesson
 * *is* the active run's current chapter (same match `LockInChapterBanner`
 * up top uses).
 *
 * `completeCurrentChapter()` and the routing that follows happen in one
 * click, not a two-step "defeat, then a separate continue button" — a
 * two-step version would leave a real dead end on refresh between steps:
 * once the chapter is marked complete, `LockInPanel` on *this* page no
 * longer matches the (now-advanced) active chapter, so nothing here would
 * still be showing a way forward. The defeated villain's `defeatLine`
 * instead surfaces as a recap on whatever page this routes to next (see
 * `LockInChapterBanner`'s `precedingVillain` prop, or the victory screen
 * for chapter 3).
 */
export function LockInChapterAction({ courseModule, slug }: LockInLessonRef) {
  const router = useRouter();
  const state = useLockInState();
  const chapter = getActiveChapter(state);

  if (!chapter || chapter.lesson.courseModule !== courseModule || chapter.lesson.slug !== slug) {
    return null;
  }

  const handleDefeat = () => {
    if (!completeCurrentChapter()) return;
    const next = getLockInState();
    const nextChapter = getActiveChapter(next);
    router.push(nextChapter ? lessonHref(nextChapter.lesson) : "/batman-mode/victory");
  };

  return (
    <div className="border border-signal/40 bg-bg-panel p-6">
      <div className="mb-4 flex items-center gap-2">
        <BatMark className="size-4 text-signal" aria-hidden />
        <Badge variant="primary">Chapter {state.chapterIndex + 1} Complete?</Badge>
      </div>
      <p className="text-sm leading-relaxed text-text-muted">
        Worked through everything above? Confirm it and {chapter.villain.name} falls —
        {state.chapterIndex < 2
          ? " straight on to the next chapter."
          : " straight to the end of this trilogy."}
      </p>
      <Button type="button" variant="primary" className="mt-5" onClick={handleDefeat}>
        Defeat {chapter.villain.name}
      </Button>
    </div>
  );
}
