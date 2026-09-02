/**
 * Cost-Constrained Edge Assistant — `docs/Agentic_AI.md` Part 4, scenario
 * 5. The direct payoff of §2.7-§2.9: a $/month budget and a quality
 * floor that no single lever clears alone. Always-LLM is reliable but
 * far over budget; cascading to an SLM without quantization/edge/cache
 * still isn't cheap enough; only the full composition — `model_router`'s
 * SLM-first cascade, quantization, edge deployment (no per-token bill),
 * and a semantic `Cache` skipping the model call entirely on repeat-ish
 * queries — clears both bars at once. This is the scenario where "why
 * would I ever accept lower precision" gets a measured answer instead of
 * a lesson's word for it.
 *
 * Only the Client is given (Request Rate locked at 40 req/s — a real
 * on-device-assistant volume, not a toy number).
 *
 * TUNING NOTE (verified against the real engine, seed 500, 15s @ 40
 * req/s, Key Pool Size 30, via a throwaway script, deleted after use):
 *
 *   Always-LLM, no quantization, cloud: 94.9% success, $192,471/mo —
 *   clears the quality floor, blows the budget by nearly 40x.
 *   Confidence-cascade, SLM int4 / LLM int8, cloud, no cache: 91.9%
 *   success, $27,104/mo — cheaper, still more than 5x over budget.
 *   Confidence-cascade, SLM int4 / LLM int8, SLM on edge, semantic Cache
 *   in front: 99.3% success, $1,611/mo — clears both.
 *   Cost-optimized-cascade, same quantization/edge/cache: 99.8% success,
 *   $1,119/mo — the best of the four, `optimalSolution` below.
 *
 * budgetUsd set to $5,000 — comfortably clears the edge+cache builds,
 * clearly fails both cloud-only variants regardless of cascade mode.
 */

import type { Scenario } from "./types";

