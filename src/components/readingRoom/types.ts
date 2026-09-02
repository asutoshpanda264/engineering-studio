import type { LucideIcon } from "lucide-react";

/**
 * The shape `ReadingRoomJourney`/`ReadingRoomAtlas` need from a content
 * item — a strict subset of `FoundationLesson`/`LLDLesson`/`AgenticLesson`/
 * `CaseStudy`, which already all carry these five fields identically (see
 * each content module's own `types.ts` — they deliberately share
 * `LessonSection`/`LessonExercise` already, this is the same convergence
 * one level up). Callers pass their real lesson/case-study objects
 * straight through; TypeScript only cares that these fields exist.
 */
export interface ReadingRoomItem {
  slug: string;
  number: number;
  title: string;
  tagline: string;
  estimatedMinutes: number;
}

/**
 * One "track" — Foundations' own term for a labeled phase of a reading
 * room's content, kept here as the generic name rather than switching to
 * each content module's own word for the same idea (`category` in LLD's
 * and Agentic's types) — the label a reader actually sees is "Track NN"
 * in both view modes, and that's the identity worth keeping consistent
 * across every reading room this propagates to, not the internal field
 * name each content module happens to use.
 *
 * `icon` is one Lucide icon per group, not per lesson — `LessonGlyph`'s
 * 24 hand-drawn line-art SVGs are a Foundations-only investment; every
 * other reading room reuses a plain icon instead, repeated across every
 * card in that group (see `ReadingRoomAtlas`'s own doc comment for where
 * this same icon shows up a second time, as a zone watermark).
 */
export interface ReadingRoomGroup<T extends ReadingRoomItem = ReadingRoomItem> {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: T[];
}
