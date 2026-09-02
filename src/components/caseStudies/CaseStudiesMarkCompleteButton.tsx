"use client";

import { MarkCompleteButton } from "@/components/maps/MarkCompleteButton";
import { markCaseStudyComplete, markCaseStudyIncomplete, useCaseStudyProgress } from "@/lib/caseStudyProgress";

/** `/case-studies`' page completion toggle — see `components/maps/MarkCompleteButton`'s own doc comment for why this exists (feeds `CaseStudiesMap`'s completed/green node styling; nothing is gated on it). */
export function CaseStudiesMarkCompleteButton({ slug }: { slug: string }) {
  const completedSlugs = useCaseStudyProgress();
  const isComplete = completedSlugs.includes(slug);
  return (
    <MarkCompleteButton
      isComplete={isComplete}
      onMarkComplete={() => markCaseStudyComplete(slug)}
      onMarkIncomplete={() => markCaseStudyIncomplete(slug)}
    />
  );
}
