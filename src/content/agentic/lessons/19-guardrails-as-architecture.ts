import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.9 (case study: how Claude Code
 * composes all of the above) and the guardrail_validator /
 * human_in_loop_gate entities that implement the same ideas here —
 * see those two entities' own docblocks in `src/simulation/entities/`.
 */
export const GUARDRAILS_AS_ARCHITECTURE: AgenticLesson = {
  slug: "guardrails-as-architecture",
  number: 19,
  category: "production",
  title: "Guardrails as Architecture, Not as Prompt",
  tagline:
    "\"Just tell the model to be careful\" is a prompt. A guardrail that actually holds under a compromised model is a separate code path the model can't talk its way past.",
  estimatedMinutes: 16,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "A guardrail written as instructions in the system prompt (\"never delete files without confirming first\") only holds as long as nothing — a clever user, an injected instruction buried in retrieved content, the model's own reasoning going sideways — talks the model out of following it. A guardrail that actually holds is architectural: enforced by a separate code path the model has no way to override, no matter what it decides to do.",
        },
        {
          kind: "insight",
          text: "Claude Code's own documented design is a genuinely good worked example of this, composing four distinct ideas for real rather than as a slogan.",
        },
      ],
    },
    {
      id: "four-ideas",
      heading: "Four ideas, composed",
      blocks: [
        {
          kind: "list",
          items: [
            "Deny-first with human escalation — the default posture for a new or ambiguous action is \"no,\" not \"yes unless flagged,\" and the escalation path when something needs a real decision is a human, not a weaker automated check.",
            "Graduated trust spectrum — not every action gets the same scrutiny; trust is earned/scoped per action type, not granted uniformly to the agent as a whole.",
            "Defense in depth — layered mechanisms, not one gate. A single check that can be bypassed once is a single point of failure; several independent layers each have to fail for a bad action to get through.",
            "Reversibility-weighted risk assessment — an irreversible action gets a harder, more explicit gate than a reversible one. Deleting a file gets more scrutiny than reading one, because the cost of being wrong is asymmetric.",
          ],
        },
      ],
    },
    {
      id: "separate-code-paths",
      heading: "The load-bearing detail: separate code paths",
      blocks: [
        {
          kind: "insight",
          label: "Why this actually holds under a compromised model",
          text: "\"Because reasoning and enforcement occupy separate code paths, a compromised model cannot override sandboxing rules — the model's only interface to the outside world is the structured tool-call protocol, which the harness validates before execution.\" This is the entire difference between guardrails-as-architecture and guardrails-as-prompt: the model can hallucinate, be prompt-injected, or reason its way to a bad conclusion, and the enforcement layer still holds, because it was never the model's decision to enforce in the first place.",
        },
        {
          kind: "paragraph",
          text: "This is exactly why direct and indirect prompt injection (failure modes #9 and #10 from the previous lesson) are contained rather than \"solved\": the mitigation isn't a smarter model that resists injection, it's a validation layer the model's output has to pass through regardless of what the model was tricked into producing.",
        },
      ],
    },
    {
      id: "the-two-primitives",
      heading: "The two primitives that build this here",
      blocks: [
        {
          kind: "paragraph",
          text: "guardrail_validator and human_in_loop_gate are the concrete implementations of this idea in this workshop, and each maps to a specific piece of the Claude Code case study:",
        },
        {
          kind: "table",
          headers: ["Primitive", "Mode", "What it's for"],
          rows: [
            ["guardrail_validator", "gate", "A binary pass/fail check — Reflection's shape, an automated layer of defense in depth"],
            ["guardrail_validator", "scorer", "A graded score against a threshold — Evaluator-Optimizer's shape, a softer check than a hard gate"],
            ["human_in_loop_gate", "—", "Deliberate approval latency + a real human decision — deny-first's actual escalation path, and the reversibility-weighted gate for irreversible actions"],
          ],
        },
        {
          kind: "paragraph",
          text: "Neither primitive implements a retry loop on its own — composing guardrail_validator with agent_orchestrator's existing iteration-capped retry is what produces Reflection's self-critique loop, the same \"compose primitives, don't invent a new mechanism per pattern\" discipline this whole track follows.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"We added a system prompt instruction telling the agent never to take irreversible actions without confirmation — isn't that enough?\"",
          answer:
            "\"No — that's guardrails-as-prompt, and it only holds as long as nothing talks the model out of following it: a jailbreak, an injected instruction in retrieved content, or the model's own reasoning drifting. A guardrail that actually holds is architectural — a separate validation layer, or a human_in_loop_gate, that the model's output has to pass through regardless of what the model decided, the same way Claude Code's sandboxing rules can't be overridden by the model because enforcement lives in a different code path than reasoning.\"",
        },
        {
          kind: "qa",
          question: "\"Should every tool call go through a human_in_loop_gate?\"",
          answer:
            "\"No — that's the opposite mistake, uniform friction instead of reversibility-weighted risk. A read-only lookup and a production database deletion don't deserve the same scrutiny; gating everything at the same level either slows the system to a crawl or, worse, trains reviewers to rubber-stamp the gate because most of what comes through it is low-stakes. Scope the hard gate to genuinely irreversible actions and let a lighter guardrail_validator handle the rest.\"",
        },
      ],
    },
  ],
  summary:
    "Guardrails-as-architecture means enforcement lives in a separate code path from the model's own reasoning, so a compromised or tricked model has no way to override it — the model's only interface to the outside world is a structured protocol the harness validates independently. Claude Code's documented design composes four ideas for real: deny-first with human escalation, a graduated trust spectrum, defense in depth (layered checks, not one gate), and reversibility-weighted risk assessment (irreversible actions get harder gates). guardrail_validator (gate/scorer modes) and human_in_loop_gate are this workshop's concrete implementations, composing with agent_orchestrator's existing retry loop rather than each inventing its own — and this is the real containment strategy behind prompt injection (§18): not a smarter model, a validation layer the output has to pass regardless of how it was produced.",
  keyTakeaways: [
    "A guardrail written as a prompt instruction only holds as long as nothing talks the model out of following it — a real guardrail is a separate, model-independent code path.",
    "Claude Code's design composes four ideas: deny-first with human escalation, graduated trust, defense in depth (layered checks), and reversibility-weighted risk assessment.",
    "The load-bearing detail is separate code paths for reasoning vs. enforcement — a compromised model can't override sandboxing it has no interface to reach.",
    "guardrail_validator (gate/scorer) and human_in_loop_gate are this workshop's concrete implementations, and neither implements its own retry loop — they compose with agent_orchestrator's existing one.",
    "Reversibility-weighted risk means not every action gets the same scrutiny — uniform friction on every action is its own design failure, not extra safety.",
  ],
  exercise: {
    prompt:
      "A coding agent can read files freely, run tests freely, and deploy to production. Before reading further: applying reversibility-weighted risk assessment and defense in depth, how would you tier the scrutiny across these three actions, and what would defense in depth look like specifically on the deploy action?",
    guidance: [
      {
        kind: "paragraph",
        text: "Reading files and running tests are both reversible (running tests has no side effects on production state) — light or no gating is appropriate, since heavy friction here would slow the agent down for no real safety gain. Deploying to production is irreversible in effect (a bad deploy is live, serving real traffic, until someone notices and rolls it back) — it deserves the hardest gate of the three.",
      },
      {
        kind: "paragraph",
        text: "Defense in depth on the deploy action means more than one independent layer: a guardrail_validator checking the build/test results actually passed (an automated layer), followed by a human_in_loop_gate requiring real approval before the deploy executes (a second, independent layer) — structured so that a failure or bypass of one layer alone still doesn't let a bad deploy through, rather than one check standing in as the entire defense.",
      },
    ],
  },
  relatedEntitySlugs: ["guardrail-validator", "human-in-loop-gate"],
};
