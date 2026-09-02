"use client";

import { MarkCompleteButton } from "@/components/maps/MarkCompleteButton";
import { markLLDLessonComplete, markLLDLessonIncomplete, useLLDProgress } from "@/lib/lldProgress";

/** `/lld`'s lesson-page completion toggle — see `components/maps/MarkCompleteButton`'s own doc comment for why this exists (feeds `LLDMap`'s completed/green node styling; nothing is gated on it). */
export function LLDMarkCompleteButton({ slug }: { slug: string }) {
  const completedSlugs = useLLDProgress();
  const isComplete = completedSlugs.includes(slug);
  return (
    <MarkCompleteButton
      isComplete={isComplete}
      onMarkComplete={() => markLLDLessonComplete(slug)}
      onMarkIncomplete={() => markLLDLessonIncomplete(slug)}
    />
  );
}
