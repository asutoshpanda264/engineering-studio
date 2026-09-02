/**
 * Autonomous Ops Agent — `docs/Agentic_AI.md` Part 4, scenario 4.
 * Orchestrator-Worker + Multi-Agent Collaboration in one build:
 * `orchA` (Parallel mode) fans out to a read-only Retriever pulling
 * diagnostics and a peer `orchB` — a second Agent Orchestrator, not a
 * plain worker — which itself runs a Sequential decide -> gate -> act
 * chain. Two Agent Orchestrators wired as peers is exactly
 * `AgentOrchestrator.ts`'s own documented Multi-Agent Collaboration
 * shape; orchA's Parallel fan-out to two independent targets is
 * Orchestrator-Worker. `human_in_loop_gate` sits directly before the
 * one Tool Call that performs a real production action (restart,
 * rollback, ...) — the diagnostics stay a read-only Retriever
 * specifically so this scenario has exactly one tool_call in the whole
 * build, keeping `requiresGatedToolCalls`'s "every tool_call must be
 * gated" check exact rather than needing a per-node exemption list.
 *
 * Only the Client is given. §1.7's failure mode #7 (error cascade — "an
 * unverified worker result trusted downstream") is this scenario's
 * villain-attack framing, taught via hints/learning goals rather than a
 * hard constraint: nothing here stops a student from wiring the
 * Retriever's result straight into the decision without a
 * Guardrail Validator checking it first, and that's deliberate — the
 * lesson is noticing the gap, not being blocked from building it.
 *
 * TUNING NOTE (verified against the real engine, seed 400, 20s @ 4
 * req/s, via a throwaway script, deleted after use):
 *
 *   Ungated (llm_call -> tool_call directly inside orchB): 100% success,
 *   but fails `requiresGatedToolCalls` outright — the architecture
 *   violation is structural, independent of the metrics.
 *   Gated, gate Max Concurrent left at its default (5): 100% success but
 *   p95 64.9s — the approval-latency-bound ceiling this scenario's own
 *   p95 constraint is built to catch.
 *   Gated, gate Max Concurrent sized to 20: 100% success, p95 16.0s.
 *   This is `optimalSolution` below.
 */

import type { Scenario } from "./types";

