import type { AgenticLesson } from "../types";

/**
 * First of the six "patterns" lessons — each pairs one canonical pattern
 * from `docs/Agentic_AI.md` §2.1 with a real build-this-topology challenge
 * on canvas, per Part 3's content track and Phase 2's own acceptance
 * criterion ("all six patterns are buildable and demonstrably distinct in
 * their event traces"). Tool Use needs only Phase 1's primitives
 * (llm_call, tool_call) — no orchestrator required, the simplest pattern
 * on purpose, and the one fundamentals lessons 3-4 (ReAct: The Reasoning
 * Loop, and Tool Use & The Tool-Call Boundary) already introduced
 * conceptually. This lesson is the hands-on follow-through.
 */
export const TOOL_USE: AgenticLesson = {
  slug: "tool-use-pattern",
  number: 6,
  category: "patterns",
  title: "Pattern: Tool Use",
  tagline: "The simplest of the six patterns — llm_call routes directly to tool_call. Build it, run it, watch the trace.",
  estimatedMinutes: 15,
  sections: [
    {
      id: "the-pattern",
      heading: "The pattern",
      blocks: [
        {
          kind: "paragraph",
          text: "Tool Use is the pattern every other one in this track builds on top of: an llm_call decides it needs to act rather than answer from text alone, and routes directly to a tool_call. No orchestrator, no loop, no synthesis step — one hop out, one hop back.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "tool-use-client", label: "Client", col: 0, row: 0, entityType: "client" },
            { id: "tool-use-llm", label: "LLM Call", col: 1, row: 0, entityType: "llm_call" },
            { id: "tool-use-tool", label: "Tool Call", col: 2, row: 0, entityType: "tool_call" },
          ],
          edges: [
            { from: "tool-use-client", to: "tool-use-llm" },
            { from: "tool-use-llm", to: "tool-use-tool" },
          ],
        },
      ],
    },
    {
      id: "build-it",
      heading: "Build it",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            "Drag a Client, an LLM Call, and a Tool Call onto the canvas from the Agentic AI section of the Component Library.",
            "Wire Client → LLM Call → Tool Call, in that order.",
            "Run it. In the trace/event log, find the two PROCESSING_STARTED events for this pattern — one on the LLM Call, one on the Tool Call, in that order, at different timestamps.",
          ],
        },
        {
          kind: "insight",
          text: "That staggered timing — LLM Call finishes before Tool Call even starts — is the whole shape of Tool Use made visible. Compare it later against Orchestrator-Worker's fan-out, where multiple downstream targets start at the identical timestamp instead.",
        },
      ],
    },
    {
      id: "break-it",
      heading: "Break it",
      blocks: [
        {
          kind: "paragraph",
          text: "Raise the Tool Call's Failure Rate to see the failure propagate all the way back to the client as a REQUEST_FAILED with reason tool_call_failed. Raise its Schema Failure Rate instead and confirm the reason is schema_violation — two structurally identical-looking failures with different causes, distinguishable only by reading the reason.",
        },
      ],
    },
  ],
  summary:
    "Tool Use is llm_call → tool_call, directly — no orchestration needed. Building it is the fastest way to see this track's core claim in action: the same admit-queue-reject shape every other entity in this simulator uses, applied to a model call and an external action, with a real trace showing exactly when each one ran.",
  keyTakeaways: [
    "Tool Use requires only Phase 1's two primitives — llm_call and tool_call — no orchestrator.",
    "The trace shows the two PROCESSING_STARTED events staggered in time, not simultaneous — this is what makes it structurally distinct from Orchestrator-Worker's fan-out.",
    "Two independent failure dials at the tool-call boundary (Failure Rate, Schema Failure Rate) produce distinguishable REQUEST_FAILED reasons.",
  ],
  exercise: {
    prompt:
      "Build Client → LLM Call → Tool Call on the canvas and run it. Then set the LLM Call's Hallucination Rate to 0 and its Schema Failure Rate to 100%. Before running: predict which entity's requestCount will be nonzero and which will stay at 0.",
    guidance: [
      {
        kind: "paragraph",
        text: "The LLM Call's own requestCount will be nonzero (every request reaches it and gets processed), but with Schema Failure Rate at 100%, every one of those calls fails its own output validation before ever forwarding downstream — the Tool Call's requestCount stays at 0. The failure happens at the LLM Call itself, not at the tool boundary, even though both are plausible places to imagine a schema check living.",
      },
    ],
  },
  relatedEntitySlugs: ["llm-call", "tool-call"],
};
