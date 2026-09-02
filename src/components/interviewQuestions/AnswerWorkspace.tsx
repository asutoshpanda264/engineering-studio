"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { setAnswerComplete, useAnswerProgress } from "@/lib/interviewAnswerProgress";

/**
 * Progress tracking for a question — not an answer surface. There's no
 * grader and nowhere useful for free text to go, so this is deliberately
 * just a done/not-done toggle: work the question out on paper or a
 * whiteboard, then mark it here so `/interview-questions`'s "X / Y
 * answered" count and status badge reflect it.
 */
export function AnswerWorkspace({ questionId }: { questionId: string }) {
  const progress = useAnswerProgress();
  const markedComplete = progress[questionId]?.markedComplete ?? false;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-panel p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text">Track your progress</h2>
        <p className="text-xs text-text-subtle">
          Work through this one on paper or a whiteboard, then mark it done.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={markedComplete ? "success" : "neutral"}>
          {markedComplete ? "Answered" : "Unattempted"}
        </Badge>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAnswerComplete(questionId, !markedComplete)}
        >
          {markedComplete ? (
            <>
              <CheckCircle2 className="size-3.5" aria-hidden />
              Marked answered
            </>
          ) : (
            <>
              <Circle className="size-3.5" aria-hidden />
              Mark as answered
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
