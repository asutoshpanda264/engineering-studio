"use client";

import { MarkCompleteButton } from "@/components/maps/MarkCompleteButton";
import { markAgenticLessonComplete, markAgenticLessonIncomplete, useAgenticProgress } from "@/lib/agenticProgress";

/** `/agentic`'s lesson-page completion toggle — see `components/maps/MarkCompleteButton`'s own doc comment for why this exists (feeds `AgenticMap`'s completed/green node styling; nothing is gated on it). */
export function AgenticMarkCompleteButton({ slug }: { slug: string }) {
  const completedSlugs = useAgenticProgress();
  const isComplete = completedSlugs.includes(slug);
  return (
    <MarkCompleteButton
      isComplete={isComplete}
      onMarkComplete={() => markAgenticLessonComplete(slug)}
      onMarkIncomplete={() => markAgenticLessonIncomplete(slug)}
    />
  );
}
