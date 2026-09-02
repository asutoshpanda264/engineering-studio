"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BatMark } from "@/components/theme/icons/BatMark";
import { lessonHref, type LockInLessonRef } from "@/content/lockIn/villains";
import { completeCurrentChapter, getActiveChapter, getLockInState, useLockInState } from "@/lib/lockInMode";
import { buildInterrogationQuestion, type InterrogationQuestion } from "@/lib/villainInterrogation";
import { markLessonComplete } from "@/lib/foundationsProgress";
import { markLLDLessonComplete } from "@/lib/lldProgress";

/**
 * The one sanctioned way to advance a lock-in run — mounted near
 * Summary/Exercise on a lesson page, in place of the prev/next nav
 * `HideWhileLockedIn` suppresses there. Only renders when this lesson
 * *is* the active run's current chapter (same match `LockInChapterBanner`
 * up top uses).
 *
 * "Defeat {villain}" no longer advances on trust alone — clicking it
 * opens a one-question interrogation built from the lesson's own
 * `keyTakeaways` (see villainInterrogation.ts): pick the one option that's
 * actually true about what was just read, out of two decoys pulled from
 * unrelated lessons. Answer wrong and the villain just taunts again, no
 * limit on attempts — same "soft enforcement, never trap the user"
 * contract lockInMode.ts's own docblock commits to, just extended one
 * step further than "did you click the button." Falls back to the old
 * trust-based advance when a question can't be built at all (a lesson
 * with no `keyTakeaways` yet) rather than blocking progress on missing
 * content.
 *
 * `completeCurrentChapter()` and the routing that follows still happen in
 * one step once the question's answered — a separate "continue" click
 * after that would leave a real dead end on refresh: once the chapter is
 * marked complete, `LockInPanel` on *this* page no longer matches the
 * (now-advanced) active chapter, so nothing here would still be showing a
 * way forward. The defeated villain's `defeatLine` instead surfaces as a
 * recap on whatever page this routes to next (see `LockInChapterBanner`'s
 * `precedingVillain` prop, or the victory screen for chapter 3).
 */
export function LockInChapterAction({ courseModule, slug }: LockInLessonRef) {
  const router = useRouter();
  const state = useLockInState();
  const chapter = getActiveChapter(state);
  const [question, setQuestion] = useState<InterrogationQuestion | null>(null);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);

  if (!chapter || chapter.lesson.courseModule !== courseModule || chapter.lesson.slug !== slug) {
    return null;
  }

  const advance = () => {
    if (!completeCurrentChapter()) return;
    // Keep that module's own arcade map progress in sync — Batman Mode
    // has its own villain-defeat state, but a chapter finished this way is
    // still a lesson genuinely read, so the map should treat it like any
    // other completion. `agentic` has no lock-in chapters yet
    // (`LockInLessonRef.courseModule` is only `"foundations" | "lld"`), so
    // there's no third case to add here.
    if (chapter.lesson.courseModule === "foundations") {
      markLessonComplete(chapter.lesson.slug);
    } else {
      markLLDLessonComplete(chapter.lesson.slug);
    }
    const next = getLockInState();
    const nextChapter = getActiveChapter(next);
    router.push(nextChapter ? lessonHref(nextChapter.lesson) : "/batman-mode/victory");
  };

  const handleDefeatClick = () => {
    const built = buildInterrogationQuestion(chapter.lesson);
    if (!built) {
      advance();
      return;
    }
    setWrongIndex(null);
    setQuestion(built);
  };

  const handleAnswer = (index: number) => {
    if (!question) return;
    if (index === question.correctIndex) {
      advance();
      return;
    }
    setWrongIndex(index);
  };

  if (question) {
    return (
      <div className="border border-signal/40 bg-bg-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <BatMark className="size-4 text-signal" aria-hidden />
          <Badge variant="primary">{chapter.villain.name} interrogates you</Badge>
        </div>
        <p className="text-sm italic leading-relaxed text-text-muted">&ldquo;{chapter.villain.taunt}&rdquo;</p>
        <p className="mt-4 text-sm font-medium text-text">{question.prompt}</p>
        <div className="mt-3 flex flex-col gap-2">
          {question.options.map((option, index) => {
            const isWrong = wrongIndex === index;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleAnswer(index)}
                className={`border p-3 text-left text-sm transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel ${
                  isWrong
                    ? "border-status-critical/60 bg-status-critical/10 text-status-critical"
                    : "border-border text-text hover:border-signal hover:text-signal"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {wrongIndex !== null && (
          <p className="mt-3 text-xs text-status-critical">
            Not it. {chapter.villain.name} isn&apos;t convinced yet — try again.
          </p>
        )}
      </div>
    );
  }

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
      <Button type="button" variant="primary" className="mt-5" onClick={handleDefeatClick}>
        Defeat {chapter.villain.name}
      </Button>
    </div>
  );
}
