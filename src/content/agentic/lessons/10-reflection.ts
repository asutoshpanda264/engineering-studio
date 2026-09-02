import type { AgenticLesson } from "../types";

/**
 * Fifth of the six "patterns" lessons — see 05-tool-use.ts's docblock.
 * Reflection needed `guardrail_validator` (docs/Agentic_AI.md §2.1:
 * "llm_call → guardrail_validator with an edge back into the same
 * llm_call") — a primitive Phase 2 deliberately didn't approximate (see
 * AgentOrchestrator.ts's own docblock). It landed in Phase 3, so this
 * lesson now gets the same "build it" treatment the other five patterns
 * already have, replacing the earlier honest "not buildable yet" framing.
 *
 * The loop itself needs no new topology beyond what GuardrailValidator.ts
 * documents: a Sequential Agent Orchestrator's existing retry-on-failure
 * already IS the "edge back into the same llm_call" — this lesson's
 * whole point is that the self-critique loop is Planning's retry
 * mechanism, now driven by a real pass/fail decision instead of a blind
 * count.
 */
export const REFLECTION: AgenticLesson = {
  slug: "reflection-pattern",
  number: 10,
  category: "patterns",
  title: "Pattern: Reflection",
  tagline: "An llm_call critiques its own output and revises before finishing — Planning's retry loop, now driven by a real decision.",
  estimatedMinutes: 15,
  sections: [
    {
      id: "the-pattern",
      heading: "The pattern",
      blocks: [
        {
          kind: "paragraph",
          text: "Reflection is a self-critique loop: an llm_call produces an answer, a guardrail_validator checks it, and if it doesn't pass, control loops back into the same llm_call — bounded by an iteration cap. The genuinely useful part: that loop isn't a new mechanism. It's a Sequential Agent Orchestrator's existing retry-on-failure (the same one Planning demonstrated), now driven by a real pass/fail decision instead of a blind retry count.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "reflect-client", label: "Client", col: 0, row: 1, entityType: "client" },
            { id: "reflect-orch", label: "Agent Orchestrator", sublabel: "Sequential", col: 1, row: 1, entityType: "agent_orchestrator" },
            { id: "reflect-llm", label: "LLM Call", col: 2, row: 1, entityType: "llm_call" },
            { id: "reflect-guardrail", label: "Guardrail Validator", sublabel: "Gate", col: 3, row: 1, entityType: "guardrail_validator" },
          ],
          edges: [
            { from: "reflect-client", to: "reflect-orch" },
            { from: "reflect-orch", to: "reflect-llm" },
            { from: "reflect-llm", to: "reflect-guardrail" },
          ],
        },
        {
          kind: "insight",
          label: "Where the \"edge back\" actually lives",
          text: "docs/Agentic_AI.md's §2.1 describes Reflection as an edge from guardrail_validator back into the same llm_call. On canvas that edge doesn't exist as a drawn connection — this engine only ever routes to downstream[0]. Instead, a Guardrail Validator failure propagates back through the LLM Call to the orchestrator, which re-dispatches to the same LLM Call again. Same effect, zero new wiring: the loop was already sitting in Agent Orchestrator, waiting for a primitive that could drive it with a real decision.",
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
            "Wire Client → Agent Orchestrator (Routing Mode: Sequential) → LLM Call → Guardrail Validator.",
            "On the Guardrail Validator, set Validation Mode to Gate and Rejection Rate to something meaningful — try 40%.",
            "Set the Agent Orchestrator's Max Iterations to 5.",
            "Run it, then check the LLM Call's request count against the orchestrator's total requests — it should run noticeably higher, the same signature the Planning lesson's retry demonstrated.",
          ],
        },
        {
          kind: "paragraph",
          text: "Now push Rejection Rate to 100%: every session exhausts Max Iterations and fails with reason iteration_limit_exceeded — the exact same infinite-retry-loop shape Planning's own failure mode demonstrated, except this time the thing that never lets go is a check that's impossible to satisfy, not a broken tool. From the metrics alone, the two look identical.",
        },
      ],
    },
    {
      id: "gate-vs-real-injection",
      heading: "The other place this node earns its keep",
      blocks: [
        {
          kind: "paragraph",
          text: "A Guardrail Validator doesn't only close a loop. Wired standalone between a Retriever or Tool Call and an LLM Call — with nothing looping back to it — it's the concrete mitigation docs/Agentic_AI.md's failure taxonomy names for indirect prompt injection: catching a compromised response before it ever reaches the model, not after.",
        },
      ],
    },
  ],
  summary:
    "Reflection loops an llm_call's output through a guardrail_validator, revising if it doesn't pass, bounded by an iteration cap — and that loop is entirely Agent Orchestrator's existing Sequential retry, now driven by a real pass/fail decision instead of a blind count. No new orchestration mechanism was needed once the validator itself existed.",
  keyTakeaways: [
    "Reflection is Agent Orchestrator (Sequential) → LLM Call → Guardrail Validator (Gate) — the \"edge back\" is the orchestrator's existing retry-on-failure, not a new drawn connection.",
    "The gap that matters versus a plain retry: a validator decides whether an output is good enough and why, rather than retrying blind a fixed number of times.",
    "Rejection Rate at 100% reproduces the exact same infinite-retry-loop signature as an always-failing tool — from the metrics alone, an impossible check and a broken dependency look identical.",
    "The same node also works standalone, between a Retriever/Tool Call and an LLM Call, as a direct mitigation for indirect prompt injection.",
  ],
  exercise: {
    prompt:
      "Build the Reflection topology with Rejection Rate at 60% and Max Iterations at 3. Before running: predict roughly what fraction of sessions will still fail with iteration_limit_exceeded, and why that number isn't simply 60%.",
    guidance: [
      {
        kind: "paragraph",
        text: "A session only fails if all 3 attempts are rejected — at 60% rejection per attempt, that's roughly 0.6³ ≈ 22%, not 60%. Each retry is an independent chance to pass, so the effective failure rate drops fast as Max Iterations rises — which is exactly why a low Rejection Rate with a modest iteration cap resolves almost every session, while a high one leans hard on that cap and starts failing a real, predictable fraction of the time.",
      },
    ],
  },
  relatedEntitySlugs: ["agent-orchestrator", "llm-call", "guardrail-validator"],
};
