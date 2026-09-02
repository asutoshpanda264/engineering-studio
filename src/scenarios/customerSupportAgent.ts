/**
 * Customer Support Refund Agent — `docs/Agentic_AI.md` Part 4, scenario 1.
 * τ-bench-shaped: policy-following + `tool_call` use. The story's whole
 * point is a stated policy ("never issue a refund without a human
 * reviewing it first") that only an actual `human_in_loop_gate` in the
 * build enforces — this is `requiresGatedToolCalls`'s first real use (see
 * `scenarios/types.ts` and `architectureValidation.ts`'s
 * `hasUnguardedIrreversibleAction`): a build that reaches `tool_call`
 * (the refund action) without passing through a gate first hasn't solved
 * the scenario, no matter how good its metrics look.
 *
 * Only the Client is given (requestRate locked at 3 req/s — a fixed,
 * modest volume of support tickets that need a refund decision, not
 * every ticket a support team handles). Everything downstream — the
 * reasoning step, the gate, the action — is the student's design.
 *
 * TUNING NOTE (verified against the real engine, seed 100, 20s @ 3 req/s,
 * via a throwaway script, same discipline movieTicketBooking.ts's header
 * documents — deleted after use):
 *
 *   Ungated (llm_call -> tool_call directly): 87.7% success, but
 *   `requiresGatedToolCalls` fails it outright regardless — the policy
 *   violation is structural, not a metrics problem.
 *
 *   Gated, but every reliability dial left at its entityConfigSchema.ts
 *   default (llm_call hallucinationRate 3%/schemaFailureRate 2%,
 *   human_in_loop_gate denialRate 10%, tool_call failureRate 2%/
 *   schemaFailureRate 2%/hallucinatedInvocationRate 2%/silentFailureRate
 *   3%, gate maxConcurrent 5-40 swept): success plateaus at 57.9%
 *   regardless of gate capacity — capacity was never the bottleneck here.
 *   Every entity in this engine rolls its own failure checks on BOTH the
 *   request leg and the response leg (a documented, accepted
 *   simplification every entity here shares, not unique to this
 *   scenario), so a request effectively clears each dial *twice* — a
 *   10% Denial Rate compounds to roughly 19% real denial, not 10%. Left
 *   at defaults, this compounds across llm_call/gate/tool_call into a
 *   failure floor no amount of gate sizing alone can fix.
 *
 *   Gated, reliability dials tuned down (llm_call hallucinationRate 1%/
 *   schemaFailureRate 1%, gate denialRate 2%, tool_call failureRate 1%/
 *   schemaFailureRate 1%/hallucinatedInvocationRate 1%/silentFailureRate
 *   1%), gate maxConcurrent sized to 30 (the approval-latency-bound
 *   ceiling — Approval Latency 4000ms means maxConcurrent needs real
 *   headroom over 3 req/s, roughly capacity >= rate * (latencyMs/1000)):
 *   94.7% success, p95 ~10.7s (the gate's own real cost — a human review
 *   step is never going to be fast, and this scenario doesn't ask it to
 *   be). This is `optimalSolution` below.
 */

import type { Scenario } from "./types";

