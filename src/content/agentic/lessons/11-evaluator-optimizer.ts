import type { AgenticLesson } from "../types";

/**
 * Sixth and last of the six "patterns" lessons — see 05-tool-use.ts's
 * docblock. Evaluator-Optimizer needed `guardrail_validator`, like
 * Reflection (previous lesson) — here as a *scorer* feeding a threshold-
 * driven loop, not a pass/fail gate. Landed in Phase 3 alongside it, so
 * this lesson gets the same "build it" upgrade Reflection's just got,
 * replacing the earlier honest "not buildable yet" framing.
 *
 * This is also where the pattern's own "real risk" section (self-
 * correcting into a more elaborate hallucination) stops being a claim
 * and becomes something the reader measures: GuardrailValidator.ts's
 * Verification Method (execution vs judge) plus Judge Drift / Attempt
 * simulate exactly the failure mode this lesson already named.
 */
export const EVALUATOR_OPTIMIZER: AgenticLesson = {
  slug: "evaluator-optimizer-pattern",
  number: 11,
  category: "patterns",
  title: "Pattern: Evaluator-Optimizer",
  tagline: "An llm_call's output gets scored, not just pass/fail-gated — and now you can measure the risk of grading your own homework.",
  estimatedMinutes: 16,
  sections: [
    {
      id: "the-pattern",
      heading: "The pattern",
      blocks: [
        {
          kind: "paragraph",
          text: "Evaluator-Optimizer looks like Reflection's topology — Agent Orchestrator (Sequential) → LLM Call → Guardrail Validator — but the validator's job is different. Reflection asks a pass/fail question: is this good enough to ship? Evaluator-Optimizer asks a graded one: how good is this, on some scale, against a threshold? Set Validation Mode to Scorer and the same orchestrator retry loop becomes Evaluator-Optimizer instead of Reflection — one config dial, not a different topology.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "evalopt-client", label: "Client", col: 0, row: 1, entityType: "client" },
            { id: "evalopt-orch", label: "Agent Orchestrator", sublabel: "Sequential", col: 1, row: 1, entityType: "agent_orchestrator" },
            { id: "evalopt-llm", label: "LLM Call", sublabel: "optimizer", col: 2, row: 1, entityType: "llm_call" },
            { id: "evalopt-guardrail", label: "Guardrail Validator", sublabel: "Scorer", col: 3, row: 1, entityType: "guardrail_validator" },
          ],
          edges: [
            { from: "evalopt-client", to: "evalopt-orch" },
            { from: "evalopt-orch", to: "evalopt-llm" },
            { from: "evalopt-llm", to: "evalopt-guardrail" },
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
            "Wire the identical topology Reflection used: Client → Agent Orchestrator (Sequential) → LLM Call → Guardrail Validator.",
            "On the Guardrail Validator, set Validation Mode to Scorer, Score Mean to 0.55, Score Jitter to 0, Score Threshold to 0.7.",
            "Leave Verification Method on Execution-based for now. Set Max Iterations to 5 and run it.",
            "Check the failure reason on any sessions that still fail: guardrail_score_below_threshold, not guardrail_rejected — a distinct signal from Reflection's Gate mode.",
          ],
        },
      ],
    },
    {
      id: "the-risk",
      heading: "The real risk this pattern names — now measurable",
      blocks: [
        {
          kind: "paragraph",
          text: "docs/Agentic_AI.md's research is direct about the failure mode here: an agentic loop without real redundancy \"self-corrects into a more elaborate hallucination\" — each pass sounds more confident and more polished, without actually getting more correct, if the scorer isn't grounded in something real rather than another model's own judgment.",
        },
        {
          kind: "list",
          ordered: true,
          items: [
            "On the same architecture, switch Verification Method to Judge-based and set Judge Drift / Attempt to 0.15.",
            "Run it once as Judge-based, once more as Execution-based — everything else, including the seed, identical.",
            "Compare success rate between the two runs.",
          ],
        },
        {
          kind: "insight",
          text: "Judge-based comes back with a measurably higher success rate on identical traffic and threshold — not because the underlying answer is any better (Score Mean never moved), but because a same-model judge grades the same retried output more leniently each time. Execution-based verification never drifts, however many retries occur: this is exactly why docs/Agentic_AI.md's evaluation research (a later Production-category lesson) draws a hard line between execution-based verification (run the tests, check the real end state) and judge-based scoring — and why execution-based wins whenever it's available.",
        },
      ],
    },
  ],
  summary:
    "Evaluator-Optimizer is the identical Agent Orchestrator → LLM Call → Guardrail Validator topology as Reflection, with Validation Mode set to Scorer instead of Gate — a graded threshold instead of a binary pass/fail. Its real, documented risk is now directly measurable: switching Verification Method from Execution-based to Judge-based, everything else held identical, produces a higher success rate for the wrong reason — a same-model judge grading an unchanged answer more leniently on every retry, not real improvement.",
  keyTakeaways: [
    "Evaluator-Optimizer is Reflection's exact topology with Validation Mode set to Scorer — a graded threshold loop, not a pass/fail gate, sharing the same underlying Agent Orchestrator retry.",
    "Execution-based verification (real tests, real end state) never drifts across retries; Judge-based verification measurably does, via Judge Drift / Attempt.",
    "Comparing Judge-based against Execution-based on identical traffic and threshold makes the pattern's own named risk something you measure, not something you take on faith.",
    "guardrail_score_below_threshold is a distinct failure reason from Reflection's guardrail_rejected — the trace itself shows which kind of check failed.",
  ],
  exercise: {
    prompt:
      "Name one real-world task where a guardrail_validator could realistically run in Execution-based mode (a genuinely checkable, objective outcome), versus one where it would have no honest choice but to fall back to Judge-based. What does Judge Drift / Attempt predict about how trustworthy each loop's final answer is?",
    guidance: [
      {
        kind: "paragraph",
        text: "A coding agent fixing a failing test has a real execution-based check available: run the test suite, see if it passes — grounded, objective, immune to Judge Drift by construction. A creative-writing or open-ended-summary agent has no equivalent; any guardrail_validator for it has to fall back to Judge-based, which is exactly the same shape as the thing being evaluated. The coding agent's final 'pass' is far more trustworthy precisely because its scorer isn't vulnerable to the failure mode it's supposed to catch — Judge Drift / Attempt quantifies exactly how much of the open-ended agent's eventual 'pass' might be leniency, not correctness.",
      },
    ],
  },
  relatedEntitySlugs: ["agent-orchestrator", "llm-call", "guardrail-validator"],
};
