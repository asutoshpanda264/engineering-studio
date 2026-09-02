import type { AgenticLesson } from "../types";

/**
 * Second of the six "patterns" lessons — see 05-tool-use.ts's docblock for
 * the shared framing. Planning is Sequential routingMode on
 * `agent_orchestrator` (Phase 2's new primitive): an ordered subtask
 * sequence, one step at a time, only advancing once the current one
 * succeeds.
 */
export const PLANNING: AgenticLesson = {
  slug: "planning-pattern",
  number: 7,
  category: "patterns",
  title: "Pattern: Planning",
  tagline: "An agent_orchestrator dispatching an ordered sequence of subtasks — one step at a time, staggered in the trace.",
  estimatedMinutes: 18,
  sections: [
    {
      id: "the-pattern",
      heading: "The pattern",
      blocks: [
        {
          kind: "paragraph",
          text: "Planning breaks a goal into an ordered sequence of subtasks before executing them. An agent_orchestrator in Sequential routing mode is exactly this: it dispatches to its first downstream target, waits for a real result, and only then dispatches to the next — never all at once.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "planning-client", label: "Client", col: 0, row: 1, entityType: "client" },
            { id: "planning-orch", label: "Agent Orchestrator", sublabel: "Sequential", col: 1, row: 1, entityType: "agent_orchestrator" },
            { id: "planning-step1", label: "Tool Call", sublabel: "step 1", col: 2, row: 0, entityType: "tool_call" },
            { id: "planning-step2", label: "Tool Call", sublabel: "step 2", col: 2, row: 2, entityType: "tool_call" },
          ],
          edges: [
            { from: "planning-client", to: "planning-orch" },
            { from: "planning-orch", to: "planning-step1", label: "1st" },
            { from: "planning-orch", to: "planning-step2", label: "2nd" },
          ],
        },
        {
          kind: "paragraph",
          text: "A failed step doesn't immediately fail the whole plan — the orchestrator retries it in place, up to Max Iterations, before giving up. That retry cap is the entity's whole reason for existing: it's the direct, hands-on site of failure mode #5, the infinite retry loop (a later section covers this).",
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
            "Drag a Client, an Agent Orchestrator, and two Tool Calls onto the canvas.",
            "Wire Client → Agent Orchestrator → both Tool Calls.",
            "Leave Routing Mode at its default, Sequential.",
            "Run it, then check the trace: the second Tool Call's PROCESSING_STARTED timestamp should be visibly later than the first's, not identical.",
          ],
        },
        {
          kind: "insight",
          text: "This is the exact same two-worker topology Orchestrator-Worker (the next lesson) uses — only the orchestrator's Routing Mode differs. Build both against the identical downstream wiring to see the trace difference in isolation, with nothing else changed.",
        },
      ],
    },
    {
      id: "the-infinite-loop",
      heading: "Reproduce the infinite retry loop, on purpose",
      blocks: [
        {
          kind: "paragraph",
          text: "This is where docs/Agentic_AI.md's ten-item failure taxonomy names something directly buildable: \"a failed call retried identically, no repeat-failure recognition.\" Set one Tool Call's Failure Rate to 100% and the orchestrator's Max Iterations to a large number (e.g. 200) — then watch that Tool Call's own requestCount balloon far past the orchestrator's totalRequests, one logical request quietly causing hundreds of real downstream calls before the orchestrator finally gives up.",
        },
        {
          kind: "insight",
          label: "The mitigation, built in",
          text: "The fix is the same dial that caused the problem, turned down: a low Max Iterations fails fast on a genuinely broken dependency instead of hammering it. There's no separate \"loop detector\" entity — the cap itself is the mitigation, per §1.7's own documented fix for this failure mode.",
        },
      ],
    },
  ],
  summary:
    "Planning is Sequential mode on an agent_orchestrator — an ordered subtask chain, one step at a time, each one retried in place (bounded by Max Iterations) before the whole plan gives up. Its trace is visibly staggered, distinct from Orchestrator-Worker's simultaneous fan-out even on the identical downstream topology, and its retry cap is the direct, buildable site of the infinite-retry-loop failure mode.",
  keyTakeaways: [
    "Planning is agent_orchestrator in Sequential routing mode — one step at a time, only advancing once the current one succeeds.",
    "A failed step retries in place, up to Max Iterations, before the whole session fails with reason iteration_limit_exceeded.",
    "Set Max Iterations very high against an always-failing step to reproduce the infinite-retry-loop failure mode directly — and turn it back down to see the fix.",
    "The same two-worker topology, with Routing Mode flipped to Parallel, is Orchestrator-Worker — the next lesson.",
  ],
  exercise: {
    prompt:
      "Build Client → Agent Orchestrator (Sequential) → two Tool Calls. Set the first Tool Call's Failure Rate to 100% and Max Iterations to 5. Before running: predict how many times the first Tool Call gets called for one logical request, and whether the second Tool Call gets called at all.",
    guidance: [
      {
        kind: "paragraph",
        text: "The first Tool Call gets called exactly 5 times (the full Max Iterations budget) before the orchestrator gives up — every attempt fails, so it never advances past step 1. The second Tool Call never gets called at all: Sequential mode only reaches the next step once the current one succeeds, and this one never does.",
      },
    ],
  },
  relatedEntitySlugs: ["agent-orchestrator", "tool-call"],
};
