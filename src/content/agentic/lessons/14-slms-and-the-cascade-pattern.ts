import type { AgenticLesson } from "../types";

/**
 * Grounded in `docs/Agentic_AI.md` §1.10 (SLMs, edge deployment, and the
 * cascade pattern) and §2.8 (the `model_router` primitive), which models
 * every mode described here — `src/simulation/entities/ModelRouter.ts`.
 */
export const SLMS_AND_THE_CASCADE_PATTERN: AgenticLesson = {
  slug: "slms-and-the-cascade-pattern",
  number: 14,
  category: "inference-and-serving",
  title: "SLMs and the Cascade Pattern",
  tagline:
    "A small model delivers roughly 90% of a large model's functionality at roughly 10% of the cost. The cascade pattern is how you actually capture that 90/10 rule instead of just quoting it.",
  estimatedMinutes: 15,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "\"Just use the biggest model everywhere\" is the easy default and, for most requests, a genuine waste — a large fraction of real traffic is simple enough that a small, cheap, fast model handles it correctly. The hard part was never knowing this; it's deciding, per request, which requests actually need the expensive model.",
        },
        {
          kind: "insight",
          text: "Small Language Models (SLMs) deliver roughly 90% of a Large Language Model's functionality at roughly 10% of the cost — not a rounding error, the headline economic fact this whole lesson is built on.",
        },
      ],
    },
    {
      id: "the-cascade",
      heading: "The cascade pattern",
      blocks: [
        {
          kind: "paragraph",
          text: "A cascade wires two LLM call targets downstream of a router: a cheap/fast SLM-tier path and an expensive/reliable LLM-tier path. The router decides, per request, which one handles it — the same primitive this workshop's model_router entity implements, with four selectable modes.",
        },
        {
          kind: "table",
          headers: ["Mode", "Behavior", "When it's the right call"],
          rows: [
            ["always_llm", "Every request to the expensive tier", "Baseline every other mode is measured against"],
            ["always_slm", "Every request to the cheap tier", "Baseline for the cheap, less-reliable floor"],
            ["confidence_cascade", "Escalate to LLM below a confidence threshold, stateless", "Traffic where difficulty varies but budget isn't hard-capped"],
            ["cost_optimized_cascade", "Same confidence check, but escalation additionally capped by a running budget", "A genuine $/1000-requests ceiling that must never be exceeded"],
          ],
        },
        {
          kind: "insight",
          label: "cost_optimized_cascade's real behavior",
          text: "Once the observed escalation rate would cross the configured cap, an otherwise-warranted escalation is suppressed — the request stays on the cheap tier even when the confidence check called for the expensive one. This is the literal, honest shape of a hard budget constraint: sometimes the right, budget-respecting decision is a worse answer than the confidence check alone would have picked.",
        },
      ],
    },
    {
      id: "edge-vs-cloud",
      heading: "Where SLMs actually run: edge deployment",
      blocks: [
        {
          kind: "paragraph",
          text: "SLMs are also what makes on-device / edge inference viable at all — small enough to run without a network round trip. The latency gap is the point: sub-20ms on-device inference against roughly 200-500ms for a cloud round trip to a frontier model. That gap alone can decide the SLM-first cascade even before cost enters the comparison.",
        },
        {
          kind: "paragraph",
          text: "The trade isn't free: an edge-deployed model caps effective capability at whatever fits on-device, so the cascade's escalation path to a cloud-hosted LLM tier still matters for anything the on-device model genuinely can't handle.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Why not just always use the small model if it's good enough 90% of the time?\"",
          answer:
            "\"Because the 10% it isn't good enough for is exactly the traffic where a wrong answer is most costly — the cascade exists to catch that fraction, not to pretend it doesn't exist. always_slm is a real baseline worth measuring, but shipping it unconditionally means eating that 10% failure rate on every request, including the ones where it matters most.\"",
        },
        {
          kind: "qa",
          question: "\"How would you actually enforce a hard cost ceiling in production, not just aim for one?\"",
          answer:
            "\"A stateless confidence threshold alone doesn't guarantee a budget — it just changes the average. cost_optimized_cascade's running escalation-rate cap is the mechanism: track observed escalations against the budget, and suppress further escalation once the cap would be crossed, even when the per-request confidence check would otherwise call for it.\"",
        },
      ],
    },
  ],
  summary:
    "SLMs deliver roughly 90% of an LLM's functionality at roughly 10% of the cost, and the cascade pattern is how a system captures that ratio instead of paying LLM prices on every request. model_router's four modes — always_llm, always_slm, confidence_cascade, cost_optimized_cascade — span the baseline-expensive, baseline-cheap, difficulty-aware, and hard-budget-capped points on that spectrum. Edge deployment adds a second, latency-driven reason to prefer SLMs (sub-20ms on-device vs. 200-500ms cloud round trip), at the cost of capping effective capability to whatever fits on-device.",
  keyTakeaways: [
    "SLMs deliver roughly 90% of an LLM's functionality at roughly 10% of the cost — the economic fact the cascade pattern exists to capture.",
    "model_router's four modes span always-expensive, always-cheap, confidence-aware, and hard-budget-capped cascade behavior.",
    "cost_optimized_cascade enforces a real budget by suppressing escalation once the observed rate would cross the cap — not just biasing the average.",
    "Edge-deployed SLMs cut latency dramatically (sub-20ms vs. 200-500ms cloud round trip) but cap effective capability to what fits on-device.",
    "A cascade needs both a cheap and an expensive downstream target wired — the router adds no capacity of its own, only a routing decision.",
  ],
  exercise: {
    prompt:
      "A customer-support agent has a strict $/1000-requests budget that must never be exceeded, even during a traffic spike where more requests than usual are genuinely hard. Before reading further: which model_router mode do you pick, and what actually happens to the hard requests once the budget is under pressure?",
    guidance: [
      {
        kind: "paragraph",
        text: "cost_optimized_cascade is the only mode that can honor a hard ceiling — confidence_cascade alone has no notion of a budget and will escalate every low-confidence request regardless of cost, which a spike of genuinely hard requests would blow straight through.",
      },
      {
        kind: "paragraph",
        text: "Under budget pressure, some requests that the confidence check would have escalated stay on the cheap tier instead — the running escalation-rate cap suppresses further escalation once it's reached. This is an honest trade-off, not a bug: the system is choosing a worse answer on some hard requests over exceeding the budget, and that choice should be visible in the metrics (a higher failure/hallucination rate on suppressed-escalation requests), not silently absorbed.",
      },
    ],
  },
  relatedEntitySlugs: ["model-router", "llm-call"],
};
