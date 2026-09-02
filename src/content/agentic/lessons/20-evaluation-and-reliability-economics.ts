import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.8 (evaluation shifted from "did it
 * work once" to reliability) and §2.5 (metrics: cost, loop count, and a
 * signature reliability score). The pass^k mechanic described here is
 * `src/simulation/engine/reliabilityScore.ts`, rendered by
 * `ReliabilityPanel.tsx` — this pillar's one genuinely novel
 * contribution per that module's own docblock, not a translation of an
 * existing idea into this engine.
 */
export const EVALUATION_AND_RELIABILITY_ECONOMICS: AgenticLesson = {
  slug: "evaluation-and-reliability-economics",
  number: 20,
  category: "production",
  title: "Evaluation & Reliability Economics",
  tagline:
    "\"It worked\" and \"it reliably works\" are different claims, and the gap between them is where a 37% lab-to-production drop and a 50x cost swing both live.",
  estimatedMinutes: 17,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "A demo that succeeds once proves an agent *can* solve a task. It says nothing about whether it solves that same task reliably — and for a system averaging 70-95% failure rates depending on task complexity (§18), \"worked once\" is a much weaker claim than it sounds.",
        },
        {
          kind: "insight",
          text: "\"Reliability is the headline metric — single-run accuracy has saturated its information value.\" The field has moved past asking whether an agent can solve a task at all, to asking whether it solves the *same* task on *every one* of k tries.",
        },
      ],
    },
    {
      id: "the-benchmarks",
      heading: "The reference benchmarks",
      blocks: [
        {
          kind: "list",
          items: [
            "SWE-bench Verified — 500 engineer-reviewed real GitHub issues, the reference benchmark for coding agents.",
            "τ-bench / τ²-bench — a tool-using agent against a simulated user, required to follow domain policy while completing the task.",
          ],
        },
        {
          kind: "paragraph",
          text: "τ-bench's headline metric is pass^k: does the agent solve the same task on every one of k tries — reliability, not luck. Execution-based verification (run the real test suite, check the database's actual end state) is preferred over judge-based scoring, for a reason directly connected to §11's Evaluator-Optimizer lesson: a judge grading output is itself vulnerable to the same failure modes the thing it's grading is.",
        },
      ],
    },
    {
      id: "the-sobering-numbers",
      heading: "The sobering production numbers",
      blocks: [
        {
          kind: "table",
          headers: ["Finding", "What it means"],
          rows: [
            ["37% gap between lab benchmark scores and real deployment performance", "A benchmark score is not a production reliability guarantee — expect real deployment to underperform it substantially"],
            ["50x cost variation for similar accuracy across otherwise-comparable agents", "Architecture and configuration choices, not just \"which model,\" drive most of the cost difference at a given accuracy level"],
          ],
        },
        {
          kind: "insight",
          text: "This is exactly why the earlier inference-and-serving lessons (cascade routing, quantization, caching) matter beyond being cost trivia — a 50x cost swing at similar accuracy means the architecture decisions in those lessons are frequently a bigger lever than the model choice itself.",
        },
      ],
    },
    {
      id: "pass-k-here",
      heading: "pass^k, made directly answerable in this engine",
      blocks: [
        {
          kind: "paragraph",
          text: "Because this workshop's simulation engine is already seeded and deterministic, τ-bench's pass^k question is directly, honestly answerable: re-run the identical architecture across N different seeds and report the fraction that reach a successful terminal state. This reuses the exact \"re-run and compare\" shape already established for comparing architectures with vs. without one entity — just varying the seed instead of the topology.",
        },
        {
          kind: "paragraph",
          text: "\"Successful terminal state\" is a threshold on a run's own success rate, since this engine's traffic model is many concurrent requests per run, not one discrete task execution the way a single τ-bench episode is — pass^k's literal solved-or-not binary is reinterpreted as \"did this run clear the bar,\" with the bar itself a parameter (a scenario's own success-rate gate, or a sensible default) rather than something asserted on the architecture's behalf.",
        },
        {
          kind: "insight",
          label: "Reading the reliability panel",
          text: "A build with 10/10 passing seeds at a 95% success-rate threshold is meaningfully more reliable than one that passes 6/10 — even if both builds' single-seed metrics look similar on a lucky run. The whole point is that a single run's success rate can mislead; the reliability score is what a demo can't show you.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Our agent passed every test case in the demo — are we production-ready?\"",
          answer:
            "\"A passing demo proves the agent can solve the task once, under the exact conditions of that run — it doesn't prove it solves it reliably, and the documented lab-to-production gap is 37%. Before shipping, re-run the same architecture across multiple seeds/conditions and look at the pass rate across all of them, not the result of the one run you happened to demo.\"",
        },
        {
          kind: "qa",
          question: "\"Two agents hit similar accuracy on our eval — how do we pick?\"",
          answer:
            "\"Cost, not just accuracy — documented production data shows up to 50x cost variation between agents with similar accuracy, driven by architecture choices (model tier, caching, retry behavior) more than raw model capability. 'Similar accuracy' isn't the finish line if one of them costs 50x more to reach it.\"",
        },
      ],
    },
  ],
  summary:
    "Evaluation for agents has shifted from \"did it work once\" to reliability: τ-bench's pass^k metric asks whether an agent solves the same task on every one of k tries, and execution-based verification (real test suite, real database end state) beats judge-based scoring, which is vulnerable to the same failure modes it's meant to catch. Production data is sobering: a 37% gap between lab benchmark scores and real deployment performance, and up to 50x cost variation between agents with similar accuracy — meaning architecture choices (cascade routing, quantization, caching) are frequently a bigger lever than model choice at a given accuracy level. Because this workshop's engine is already seeded and deterministic, pass^k is directly answerable here: re-run the same architecture across N seeds and report the fraction that clear a success-rate bar — the reliability score a single demo run can't show you.",
  keyTakeaways: [
    "\"Reliability is the headline metric now — single-run accuracy has saturated its information value.\" A passing demo proves an agent can solve a task once, not reliably.",
    "τ-bench's pass^k metric: does the agent solve the same task on every one of k tries. Execution-based verification (real test suite, real database state) beats judge-based scoring.",
    "37% gap between lab benchmark scores and real deployment performance — treat a benchmark score as an upper bound, not a production guarantee.",
    "Up to 50x cost variation between agents with similar accuracy — architecture choices, not just model selection, are frequently the bigger lever.",
    "This workshop's own pass^k-style reliability score re-runs the identical architecture across multiple seeds and reports the fraction that clear a success-rate bar — reusing this engine's determinism to make the question directly answerable, not just discussable.",
  ],
  exercise: {
    prompt:
      "You've built an agent that scores 95% success on a single run against your own test scenario. Before reading further: is that number enough to decide the build is production-ready, and what would you actually check next?",
    guidance: [
      {
        kind: "paragraph",
        text: "No — a single run's success rate is exactly the kind of number pass^k exists to distinguish from a genuinely reliable one. A build that happens to clear 95% on one seed could be sitting right at the edge of its reliability, passing on most random draws but failing on others.",
      },
      {
        kind: "paragraph",
        text: "The next check is re-running the identical architecture across multiple seeds (this workshop's reliability score does exactly this) and looking at what fraction of those runs also clear the bar. A build that passes 10/10 seeds at that threshold is a materially stronger claim than one that passes 6/10 while still averaging a similar headline success rate — the single-run number alone can't tell those two builds apart.",
      },
    ],
  },
  relatedEntitySlugs: ["agent-orchestrator", "guardrail-validator"],
};
