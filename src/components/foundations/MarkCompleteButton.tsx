"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { markLessonComplete, markLessonIncomplete, useFoundationsProgress } from "@/lib/foundationsProgress";

/**
 * The sanctioned way to advance the `/foundations` forest map
 * (`FoundationsMap`) — no scroll-position or "reached the bottom" heuristic
 * exists anywhere in this codebase (checked: `EntityTableOfContents` is
 * the only scroll-tracking code, and it's a heading-highlight, not a
 * completion signal), so this is a deliberate click, same "confirm it
 * yourself" pattern `LockInChapterAction` already uses for Batman Mode's
 * own completion action. Sits next to that action rather than replacing
 * it — during an active lock-in run, `LockInChapterAction` is already the
 * one sanctioned way to advance (this button hides there via
 * `HideWhileLockedIn` at the call site), and `LockInChapterAction.advance()`
 * itself calls `markLessonComplete` so a Batman Mode run keeps the map
 * accurate too.
 */
export function MarkCompleteButton({ slug }: { slug: string }) {
  const completedSlugs = useFoundationsProgress();
  const isComplete = completedSlugs.includes(slug);

  return (
    <div className="flex items-center justify-between bg-bg-panel p-4">
      <p className="text-sm text-text-muted">
        {isComplete
          ? "Marked complete — its unlocked lessons are open on the map."
          : "Done with this one? Mark it complete to open what comes next on the map."}
      </p>
      <Button
        type="button"
        variant={isComplete ? "secondary" : "primary"}
        size="sm"
        icon={<Check className="size-3.5" aria-hidden />}
        onClick={() => (isComplete ? markLessonIncomplete(slug) : markLessonComplete(slug))}
      >
        {isComplete ? "Completed" : "Mark complete"}
      </Button>
    </div>
  );
}