export const customerSupportAgent: Scenario = {
  id: "customer-support-agent",
  title: "Customer Support Refund Agent",
  difficulty: 3,
  topics: ["tool-use", "human-in-the-loop", "agentic-system-design"],
  story:
    "An e-commerce company wants an agent to handle refund requests automatically — read the " +
    "request, decide whether it's legitimate, and issue the refund. Legal and finance have " +
    "one non-negotiable policy: no refund goes out without a human actually reviewing the " +
    "agent's decision first. The agent can be as fast and as automated as engineering wants, " +
    "right up until the moment it's about to spend the company's money.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 220 },
      config: { requestRate: 3 },
    },
  ],
  startingConnections: [],
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate"] },
  requiresGatedToolCalls: true,

  trafficPattern: { type: "constant", rate: 3 },
  durationMs: 20_000,
  seed: 100,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.9,
      label: "At least 90% of refund requests reach a real outcome",
      unit: "%",
    },
  ],

  hints: [
    "\"Never issue a refund without a human reviewing it first\" is a sentence about the architecture, not a number in a config field. Which primitive actually enforces that, and where does it have to sit relative to the tool that issues the refund?",
    "Leave every reliability dial (Hallucination Rate, Denial Rate, Failure Rate, ...) at its default and this fails no matter how you size anything downstream. Every entity here rolls its own failure checks twice — once on the way out, once on the way back — so a dial reading '10%' in the Inspector is a real ~19% in practice. What happens if you actually tune those down instead of just wiring things together?",
    "Approval Latency is a real cost paid by every request that reaches the gate, not a rounding error. If a human takes 4 seconds to review a case and the gate can only review 5 cases at once, how many requests per second can it actually clear — and does that number even reach the traffic this scenario hands you?",
    "The success-rate bar doesn't care whether a request failed because a human said no or because your architecture skipped the gate entirely. Those are two very different problems with two very different fixes.",
  ],

  learningGoals: [
    "Reversibility-weighted risk, in practice: a human_in_loop_gate isn't a generic safety checkbox, it's a specific primitive that has to sit between a decision and the irreversible action that decision triggers — and this app's own architecture gate can tell the difference between 'gated' and 'not gated.'",
    "A gate's own capacity is bound by how long a real review takes, the same admit-queue-reject shape every bounded entity here already uses — sizing it means reasoning about Approval Latency × concurrent reviewers, not just cranking a number up.",
    "Every agentic entity here rolls its own reliability dials on both the request leg and the response leg — a documented, engine-wide simplification worth knowing about before it quietly doubles your effective failure rate.",
  ],

  capacityEstimate: {
    prompt:
      "The gate reviews at most Max Concurrent cases at once, each taking roughly Approval " +
      "Latency to clear. At 3 req/s arriving and a 4000ms Approval Latency, roughly how many " +
      "cases does the gate need to be able to hold open simultaneously just to keep up on " +
      "average — before a single burst is considered?",
    worked:
      "In steady state, the number of cases in flight at once is arrival rate × time each one " +
      "takes: 3 req/s × 4s = 12. Max Concurrent needs real headroom above that raw number, not " +
      "just enough to match it exactly — a pool sized to the bare average has nowhere for a " +
      "burst to go but the queue, then rejection, the same lesson every other bounded entity " +
      "in this app already teaches, just with a human's review time standing in for a query's.",
  },

  reflection: {
    template:
      "This run landed at {{successRate}} success with a p95 latency of {{p95Latency}} — and " +
      "that latency number is not a bug to chase down. A real human reviewing a real refund " +
      "request takes real time; a fast-looking refund agent that skips the review isn't a " +
      "better architecture, it's a policy violation the metrics can't see but the architecture " +
      "gate can.",
  },

  optimalSolution: {
    summary:
      "A tuned llm_call deciding, gated by a properly-sized human_in_loop_gate, before a tuned " +
      "tool_call actually issues the refund.",
    editorial: [
      "The policy itself only has one correct shape: llm_call decides, human_in_loop_gate " +
        "reviews, tool_call acts — in that order, with nothing skipping the middle step. " +
        "There's no config value that substitutes for actually wiring the gate in; the " +
        "architecture check fails a build that reaches the refund tool_call any other way, " +
        "regardless of how good its numbers look.",
      "Once the gate is wired in, the next failure mode is subtler: every default reliability " +
        "dial left untouched compounds into a real failure floor, because every entity here " +
        "rolls its own checks on both the outbound and the response leg. Tuning Hallucination " +
        "Rate, Denial Rate, and the tool's own failure dials down isn't cosmetic here — it's " +
        "the difference between a passing build and one stuck under 60% success no matter how " +
        "the gate is sized.",
      "The gate's own capacity is the last real lever: Approval Latency is a fixed cost per " +
        "case, and Max Concurrent has to hold enough cases open at once to actually absorb the " +
        "traffic this scenario hands you, not just the bare average.",
      "A common near-miss: sizing the gate generously but leaving Denial Rate and the tool's " +
        "own dials at their defaults, assuming capacity was the only thing standing between a " +
        "failing and a passing build. It isn't — both have to be addressed.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 220 },
        config: { requestRate: 3 },
      },
      {
        id: "llm1",
        type: "llm_call",
        label: "LLM Call",
        position: { x: 380, y: 220 },
        config: { hallucinationRate: 0.01, schemaFailureRate: 0.01 },
      },
      {
        id: "gate1",
        type: "human_in_loop_gate",
        label: "Human-in-the-Loop Gate",
        position: { x: 680, y: 220 },
        config: {
          approvalLatencyMs: 4000,
          approvalLatencyJitterMs: 1000,
          denialRate: 0.02,
          maxConcurrent: 30,
        },
      },
      {
        id: "tool1",
        type: "tool_call",
        label: "Tool Call",
        position: { x: 980, y: 220 },
        config: {
          failureRate: 0.01,
          schemaFailureRate: 0.01,
          hallucinatedInvocationRate: 0.01,
          silentFailureRate: 0.01,
        },
      },
    ],
    connections: [
      { source: "client", target: "llm1", latencyMs: 5 },
      { source: "llm1", target: "gate1", latencyMs: 5 },
      { source: "gate1", target: "tool1", latencyMs: 5 },
    ],
  },
};
