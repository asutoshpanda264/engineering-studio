import type { AgenticLesson } from "../types";

/**
 * Third of the six "patterns" lessons — see 05-tool-use.ts's docblock.
 * Orchestrator-Worker is Parallel routingMode on `agent_orchestrator`: fan
 * out to every downstream target at the identical timestamp, wait for
 * all, synthesize. Deliberately built against the *same* two-worker
 * topology as 06-planning.ts, with only Routing Mode flipped, so the
 * trace comparison is clean and isolated.
 */
export const ORCHESTRATOR_WORKER: AgenticLesson = {
  slug: "orchestrator-worker-pattern",
  number: 8,
  category: "patterns",
  title: "Pattern: Orchestrator-Worker",
  tagline: "Fan out to every worker at once, wait for all of them, synthesize — and pay for it in concurrent-call cost.",
  estimatedMinutes: 18,
  sections: [
    {
      id: "the-pattern",
      heading: "The pattern",
      blocks: [
        {
          kind: "paragraph",
          text: "Orchestrator-Worker fans a task out to N heterogeneous workers at once and synthesizes their results back — parallel latency reduction, at the cost of N concurrent calls instead of one. An agent_orchestrator in Parallel routing mode is exactly this: every downstream target gets dispatched at the identical simulated timestamp, and the orchestrator waits for all of them before responding.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "oworker-client", label: "Client", col: 0, row: 1, entityType: "client" },
            { id: "oworker-orch", label: "Agent Orchestrator", sublabel: "Parallel", col: 1, row: 1, entityType: "agent_orchestrator" },
            { id: "oworker-a", label: "Tool Call", sublabel: "worker A", col: 2, row: 0, entityType: "tool_call" },
            { id: "oworker-b", label: "Tool Call", sublabel: "worker B", col: 2, row: 2, entityType: "tool_call" },
          ],
          edges: [
            { from: "oworker-client", to: "oworker-orch" },
            { from: "oworker-orch", to: "oworker-a" },
            { from: "oworker-orch", to: "oworker-b" },
          ],
        },
        {
          kind: "insight",
          label: "The explicit trade-off this pattern makes",
          text: "docs/Agentic_AI.md is blunt about this: Orchestrator-Worker \"earns its keep only when subtasks are heterogeneous and parallel latency reduction justifies concurrent-call cost — it's explicitly overkill for linear, dependent workflows.\" Using it on dependent steps doesn't just fail to help — it dispatches a step before the input it actually needs exists.",
        },
      ],
    },
    {
      id: "build-it",
      heading: "Build it — and compare against Planning",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            "Build the identical Client → Agent Orchestrator → two Tool Calls topology from the Planning lesson.",
            "This time, set Routing Mode to Parallel.",
            "Run it, then check the trace: both Tool Calls' PROCESSING_STARTED timestamps should be identical — not staggered like Planning's were.",
          ],
        },
        {
          kind: "paragraph",
          text: "Nothing else changed — same client, same two workers, same latencies. The only thing that moved is one config dial, and the trace shape flipped from staggered to simultaneous. That's \"demonstrably distinct in their event traces,\" made concrete rather than asserted.",
        },
      ],
    },
    {
      id: "partial-failure",
      heading: "One bad worker fails the whole session",
      blocks: [
        {
          kind: "paragraph",
          text: "Set only one of the two Tool Calls' Failure Rate to 100% and leave Max Iterations low (e.g. 1 — no retry). Run it: the whole session fails, reported with the failing worker's own failure reason, even though the other worker did real, successful work.",
        },
        {
          kind: "insight",
          text: "Synthesis here is binary — this simulator doesn't model partial-success or majority-vote outcomes. In a real system, that's a design decision worth making deliberately (does the caller get a partial answer, or nothing?), not an accident of how the orchestrator happens to be wired.",
        },
      ],
    },
  ],
  summary:
    "Orchestrator-Worker is Parallel mode on an agent_orchestrator — every downstream worker dispatched at the identical timestamp, synthesized only once all report back. Built against the identical topology Planning uses, only the Routing Mode differs, and the trace shows it directly: simultaneous dispatch instead of staggered. It's real overkill for dependent work, and its synthesis is all-or-nothing — one exhausted worker failure fails the whole session regardless of what the others accomplished.",
  keyTakeaways: [
    "Orchestrator-Worker is agent_orchestrator in Parallel routing mode — every downstream target dispatched at the identical timestamp.",
    "The exact same downstream topology as Planning, with only Routing Mode flipped, produces a visibly different trace — staggered vs. simultaneous dispatch.",
    "This pattern is explicitly overkill for a linear, dependent workflow — its value only shows up when subtasks are genuinely independent.",
    "Synthesis is binary here: any worker's exhausted failure fails the whole session, even if every other worker succeeded.",
  ],
  exercise: {
    prompt:
      "Build the Orchestrator-Worker topology with three Tool Calls instead of two, all reliable (Failure Rate 0). Before running: predict whether average latency is closer to the sum of all three workers' processing times, or closer to just the slowest one.",
    guidance: [
      {
        kind: "paragraph",
        text: "Closer to the slowest one. Since all three dispatch at the same timestamp and the orchestrator only responds once every worker has reported back, the session's total duration is bounded by whichever worker takes longest — not the sum of all three. That's the entire latency argument for Orchestrator-Worker over a sequential chain doing the same three things one after another.",
      },
    ],
  },
  relatedEntitySlugs: ["agent-orchestrator", "tool-call"],
};