export const costConstrainedEdgeAssistant: Scenario = {
  id: "cost-constrained-edge-assistant",
  title: "Cost-Constrained Edge Assistant",
  difficulty: 4,
  topics: ["model-routing", "agentic-system-design"],
  story:
    "A consumer app wants an always-on assistant running on-device for millions of users — " +
    "real volume, a real monthly bill if it's built carelessly. Finance has set a hard budget. " +
    "Product has set a quality floor. Neither team cares how the engineering gets there, only " +
    "that both numbers are hit at the same time, every month, not just this one.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 220 },
      config: { requestRate: 40 },
    },
  ],
  startingConnections: [],
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate"] },
  budgetUsd: 5000,

  trafficPattern: { type: "constant", rate: 40 },
  durationMs: 15_000,
  seed: 500,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.9,
      label: "At least 90% of requests are answered — the quality floor",
      unit: "%",
    },
  ],

  hints: [
    "Always-LLM at full precision clears the quality floor easily. What does it cost at this volume — and does raising Quantization or switching to a cascade mode, on its own, get anywhere close to the budget?",
    "Deployment Target Edge doesn't just change latency — it zeroes the per-token API bill entirely for that node, the real economic argument for it, not just the responsiveness one. Which of the two Model Router targets can actually run there?",
    "A semantic Cache in front of the router skips the model call entirely on a hit, not just the cheap tier. What does stacking that on top of an already-cascaded, already-quantized build actually buy you?",
    "Cost-optimized-cascade and confidence-cascade aren't interchangeable — one of them enforces a real running budget on escalations, the other doesn't. Does that difference show up at this traffic volume?",
  ],

  learningGoals: [
    "No single lever — cascading alone, quantization alone, edge alone, caching alone — clears a genuinely tight budget at real volume. The 90/10 rule and the ~75-85% cost cut §1.10/§1.13 describe both assume the full composition, not one dial turned up.",
    "Edge deployment's real economic argument is zero per-token cost, not just lower latency — a detail easy to miss if you only ever compare quantization levels on the same cloud deployment.",
    "A budget and a quality floor together force a genuinely different architecture than either alone would — a cheap-but-unreliable build fails the floor, a reliable-but-expensive one fails the budget, and only the full stack clears both.",
  ],

  capacityEstimate: {
    prompt:
      "Always-LLM, no quantization, cloud deployment, at 40 req/s sustained for a full month — " +
      "roughly how many requests is that, and at Cloud LLM's baseline ~$2.50/million tokens " +
      "(800 assumed tokens/request), roughly what does a month of that traffic cost before any " +
      "optimization at all?",
    worked:
      "40 req/s x ~2.63M seconds/month = ~105M requests/month x 800 tokens = ~84 billion " +
      "tokens/month, at $2.50/million = ~$210,000/month — in the right order of magnitude for " +
      "what the unoptimized baseline actually costs here. A $5,000 budget is roughly 2% of " +
      "that; no single lever gets a 40-50x reduction on its own, which is exactly why this " +
      "scenario needs the full composition, not one dial pushed further.",
  },

  reflection: {
    template:
      "{{successRate}} success at whatever the Budget row shows this run costing — if quality " +
      "passed but the bill didn't, or the bill passed but quality slipped, that's the tension " +
      "this scenario is built around. Both bars only clear together with the full stack: " +
      "cascade, quantization, edge, and a semantic cache all doing their part.",
  },

  optimalSolution: {
    summary:
      "A semantic Cache in front of a cost-optimized Model Router cascade, routing to a " +
      "quantized SLM running on the edge and a quantized LLM as the rare escalation.",
    editorial: [
      "The topology is Client -> Cache (semantic mode) -> Model Router -> two LLM Calls: an " +
        "SLM-tier one (INT4 quantization, Edge deployment) wired first, an LLM-tier one (INT8 " +
        "quantization, Cloud) wired second — the same wiring-order convention every Model " +
        "Router build uses, SLM/cheap target first.",
      "Edge deployment on the SLM target is what actually gets the bill down by an order of " +
        "magnitude beyond quantization alone — an on-device call has no per-token API charge " +
        "at all, the real economic argument this scenario is built to demonstrate rather than " +
        "assert.",
      "Cost-optimized-cascade (not confidence-cascade) is the mode that actually enforces the " +
        "budget as traffic scales — it caps what fraction of requests are allowed to escalate " +
        "to the expensive tier regardless of how many individually look like they'd benefit " +
        "from it, the literal 'budget-aware threshold' behind the 75-85% cost cut this pillar's " +
        "research describes.",
      "A common near-miss: quantizing and cascading but leaving deployment on Cloud, or " +
        "skipping the semantic Cache — either one alone still leaves the bill multiple times " +
        "over budget at this volume, even though the architecture 'looks' optimized.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 220 },
        config: { requestRate: 40, keyPoolSize: 30 },
      },
      {
        id: "cache1",
        type: "cache",
        label: "Cache",
        position: { x: 340, y: 220 },
        config: { capacity: 30, cachingMode: "semantic", semanticHitRate: 0.3 },
      },
      {
        id: "router1",
        type: "model_router",
        label: "Model Router",
        position: { x: 600, y: 220 },
        config: { mode: "cost_optimized_cascade" },
      },
      {
        id: "slm1",
        type: "llm_call",
        label: "LLM Call (SLM, Edge)",
        position: { x: 860, y: 100 },
        config: {
          tier: "slm",
          quantization: "int4",
          deploymentTarget: "edge",
          hallucinationRate: 0.03,
          schemaFailureRate: 0.02,
        },
      },
      {
        id: "llm1",
        type: "llm_call",
        label: "LLM Call (LLM, Cloud)",
        position: { x: 860, y: 340 },
        config: {
          tier: "llm",
          quantization: "int8",
          hallucinationRate: 0.03,
          schemaFailureRate: 0.02,
        },
      },
    ],
    connections: [
      { source: "client", target: "cache1", latencyMs: 5 },
      { source: "cache1", target: "router1", latencyMs: 5 },
      { source: "router1", target: "slm1", latencyMs: 5 },
      { source: "router1", target: "llm1", latencyMs: 5 },
    ],
  },
};
