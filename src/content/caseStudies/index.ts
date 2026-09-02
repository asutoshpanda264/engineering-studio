import type { CaseStudy } from "./types";
import { RAG_SYSTEM } from "./lessons/01-rag-system";

export type { CaseStudy, CaseStudyCategory, CaseStudyCrossLink, CaseStudyBuildIt, LessonBlock, LessonExercise, LessonSection } from "./types";
export { CASE_STUDY_CATEGORY_LABEL } from "./types";

/**
 * Every case study, in sequence. `number` on each entry is the source of
 * truth for ordering — this array's own order must match it (same
 * discipline `foundations/index.ts`, `lld/index.ts`, and
 * `agentic/index.ts` already established).
 *
 * Phase 1 of `docs/Expansion_TODO.md`'s Pillar E: the four agentic case
 * studies, built one at a time (RAG System landed; AI Search, MCP
 * Design, Trip-Planning Agent to follow). Phase 2 (classic HLD: Twitter,
 * Netflix, Hotel Management, distributed Parking Lot) is deferred and
 * scoped but not started — see the TODO doc.
 */
export const CASE_STUDIES: CaseStudy[] = [RAG_SYSTEM];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((entry) => entry.slug === slug);
}
