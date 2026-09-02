import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.7 (a well-documented taxonomy of
 * how agents actually fail) and §2.3 (failure injection = the 10-item
 * taxonomy, directly). Every mechanic named here is a real config knob
 * or fail reason string in this codebase, not an invented mapping —
 * see LlmCall.ts, ToolCall.ts, MemoryContextStore.ts, Retriever.ts,
 * AgentOrchestrator.ts, and autonomousOpsAgent.ts's own docblock for
 * failure mode #7's honest "wiring gap, not a config knob" framing.
 */
export const THE_AGENT_FAILURE_TAXONOMY: AgenticLesson = {
  slug: "the-agent-failure-taxonomy",
  number: 18,
  category: "production",
  title: "The Agent Failure Taxonomy",
  tagline:
    "Industry estimates put real-world agent failure rates at 70-95% depending on task complexity. That's not an edge case to footnote — it's the median experience, and it has a name for every distinct way it happens.",
  estimatedMinutes: 18,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "\"The agent failed\" is not one failure mode — production postmortems converge on ten distinct, named ways agents actually fail, each with its own cause, its own observable signal, and its own mitigation. Knowing which one you're looking at is most of the diagnosis.",
        },
        {
          kind: "insight",
          text: "OWASP has ranked prompt injection the #1 LLM risk for three years running, with no solved defense — only containment (least privilege: an agent that cannot call a payment tool cannot be tricked into a fraudulent payment). This taxonomy isn't theoretical; every mode below is modeled as a real, roll-able config knob in this workshop's entities, not an invented list.",
        },
      ],
    },
    {
      id: "the-ten",
      heading: "The ten failure modes",
      blocks: [
        {
          kind: "table",
          headers: ["#", "Failure mode", "Cause", "Modeled where"],
          rows: [
            ["1", "Schema violation", "Tool call args wrong type/shape", "tool_call & llm_call's schemaFailureRate"],
            ["2", "Hallucinated tool invocation", "Agent calls a tool not in its registered set", "tool_call's hallucinatedInvocationRate"],
            ["3", "Context window truncation/rot", "Long history pushes info past attention range", "memory_context_store's \"none\" compaction policy past capacity"],
            ["4", "Silent failure", "Tool returns success with empty/malformed payload, no error surfaces", "tool_call's silentFailureRate"],
            ["5", "Infinite retry loop", "Failed call retried identically, no repeat-failure recognition", "agent_orchestrator with maxIterations set too high"],
            ["6", "Agent paralysis", "Contradictory signals, no action satisfies success criteria", "An orchestrator loop with no defined exit condition — topology, not a single flag"],
            ["7", "Error propagation / cascade", "One agent's hallucinated output trusted as fact downstream", "A worker result forwarded with no verification step — topology, not a single flag"],
            ["8", "Context/spec drift", "Original constraints deprioritized over a long session, no exception fires", "Related to memory_context_store's compaction loss, distinct from #3"],
            ["9", "Direct prompt injection", "Attacker-controlled input overwrites instructions", "llm_call's promptInjectionRate"],
            ["10", "Indirect prompt injection", "Malicious instructions embedded in retrieved/tool content", "retriever's poisonedContentRate"],
          ],
        },
      ],
    },
    {
      id: "config-vs-topology",
      heading: "Two different kinds of failure: a config knob vs. a wiring gap",
      blocks: [
        {
          kind: "paragraph",
          text: "Modes #1, #2, #3, #4, #5, #9, and #10 each roll out of one specific entity's own config — set schemaFailureRate, hallucinatedCallRate, or an unbounded maxIterations, and you get exactly that failure at exactly the rate configured. These are honest, directly-injectable failures.",
        },
        {
          kind: "insight",
          label: "The other kind — #6, #7, #8 are architectural gaps, not dials",
          text: "Agent paralysis, error cascade, and context/spec drift don't have a single config flag to flip. They're what happens when a topology is missing a piece: no exit condition on a loop, no verification step between one agent's output and the next agent's decision, no re-check against the session's original intent. They're the failure modes this pillar's whole \"break it → fix it by adding the right primitive\" loop is actually teaching — the fix isn't a config change, it's adding a guardrail_validator, a human_in_loop_gate, or a bounded exit condition where the topology was missing one.",
        },
      ],
    },
    {
      id: "the-scale-of-it",
      heading: "The scale this operates at",
      blocks: [
        {
          kind: "paragraph",
          text: "Hallucinated tool invocations alone show up in an estimated 3-15% of production tool calls. Combined with the other nine modes across a multi-step agent session, industry estimates put real-world agent failure rates at 70-95% depending on task complexity — this is why the next lesson's evaluation/reliability framing (pass^k: did it work on every one of k tries, not just once) matters more here than in most software domains.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Our agent occasionally does something completely wrong with no error in the logs — where do we even start?\"",
          answer:
            "\"That description — succeeds, no error, wrong result — is specifically failure mode #4, silent failure: a tool returned a 200 with an empty or malformed payload and nothing downstream validated the actual return object. The fix is explicit return-object validation and propagation guards, not more logging on the happy path, since the happy path is exactly where this failure hides.\"",
        },
        {
          kind: "qa",
          question: "\"Why can't you just fix prompt injection once and be done with it?\"",
          answer:
            "\"Because it's an adversarial problem, not a bug — OWASP has ranked it the #1 LLM risk for three years with no solved defense, only containment. The real mitigation is least-privilege scoping (an agent that can't call a payment tool can't be tricked into a fraudulent payment) plus a runtime output-verification gate against the original task spec, not a filter you write once and stop thinking about.\"",
        },
      ],
    },
  ],
  summary:
    "Ten distinct, named failure modes recur across production agent postmortems, each with its own cause and mitigation: schema violation, hallucinated tool invocation, context truncation, silent failure, infinite retry loop, agent paralysis, error cascade, context/spec drift, direct prompt injection, and indirect prompt injection. Seven of the ten are directly injectable config knobs on specific entities here (llm_call, tool_call, memory_context_store, retriever); the remaining three — agent paralysis, error cascade, context/spec drift — are architectural gaps in a topology rather than a single flag, and the fix for those is adding the right primitive (a guardrail, a human-in-loop gate, a bounded exit condition), not a config change. Combined, industry estimates put real-world agent failure rates at 70-95% depending on task complexity — the median experience, not an edge case.",
  keyTakeaways: [
    "Ten documented failure modes recur in production agent postmortems, each with a distinct cause and mitigation, not one generic \"the agent failed.\"",
    "Seven modes are directly injectable config knobs on specific entities: schema violation and hallucinated tool calls on tool_call, context truncation on memory_context_store, prompt injection (direct/indirect) on llm_call/retriever, infinite retry loop on an unbounded agent_orchestrator.",
    "Agent paralysis, error cascade, and context/spec drift are architectural gaps — no single config flag, fixed by adding a missing primitive (guardrail, human-in-loop gate, exit condition), not by tuning a rate.",
    "Hallucinated tool calls alone affect an estimated 3-15% of production tool calls.",
    "Real-world agent failure rates run 70-95% depending on task complexity — treat unreliability as the default to design against, not a rare edge case.",
  ],
  exercise: {
    prompt:
      "An orchestrator-worker build has a worker agent that runs a diagnostic and reports a result, and a second agent that takes an irreversible production action based on that report — with nothing in between checking the report first. Before reading further: which failure mode is this build exposed to, and is the fix a config change or a topology change?",
    guidance: [
      {
        kind: "paragraph",
        text: "This is failure mode #7, error propagation/cascade: one agent's (possibly hallucinated or simply wrong) output is trusted as fact by the next agent's decision, with nothing verifying it in between.",
      },
      {
        kind: "paragraph",
        text: "It's a topology gap, not a config knob — there's no \"cascade rate\" to dial down. The fix is adding a verification step between the two agents: a guardrail_validator checking the diagnostic result before it's acted on, and given that the downstream action is irreversible, a human_in_loop_gate before it executes regardless of what the validator says — the exact reversibility-weighted-risk pattern this pillar's earlier lessons argue for directly.",
      },
    ],
  },
  relatedEntitySlugs: ["llm-call", "tool-call", "memory-context-store", "retriever", "agent-orchestrator"],
};
