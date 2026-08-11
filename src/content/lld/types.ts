/**
 * Content model for the `/lld` module — Low-Level Design: OOP fundamentals,
 * SOLID, UML, design patterns, and classic interview case studies (Parking
 * Lot, LRU Cache, Movie Ticket Booking, ...). The third reading room
 * alongside `/foundations` (system-design theory) and `/entities`
 * (simulated infrastructure components) — see `src/app/learn/page.tsx`.
 *
 * Deliberately drafted from general LLD/OOD interview-prep knowledge, not
 * transcribed from a shared source chat the way `/foundations` was — no
 * equivalent source material existed for this module. Framing, examples,
 * and phrasing are original per lesson, not lifted from any single course.
 *
 * Reuses `foundations/`'s exact lesson-block schema (`LessonBlock`,
 * `LessonSection`, `LessonExercise`, now shared from
 * `src/content/shared/lesson.ts`) rather than inventing a parallel one —
 * the content shape (intuition → sections → summary → exercise) is
 * identical, only the subject matter differs.
 *
 * One real difference from `FoundationLesson`: `category` groups lessons
 * into the three phases a low-level design interview actually moves
 * through (fundamentals → patterns → applying them to a full problem) so
 * `/lld`'s index page can present them as three labeled groups instead of
 * one flat, undifferentiated grid — Foundations' 18 lessons are one
 * continuous course sequence with no such internal phase break, so it
 * never needed this.
 */

import type { LessonSection, LessonExercise } from "@/content/shared/lesson";

export type { LessonBlock, LessonSection, LessonExercise } from "@/content/shared/lesson";

export type LLDCategory = "fundamentals" | "patterns" | "case-study";

export interface LLDLesson {
  slug: string;
  /** Position in the LLD sequence — used for prev/next nav and ordering, not gating (browsing is always free, same as Foundations). */
  number: number;
  category: LLDCategory;
  title: string;
  /** One-line hook shown on the /lld index card. */
  tagline: string;
  estimatedMinutes: number;
  sections: LessonSection[];
  summary: string;
  keyTakeaways: string[];
  exercise: LessonExercise;
  /** Slugs of /entities/[slug] pages this lesson's problem has an HLD/simulated counterpart of, if any (e.g. Rate Limiter, Movie Ticket Booking's own scenario). */
  relatedEntitySlugs?: string[];
}

export const LLD_CATEGORY_LABEL: Record<LLDCategory, string> = {
  fundamentals: "Fundamentals",
  patterns: "Design Patterns",
  "case-study": "Case Studies",
};