export const autonomousOpsAgent: Scenario = {
  id: "autonomous-ops-agent",
  title: "Autonomous Ops Agent",
  difficulty: 5,
  topics: ["multi-agent-orchestration", "human-in-the-loop", "agentic-system-design"],
  story:
    "An SRE team wants an agent that responds to production incidents on its own: pull the " +
    "relevant diagnostics, hand the incident to a decision-making peer agent, and — once a " +
    "human has actually signed off — take the corrective action (a restart, a rollback, " +
    "whatever the incident calls for). Diagnostics are read-only and safe to run freely; the " +
    "corrective action is not, and needs the same real review this team would want before any " +
    "human engineer touched production at 3am.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 220 },
      config: { requestRate: 4 },
    },
  ],
  startingConnections: [],
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate"] },
  requiresGatedToolCalls: true,

  trafficPattern: { type: "constant", rate: 4 },
  durationMs: 20_000,
  seed: 400,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of incidents reach a real outcome",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 25_000,
      label: "95% of incidents resolve within 25s",
      unit: "ms",
    },
  ],

  hints: [
    "Two Agent Orchestrators wired as peers — one dispatching to the other, not through a shared parent — is Multi-Agent Collaboration, per this app's own primitive. What does the first orchestrator's Routing Mode need to be, to run diagnostics and hand off to its peer at the same time rather than one after the other?",
    "The corrective action is the only irreversible thing in this whole build — everything else (pulling diagnostics, deciding) is investigation, not action. Where's the one place a human_in_loop_gate actually needs to sit?",
    "A p95 latency this high isn't automatically wrong — a real human review takes real time. But there's a real difference between 'the review itself is slow' and 'requests are queueing behind a reviewer pool that's too small for the traffic.' Which one is this?",
    "Nothing stops you from wiring the diagnostic Retriever's result straight into the decision with no check on it. What happens to a hallucinated or wrong diagnostic result under that build, versus one with a Guardrail Validator in between?",
  ],

  learningGoals: [
    "Orchestrator-Worker and Multi-Agent Collaboration aren't mutually exclusive patterns — a real system composes them: one orchestrator's 'worker' can itself be another orchestrator running its own internal chain.",
    "Reversibility-weighted risk again, at multi-agent scale: read-only investigation stays ungated and can run freely; the one real action gets the one real gate, not a blanket check applied everywhere.",
    "An unverified result trusted downstream (docs/Agentic_AI.md's error-cascade failure mode) is a wiring gap, not a metrics failure — a build can pass every constraint here while still having no check between a diagnostic result and the decision that acts on it.",
  ],

  capacityEstimate: {
    prompt:
      "The gate's Approval Latency defaults to 3000ms. At 4 req/s of incidents needing a human " +
      "decision, roughly how many reviews does the gate need to hold open at once just to keep " +
      "up with the average arrival rate?",
    worked:
      "4 req/s x 3s = 12 reviews in flight on average — Max Concurrent needs real headroom " +
      "above that raw number (not exactly 12) to absorb any burst without the backlog growing " +
      "unbounded, the same admit-queue-reject reasoning every bounded entity in this app " +
      "already uses.",
  },

  reflection: {
    template:
      "{{successRate}} success at a p95 of {{p95Latency}} — if that latency number is well " +
      "above what a human reviewer's own delay explains, the gate is queueing, not reviewing. " +
      "Check Max Concurrent before assuming Approval Latency itself is the problem.",
  },

  optimalSolution: {
    summary:
      "One orchestrator fanning out (Parallel) to a read-only diagnostics Retriever and a peer " +
      "orchestrator, which itself decides, gates, then acts — Orchestrator-Worker and " +
      "Multi-Agent Collaboration composed in one build.",
    editorial: [
      "orchA (Parallel mode) dispatches to two targets at once: ret1, a Retriever pulling " +
        "diagnostics, and orchB, a second Agent Orchestrator running its own internal chain. " +
        "That's Orchestrator-Worker (the parallel fan-out) and Multi-Agent Collaboration (a " +
        "peer orchestrator as one of the workers) in the same topology, not two separate " +
        "builds.",
      "orchB (Sequential mode) is where the actual decision happens: LLM Call decides, " +
        "Human-in-the-Loop Gate reviews, Tool Call acts. This is the only tool_call anywhere " +
        "in the build — diagnostics stay read-only on purpose, so there's exactly one action " +
        "that needs gating and it's gated.",
      "Gate Max Concurrent at 20 is what actually clears the p95 constraint — the default of 5 " +
        "still passes on success rate (nothing here rejects outright, everything just queues), " +
        "but its p95 balloons past 60 seconds. Sizing the gate for real traffic, not just " +
        "leaving it at whatever the Inspector defaults to, is the whole difference.",
      "A common near-miss: wiring ret1's diagnostic result straight into orchB's decision with " +
        "nothing checking it first. This build passes every constraint here without a " +
        "Guardrail Validator in that path — worth building once with one anyway, to see how a " +
        "bad diagnostic result gets caught at the boundary instead of silently driving the " +
        "wrong action.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 220 },
        config: { requestRate: 4 },
      },
      {
        id: "orchA",
        type: "agent_orchestrator",
        label: "Agent Orchestrator (Diagnostics)",
        position: { x: 380, y: 220 },
        config: { routingMode: "parallel", maxConcurrent: 20 },
      },
      {
        id: "ret1",
        type: "retriever",
        label: "Retriever",
        position: { x: 680, y: 80 },
        config: { mode: "pipeline", missRate: 0.05 },
      },
      {
        id: "orchB",
        type: "agent_orchestrator",
        label: "Agent Orchestrator (Decision)",
        position: { x: 680, y: 320 },
        config: { routingMode: "sequential", maxConcurrent: 20 },
      },
      {
        id: "llm1",
        type: "llm_call",
        label: "LLM Call",
        position: { x: 940, y: 320 },
        config: { hallucinationRate: 0.03, schemaFailureRate: 0.02 },
      },
      {
        id: "gate1",
        type: "human_in_loop_gate",
        label: "Human-in-the-Loop Gate",
        position: { x: 1200, y: 320 },
        config: {
          approvalLatencyMs: 3000,
          approvalLatencyJitterMs: 800,
          denialRate: 0.05,
          maxConcurrent: 20,
        },
      },
      {
        id: "tool1",
        type: "tool_call",
        label: "Tool Call",
        position: { x: 1460, y: 320 },
        config: { failureRate: 0.02, schemaFailureRate: 0.02 },
      },
    ],
    connections: [
      { source: "client", target: "orchA", latencyMs: 5 },
      { source: "orchA", target: "ret1", latencyMs: 5 },
      { source: "orchA", target: "orchB", latencyMs: 5 },
      { source: "orchB", target: "llm1", latencyMs: 5 },
      { source: "llm1", target: "gate1", latencyMs: 5 },
      { source: "gate1", target: "tool1", latencyMs: 5 },
    ],
  },
};
