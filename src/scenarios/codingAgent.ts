/**
 * Autonomous Coding Agent — `docs/Agentic_AI.md` Part 4, scenario 2.
 * Claude-Code-shaped: a sandboxed `tool_call` loop with deny-first
 * config, reversibility-weighted gating exercised directly via
 * `human_in_loop_gate` before the one genuinely destructive action
 * (deploying the change) — see §1.9's own framing of Claude Code's real
 * design: "deny-first with human escalation... an irreversible action
 * gets a harder gate than a reversible one."
 *
 * "Deny-first" here is literal, not just a vibe: Max Iterations on the
 * Agent Orchestrator is the actual dial that bounds how much a failed
 * attempt gets retried before the whole session gives up — low means the
 * loop fails fast on a genuinely broken attempt rather than burning an
 * unbounded number of retries against it (docs/Agentic_AI.md §1.7's
 * failure mode #5, the infinite retry loop, made concrete). This
 * scenario's second constraint checks Total Iterations directly — the
 * exact Phase 5 metric that exists specifically to surface this.
 *
 * TUNING NOTE (verified against the real engine, seed 200, 20s @ 1.5
 * req/s, via a throwaway script, deleted after use):
 *
 *   Ungated (guardrail_validator -> tool_call directly): fails
 *   `requiresGatedToolCalls` outright regardless of its metrics.
 *
 *   Gated, every dial at its default (llm_call hallucinationRate 2%/
 *   schemaFailureRate 2%, guardrail_validator rejectionRate 25% default,
 *   gate denialRate 10%, tool_call dials at default), Max Concurrent 5 on
 *   the gate: 64.7% success. The gate's own response-leg double-roll
 *   (same engine-wide simplification customerSupportAgent.ts's own header
 *   documents) compounds with the guardrail's real 25%+ rejection rate to
 *   push failure well past what capacity sizing alone can fix.
 *
 *   Gated, tuned (llm_call hallucinationRate 1%/schemaFailureRate 1%,
 *   guardrail_validator rejectionRate 15%, gate denialRate 2%/
 *   maxConcurrent 15, tool_call dials at 1% each), Max Iterations 3
 *   (deny-first — not 1, which would fail fast on transient noise too
 *   aggressively; not 8, which passes but lets Total Iterations balloon
 *   to 62): 97.1% success, Total Iterations 12, guardrailRejectionRate
 *   ~13.8%. This is `optimalSolution` below.
 */

import type { Scenario } from "./types";

