/**
 * Content model for the `/agentic` module — Agentic AI system design:
 * the six canonical patterns (Reflection, Tool Use, Planning, Multi-Agent
 * Collaboration, Orchestrator-Worker, Evaluator-Optimizer), MCP/A2A,
 * RAG's three architectures, OpenTelemetry GenAI tracing, SLM/LLM
 * inference economics, and the documented agent failure taxonomy. The
 * fourth reading room alongside `/foundations`, `/lld`, and `/entities` —
 * see `src/app/learn/page.tsx`.
 *
 * Grounded in `docs/Agentic_AI.md`'s Part 1 research summary, not invented
 * — each lesson traces back to a specific numbered section there. Reuses
 * `LessonSection`/`LessonExercise`/`LessonBlock` from
 * `src/content/shared/lesson.ts` exactly as `lld/` does, rather than
 * inventing a parallel schema — the content shape (intuition → sections →
 * summary → exercise) is identical across all three reading rooms, only
 * the subject matter differs.
 *
 * `category` has five values, not `lld`'s three — `docs/Agentic_AI.md`
 * Part 3 groups this track's content into fundamentals / patterns /
 * protocols-and-infra / inference-and-serving / production because
 * protocols and inference mechanics are each a real, separate body of
 * knowledge here (unlike LLD, where "case studies" is the only category
 * that isn't itself a taxonomy of theory).
 */

import type { LessonSection, LessonExercise } from "@/content/shared/lesson";

export type { LessonBlock, LessonSection, LessonExercise } from "@/content/shared/lesson";

export type AgenticCategory =
  | "fundamentals"
  | "patterns"
  | "protocols-and-infra"
  | "inference-and-serving"
  | "production";

export interface AgenticLesson {
  slug: string;
  /** Position in the Agentic AI sequence — used for prev/next nav and ordering, not gating (browsing is always free, same as Foundations/LLD). */
  number: number;
  category: AgenticCategory;
  title: string;
  /** One-line hook shown on the /agentic index card. */
  tagline: string;
  estimatedMinutes: number;
  sections: LessonSection[];
  summary: string;
  keyTakeaways: string[];
  exercise: LessonExercise;
  /**
   * Slugs of `/entities/[slug]` pages this lesson's concept has a
   * hands-on canvas counterpart of, if any (`llm_call`, `tool_call`,
   * `agent_orchestrator`, ... once Phase 1+ lands them per
   * `docs/Agentic_AI.md` Part 5). Empty until then — same optional,
   * graceful-no-match shape `lld/`'s `relatedEntitySlugs` already uses.
   */
  relatedEntitySlugs?: string[];
}

export const AGENTIC_CATEGORY_LABEL: Record<AgenticCategory, string> = {
  fundamentals: "Fundamentals",
  patterns: "Patterns",
  "protocols-and-infra": "Protocols & Infra",
  "inference-and-serving": "Inference & Serving",
  production: "Production",
};
