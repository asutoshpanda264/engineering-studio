import type { AgenticLesson } from "./types";
import { WHAT_IS_AN_AGENT } from "./lessons/01-what-is-an-agent";
import { LLM_CALL_AS_A_PRIMITIVE } from "./lessons/02-llm-call-as-a-primitive";
import { REACT_LOOP } from "./lessons/03-react-loop";
import { TOOL_USE_AND_THE_TOOL_CALL_BOUNDARY } from "./lessons/04-tool-use-and-the-tool-call-boundary";
import { MCP_AND_A2A_OVERVIEW } from "./lessons/05-mcp-and-a2a-overview";
import { TOOL_USE } from "./lessons/06-tool-use";
import { PLANNING } from "./lessons/07-planning";
import { ORCHESTRATOR_WORKER } from "./lessons/08-orchestrator-worker";
import { MULTI_AGENT_COLLABORATION } from "./lessons/09-multi-agent-collaboration";
import { REFLECTION } from "./lessons/10-reflection";
import { EVALUATOR_OPTIMIZER } from "./lessons/11-evaluator-optimizer";
import { RAG_ARCHITECTURES } from "./lessons/12-rag-architectures";
import { OPENTELEMETRY_GENAI_TRACING } from "./lessons/13-opentelemetry-genai-tracing";
import { SLMS_AND_THE_CASCADE_PATTERN } from "./lessons/14-slms-and-the-cascade-pattern";
import { QUANTIZATION_TRADEOFFS } from "./lessons/15-quantization-tradeoffs";
import { INFERENCE_SERVING_MECHANICS } from "./lessons/16-inference-serving-mechanics";
import { CACHING_AND_COST_ECONOMICS } from "./lessons/17-caching-and-cost-economics";
import { THE_AGENT_FAILURE_TAXONOMY } from "./lessons/18-the-agent-failure-taxonomy";
import { GUARDRAILS_AS_ARCHITECTURE } from "./lessons/19-guardrails-as-architecture";
import { EVALUATION_AND_RELIABILITY_ECONOMICS } from "./lessons/20-evaluation-and-reliability-economics";

export type { AgenticLesson, AgenticCategory, LessonBlock, LessonExercise, LessonSection } from "./types";
export { AGENTIC_CATEGORY_LABEL } from "./types";

/**
 * Every Agentic AI lesson, in course order. `number` on each lesson is the
 * source of truth for ordering — this array's own order must match it
 * (the validator test checks this), same discipline `foundations/index.ts`
 * and `lld/index.ts` already established.
 *
 * Phase 0: four fundamentals/protocols-and-infra lessons, content only —
 * originally three fundamentals lessons plus MCP/A2A, with ReAct and Tool
 * Use combined into one lesson (user feedback: Tool Use read as folded
 * into ReAct rather than being its own thing). Split into two dedicated
 * lessons (`03-react-loop.ts`, `04-tool-use-and-the-tool-call-boundary.ts`)
 * — see either file's own docblock — pushing MCP/A2A to lesson 5 and every
 * lesson after it up by one. No material was cut, only re-split and
 * renumbered.
 * Phase 2 added the six canonical "patterns" lessons (docs/Agentic_AI.md
 * §2.1), each paired with a build-this-topology challenge. Reflection and
 * Evaluator-Optimizer initially shipped with an honest "not buildable
 * yet" framing instead — they need `guardrail_validator`, which Phase 2
 * deliberately didn't approximate — and were rewritten with real
 * build-it challenges once Phase 3 landed that primitive (see those two
 * lessons' own docblocks).
 * Pillar A's sealing pass added the remaining protocols-and-infra
 * lessons (RAG's three architectures + adaptive routing, OpenTelemetry
 * GenAI tracing) plus the full inference-and-serving and production
 * categories (12-20) — every one of these was written *after* the
 * mechanics it describes had already landed (ModelRouter, LlmCall's
 * tier/quantization/deploymentTarget dials, Cache's semantic mode,
 * the 10-item failure taxonomy's config knobs, guardrail_validator/
 * human_in_loop_gate, and reliabilityScore.ts's pass^k score), so every
 * number and config name quoted in them is real, not aspirational. This
 * closes out Part 3 of docs/Agentic_AI.md — Pillar A's content track is
 * now complete across all five categories.
 */
export const AGENTIC_LESSONS: AgenticLesson[] = [
  WHAT_IS_AN_AGENT,
  LLM_CALL_AS_A_PRIMITIVE,
  REACT_LOOP,
  TOOL_USE_AND_THE_TOOL_CALL_BOUNDARY,
  MCP_AND_A2A_OVERVIEW,
  TOOL_USE,
  PLANNING,
  ORCHESTRATOR_WORKER,
  MULTI_AGENT_COLLABORATION,
  REFLECTION,
  EVALUATOR_OPTIMIZER,
  RAG_ARCHITECTURES,
  OPENTELEMETRY_GENAI_TRACING,
  SLMS_AND_THE_CASCADE_PATTERN,
  QUANTIZATION_TRADEOFFS,
  INFERENCE_SERVING_MECHANICS,
  CACHING_AND_COST_ECONOMICS,
  THE_AGENT_FAILURE_TAXONOMY,
  GUARDRAILS_AS_ARCHITECTURE,
  EVALUATION_AND_RELIABILITY_ECONOMICS,
];

export function getAgenticLesson(slug: string): AgenticLesson | undefined {
  return AGENTIC_LESSONS.find((lesson) => lesson.slug === slug);
}
