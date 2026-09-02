/**
 * Content model for the `/foundations` module — core system-design theory
 * (the internet, DNS, HTTP, databases, caching, queues, ...) that sits
 * alongside `/entities` (the simulated, draggable components) rather than
 * inside it. `/entities` teaches "what this component does in this
 * simulator and how to break it"; `/foundations` teaches the underlying
 * concept itself, simulator-independent — some lessons cross-link to an
 * `/entities` page where this project has a hands-on simulation of the
 * concept (Caching → the Cache entity, Load Balancers → the Load Balancer
 * entity, ...), most don't (DNS, TCP/UDP, and REST have no simulated
 * counterpart at all).
 *
 * Deliberately structured TypeScript, not MDX/markdown — same convention
 * `entityDeepDive.ts` already established for this project's long-form
 * content, and it avoids adding a new content-authoring toolchain for one
 * feature. `LessonBlock` is a discriminated union rather than one rigid
 * shape because lesson content genuinely varies (ASCII protocol diagrams,
 * comparison tables, request/response code samples, "system design
 * insight" callouts, interview Q&A) — forcing all of that into
 * `EntityDeepDive`'s flatter shape would lose real structure. Those block
 * types now live in `src/content/shared/lesson.ts`, shared with `lld/`
 * (the second module to need the exact same shape) — re-exported here so
 * existing imports of `./types` keep working unchanged.
 *
 * One file per lesson under `lessons/`, aggregated by `index.ts` — same
 * layout `src/scenarios/` already uses for one-file-per-topic content.
 */

export type { LessonBlock, LessonSection, LessonExercise } from "@/content/shared/lesson";
import type { LessonSection, LessonExercise } from "@/content/shared/lesson";

export interface FoundationLesson {
  slug: string;
  /** Position in the Foundations sequence — used for prev/next nav and the index page's ordering, not for gating (browsing is always free). */
  number: number;
  title: string;
  /** One-line hook shown on the /foundations index card. */
  tagline: string;
  estimatedMinutes: number;
  sections: LessonSection[];
  summary: string;
  keyTakeaways: string[];
  exercise: LessonExercise;
  /** Slugs of /entities/[slug] pages this lesson's concept has a hands-on simulation of, if any. */
  relatedEntitySlugs?: string[];
  /**
   * Slugs of other `FoundationLesson`s this one conceptually builds on —
   * the edges of the `/foundations` map's forest (`FoundationsMap`,
   * `getLessonStatus`). Separate from `number`/array order (the "read in
   * this sequence" default) and from real access control: a locked node
   * only *dims and hides itself as a link* on the map — visiting
   * `/foundations/[slug]` directly still works regardless, same
   * "browsing is always free" philosophy `number`'s own comment states.
   * Omitted or `[]` means the lesson has no prerequisite (a root/entry
   * point, always `available`).
   */
  prerequisites?: string[];
}
