/**
 * Content model for the `/case-studies` module — Pillar E of
 * `docs/Expansion_TODO.md`: reference-design case studies that
 * synthesize concepts already taught elsewhere (`/agentic`,
 * `/foundations`, `/entities`) into complete, worked architectures. The
 * fifth reading room, alongside `/foundations`, `/lld`, `/entities`, and
 * `/agentic` — see `src/app/learn/page.tsx`.
 *
 * Unlike those four, this module adds no new simulation domain — a given
 * entry's "build → simulate → break → learn" claim is satisfied by
 * deep-linking into an *existing* Workshop scenario (`buildIt`) or, for a
 * protocol/interface design with no request traffic to run (MCP Design),
 * honestly staying a diagram + walkthrough. Reuses `LessonSection`/
 * `LessonExercise`/`LessonBlock` from `src/content/shared/lesson.ts`
 * exactly as `lld/` and `agentic/` do — the content shape (intuition →
 * sections → summary → exercise) is identical, only the subject matter
 * and the two fields below differ.
 *
 * `category` mirrors `lld/`'s reason for existing (Phase 1 is one
 * grouping, Phase 2 adds a second) rather than `agentic/`'s five —
 * `docs/Expansion_TODO.md` names exactly two phases: the four agentic
 * case studies (RAG System, AI Search, MCP Design, Trip-Planning Agent)
 * now, and classic HLD case studies (Twitter, Netflix, Hotel Management,
 * a distributed Parking Lot) deferred.
 */

import type { LessonSection, LessonExercise } from "@/content/shared/lesson";

export type { LessonBlock, LessonSection, LessonExercise } from "@/content/shared/lesson";

export type CaseStudyCategory = "agentic" | "classic-hld";

/** A cross-link back to the specific lesson section a design decision leans on, rather than re-teaching that concept inline. */
export interface CaseStudyCrossLink {
  label: string;
  href: string;
}

/**
 * The "Build it" CTA into an existing, real Workshop scenario —
 * deliberately just a scenario id, not a duplicated topology: the
 * scenario file already is the buildable, simulatable version of this
 * case study's architecture. Absent on entries that are a protocol/
 * interface design rather than a request-traffic system (MCP Design).
 */
export interface CaseStudyBuildIt {
  scenarioId: string;
  /** One line on what "Build it" actually exercises here, e.g. which lever the linked scenario is testing. */
  note: string;
}

export interface CaseStudy {
  slug: string;
  /** Position in the case-study sequence — used for prev/next nav and ordering, not gating (browsing is always free, same as every other reading room). */
  number: number;
  category: CaseStudyCategory;
  title: string;
  /** One-line hook shown on the /case-studies index card. */
  tagline: string;
  estimatedMinutes: number;
  sections: LessonSection[];
  summary: string;
  keyTakeaways: string[];
  exercise: LessonExercise;
  /** Slugs of `/entities/[slug]` pages this design leans on, if any — same optional, graceful-no-match shape `lld/`'s and `agentic/`'s `relatedEntitySlugs` already use. */
  relatedEntitySlugs?: string[];
  crossLinks?: CaseStudyCrossLink[];
  buildIt?: CaseStudyBuildIt;
}

export const CASE_STUDY_CATEGORY_LABEL: Record<CaseStudyCategory, string> = {
  agentic: "Agentic Systems",
  "classic-hld": "Classic HLD",
};