export const codingAgent: Scenario = {
  id: "coding-agent",
  title: "Autonomous Coding Agent",
  difficulty: 4,
  topics: ["tool-use", "human-in-the-loop", "agentic-system-design"],
  story:
    "An engineering team wants an agent that can take a small code-change request, write and " +
    "test the change itself, and — only once it's confident and a human has actually signed " +
    "off — deploy it. Writing and testing code is cheap and fully reversible; deploying it " +
    "isn't. The team wants the agent to iterate freely on the cheap part and stop hard before " +
    "the expensive one.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 220 },
      config: { requestRate: 1.5 },
    },
  ],
  startingConnections: [],
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate"] },
  requiresGatedToolCalls: true,

  trafficPattern: { type: "constant", rate: 1.5 },
  durationMs: 20_000,
  seed: 200,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.9,
      label: "At least 90% of change requests reach a real outcome",
      unit: "%",
    },
    {
      id: "total-iterations",
      metric: "totalIterations",
      comparator: "lte",
      threshold: 20,
      label: "Total Iterations stays bounded — deny-first, not retry-forever",
    },
  ],

  hints: [
    "Reflection (llm_call -> guardrail_validator, wrapped in a Sequential Agent Orchestrator) is the iterate-and-test loop; the deploy itself needs a second, harder gate after it — the same 'not every action deserves the same check' idea customerSupportAgent teaches, now with two different actions in one build.",
    "Max Iterations isn't just 'how many tries before giving up' — a high value passes more often but lets one flaky session cause a real pile of downstream retries. What does the Total Iterations constraint actually measure, and what does a 'deny-first' agent's number look like next to a lenient one's?",
    "Every dial here doubles its effective rate across the request and response leg, the same as every other entity in this domain — a Rejection Rate or Denial Rate that reads reasonable in the Inspector can still be the reason a wired-correctly build fails.",
    "The gate's own Approval Latency and Max Concurrent matter here too, same math as any other approval-latency-bound entity: how many deploys can one reviewer clear per second at this traffic?",
  ],

  learningGoals: [
    "Claude Code's own real design in one sentence: iterate freely and cheaply where mistakes are reversible, gate hard exactly once before the one action that isn't — not a uniform check applied everywhere.",
    "Max Iterations is a genuine trade-off, not a free dial: too low fails fast on transient noise, too high hides a real cost (this scenario's own Total Iterations metric) behind a passing success rate.",
    "Reflection's retry loop and the irreversible-action gate are two independently-composed primitives, not one mechanism — a session can retry the cheap part as many times as its budget allows while still only ever reaching the expensive part once, gated.",
  ],

  capacityEstimate: {
    prompt:
      "At 1.5 req/s and a Guardrail Validator Rejection Rate around 15%, roughly how many " +
      "llm_call attempts per second does a Sequential Agent Orchestrator's retry loop actually " +
      "generate against the guardrail, before any of it reaches the gate at all?",
    worked:
      "Most sessions pass on the first or second attempt at a real ~15-25% effective rejection " +
      "rate (doubled by the request/response-leg roll, so a configured 15% reads closer to " +
      "28% in practice) — call it roughly 1.3-1.5x the raw 1.5 req/s reaching the guardrail per " +
      "second on average, once retries are folded in. That's still comfortably inside every " +
      "entity's default capacity here; the real constraint this scenario is testing is Total " +
      "Iterations staying bounded, not raw throughput.",
  },

  reflection: {
    template:
      "{{successRate}} success with {{totalIterations}} total iterations across the whole run — " +
      "read those two numbers together, not separately. A build that passes on success rate " +
      "alone by retrying aggressively is hiding its real cost in the iteration count; a build " +
      "that's both reliable *and* bounded is the one that actually earned the 'deny-first' " +
      "label.",
  },

  optimalSolution: {
    summary:
      "A tuned Reflection loop (Agent Orchestrator -> LLM Call -> Guardrail Validator) with a " +
      "modest Max Iterations, gated by a human_in_loop_gate before the one Tool Call that " +
      "deploys.",
    editorial: [
      "The shape is Reflection, plus one more gate: Client -> Agent Orchestrator (Sequential) " +
        "-> LLM Call -> Guardrail Validator -> Human-in-the-Loop Gate -> Tool Call. The " +
        "orchestrator's own existing retry mechanism (from Phase 2/3) handles the 'iterate " +
        "until tests pass' part for free — a rejected guardrail check propagates back through " +
        "llm_call to the orchestrator, which retries in place, no new orchestration logic " +
        "needed.",
      "Max Iterations at 3 is the deliberate middle: low enough that Total Iterations stays " +
        "well under this scenario's own 20 bound, high enough to actually absorb the " +
        "guardrail's real rejection rate without failing sessions that would have passed on a " +
        "second try.",
      "Every reliability dial tuned down together is what gets success rate from the 60s into " +
        "the high 90s — Hallucination/Schema Failure Rate on the LLM Call, Denial Rate on the " +
        "gate, and the Tool Call's own four failure dials all compound, the same lesson " +
        "customerSupportAgent teaches, now stacked on top of a genuine retry loop.",
      "A common near-miss: raising Max Iterations instead of tuning the reliability dials, " +
        "since more retries does eventually push success rate up. It also blows straight " +
        "through the Total Iterations bound — a lenient Max Iterations of 8 on this same " +
        "traffic reaches 62 total iterations, more than 3x this scenario's own limit, even " +
        "while passing on success rate alone.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 220 },
        config: { requestRate: 1.5 },
      },
      {
        id: "orch1",
        type: "agent_orchestrator",
        label: "Agent Orchestrator",
        position: { x: 340, y: 220 },
        config: { routingMode: "sequential", maxIterations: 3, maxConcurrent: 20 },
      },
      {
        id: "llm1",
        type: "llm_call",
        label: "LLM Call",
        position: { x: 600, y: 220 },
        config: { hallucinationRate: 0.01, schemaFailureRate: 0.01, processingTimeMs: 300 },
      },
      {
        id: "guard1",
        type: "guardrail_validator",
        label: "Guardrail Validator",
        position: { x: 860, y: 220 },
        config: { mode: "gate", rejectionRate: 0.15, processingTimeMs: 100 },
      },
      {
        id: "gate1",
        type: "human_in_loop_gate",
        label: "Human-in-the-Loop Gate",
        position: { x: 1120, y: 220 },
        config: {
          approvalLatencyMs: 3000,
          approvalLatencyJitterMs: 800,
          denialRate: 0.02,
          maxConcurrent: 15,
        },
      },
      {
        id: "tool1",
        type: "tool_call",
        label: "Tool Call",
        position: { x: 1380, y: 220 },
        config: {
          failureRate: 0.01,
          schemaFailureRate: 0.01,
          hallucinatedInvocationRate: 0.01,
          silentFailureRate: 0.01,
        },
      },
    ],
    connections: [
      { source: "client", target: "orch1", latencyMs: 5 },
      { source: "orch1", target: "llm1", latencyMs: 5 },
      { source: "llm1", target: "guard1", latencyMs: 5 },
      { source: "guard1", target: "gate1", latencyMs: 5 },
      { source: "gate1", target: "tool1", latencyMs: 5 },
    ],
  },
};
