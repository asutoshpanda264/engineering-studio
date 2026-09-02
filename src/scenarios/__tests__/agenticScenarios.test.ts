/**
 * @vitest-environment node
 *
 * Phase 6's five agentic scenarios, tested together with Phase 5's new
 * metrics and reliability engine — not just "does this scenario's
 * reference solution pass," but "do the Phase 5 primitives (Total
 * Iterations, Guardrail Rejection Rate, the pass^k reliability score)
 * actually do real work when composed with Phase 6's scenario/validator
 * layer," the way a student's own build will exercise them together.
 *
 * fakeNode/run mirror scenarioScoring.test.ts's own helpers exactly
 * (same DEFAULT_CONNECTION_LATENCY_MS-forcing `run`, since that's what a
 * real Workshop simulation always uses regardless of what latencyMs a
 * scenario's own connections are authored with).
 */
import { describe, expect, it } from "vitest";
import type { EntityType, SimulationConfig } from "@/simulation/types";
import type { ArchitectureNode } from "@/store/workshopStore";
import { runSimulation } from "@/simulation/engine/Simulator";
import { scoreScenario } from "@/lib/scenarioScoring";
import { hasUnguardedIrreversibleAction } from "@/lib/architectureValidation";
import { computeReliabilityScore } from "@/simulation/engine/reliabilityScore";
import { evaluateScenario } from "@/scenarios/validator";
import { DEFAULT_CONNECTION_LATENCY_MS } from "@/lib/simulationDefaults";
import { customerSupportAgent } from "@/scenarios/customerSupportAgent";
import { codingAgent } from "@/scenarios/codingAgent";
import { researchAssistant } from "@/scenarios/researchAssistant";
import { autonomousOpsAgent } from "@/scenarios/autonomousOpsAgent";
import { costConstrainedEdgeAssistant } from "@/scenarios/costConstrainedEdgeAssistant";
import type { Scenario } from "@/scenarios/types";
import type { ConnectionConfig } from "@/simulation/types";

function fakeNode(id: string, type: EntityType, config: Record<string, unknown>): ArchitectureNode {
  return {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: { entityType: type, label: id, config },
  } as unknown as ArchitectureNode;
}

function run(scenario: Scenario, nodes: ArchitectureNode[], connections: ConnectionConfig[]) {
  const liveConnections = connections.map((c) => ({ ...c, latencyMs: DEFAULT_CONNECTION_LATENCY_MS }));
  const config: SimulationConfig = {
    entities: nodes.map((n) => ({ id: n.id, type: n.data.entityType, position: n.position, config: n.data.config })),
    connections: liveConnections,
    scenario: { id: scenario.id, title: scenario.title, trafficPattern: scenario.trafficPattern, durationMs: scenario.durationMs },
    options: { seed: scenario.seed },
  };
  const result = runSimulation(config);
  return { config, result, score: scoreScenario(scenario, result, nodes, liveConnections) };
}

function optimalConfig(scenario: Scenario): SimulationConfig {
  const solution = scenario.optimalSolution!;
  return {
    entities: solution.entities.map(({ id, type, position, config }) => ({ id, type, position, config })),
    connections: solution.connections,
    scenario: { id: scenario.id, title: scenario.title, trafficPattern: scenario.trafficPattern, durationMs: scenario.durationMs },
    options: { seed: scenario.seed },
  };
}

function describeOptimalSolutionRegression(scenario: Scenario, expectedStars: 0 | 1 | 2 | 3 | 5) {
  it(`the shipped reference solution clears every gate at ${expectedStars} star(s), not legendary against itself`, () => {
    const solution = scenario.optimalSolution!;
    const nodes = solution.entities.map((e) => fakeNode(e.id, e.type, e.config));
    const { score } = run(scenario, nodes, solution.connections);

    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(expectedStars);
    expect(score.legendary).toBe(false);
  });
}

describe("agentic scenarios — each optimalSolution's own regression guard", () => {
  describeOptimalSolutionRegression(customerSupportAgent, 3);
  describeOptimalSolutionRegression(codingAgent, 3);
  describeOptimalSolutionRegression(researchAssistant, 3);
  describeOptimalSolutionRegression(autonomousOpsAgent, 2);
  describeOptimalSolutionRegression(costConstrainedEdgeAssistant, 3);
});

describe("requiresGatedToolCalls — the reversibility-weighted-risk architecture gate", () => {
  it("customerSupportAgent: a build that reaches tool_call without a human_in_loop_gate fails architectureValid, even with good metrics", () => {
    const nodes = [
      fakeNode("client", "client", { requestRate: 3 }),
      fakeNode("llm1", "llm_call", { hallucinationRate: 0.01, schemaFailureRate: 0.01 }),
      fakeNode("tool1", "tool_call", { failureRate: 0.01, schemaFailureRate: 0.01 }),
    ];
    const connections: ConnectionConfig[] = [
      { source: "client", target: "llm1" },
      { source: "llm1", target: "tool1" },
    ];
    const { score, result } = run(customerSupportAgent, nodes, connections);

    expect(hasUnguardedIrreversibleAction(nodes, connections)).toBe(true);
    expect(score.architectureValid).toBe(false);
    expect(score.gatesPassed).toBe(false);
    // The metrics themselves are fine — this is a structural failure, not a metrics one.
    expect(result.metrics.successRate).toBeGreaterThan(0.8);
  });

  it("codingAgent: the shipped reference solution's gate genuinely satisfies the check", () => {
    const solution = codingAgent.optimalSolution!;
    const nodes = solution.entities.map((e) => fakeNode(e.id, e.type, e.config));
    expect(hasUnguardedIrreversibleAction(nodes, solution.connections)).toBe(false);
  });

  it("autonomousOpsAgent: removing the gate (tool_call wired straight to the decision) fails the architecture check", () => {
    const solution = autonomousOpsAgent.optimalSolution!;
    const withoutGate = solution.entities.filter((e) => e.type !== "human_in_loop_gate");
    const nodes = withoutGate.map((e) => fakeNode(e.id, e.type, e.config));
    const connections: ConnectionConfig[] = solution.connections
      .filter((c) => c.source !== "gate1" && c.target !== "gate1")
      .concat([{ source: "llm1", target: "tool1" }]);

    expect(hasUnguardedIrreversibleAction(nodes, connections)).toBe(true);
  });
});

describe("costConstrainedEdgeAssistant — budget gate composes with the quality floor", () => {
  it("an always-LLM, unquantized, cloud baseline clears the quality floor but blows the budget by nearly 40x", () => {
    const nodes = [
      fakeNode("client", "client", { requestRate: 40 }),
      fakeNode("router1", "model_router", { mode: "always_llm" }),
      fakeNode("slm1", "llm_call", { tier: "slm" }),
      fakeNode("llm1", "llm_call", { tier: "llm" }),
    ];
    const connections: ConnectionConfig[] = [
      { source: "client", target: "router1" },
      { source: "router1", target: "slm1" },
      { source: "router1", target: "llm1" },
    ];
    const { score, result } = run(costConstrainedEdgeAssistant, nodes, connections);

    expect(result.metrics.successRate).toBeGreaterThan(0.9);
    expect(score.budgetPassed).toBe(false);
    expect(score.actualCostUsd).toBeGreaterThan(costConstrainedEdgeAssistant.budgetUsd! * 5);
    expect(score.gatesPassed).toBe(false);
  });

  it("the shipped reference solution (cascade + quantization + edge + semantic cache) clears both bars at once", () => {
    const solution = costConstrainedEdgeAssistant.optimalSolution!;
    const nodes = solution.entities.map((e) => fakeNode(e.id, e.type, e.config));
    const { score } = run(costConstrainedEdgeAssistant, nodes, solution.connections);

    expect(score.budgetPassed).toBe(true);
    expect(score.actualCostUsd).toBeLessThan(costConstrainedEdgeAssistant.budgetUsd!);
    expect(score.gatesPassed).toBe(true);
  });
});

describe("codingAgent — Total Iterations (Phase 5) feeds directly into the Phase 6 constraint", () => {
  it("the shipped reference solution's real totalIterations metric clears the deny-first bound", () => {
    const result = runSimulation(optimalConfig(codingAgent));
    expect(typeof result.metrics.totalIterations).toBe("number");

    const evaluation = evaluateScenario(codingAgent, result.metrics);
    const iterationsResult = evaluation.results.find((r) => r.constraint.id === "total-iterations")!;
    expect(iterationsResult.actual).toBe(result.metrics.totalIterations);
    expect(iterationsResult.passed).toBe(true);
    expect(evaluation.passed).toBe(true);
  });

  it("a lenient Max Iterations + a laxer guardrail blows through the same bound even while passing on success rate alone", () => {
    const solution = codingAgent.optimalSolution!;
    const lenientEntities = solution.entities.map((e) => {
      if (e.id === "orch1") return { ...e, config: { ...e.config, maxIterations: 10 } };
      if (e.id === "guard1") return { ...e, config: { ...e.config, rejectionRate: 0.4 } };
      return e;
    });
    const config: SimulationConfig = {
      entities: lenientEntities.map(({ id, type, position, config }) => ({ id, type, position, config })),
      connections: solution.connections,
      scenario: { id: codingAgent.id, title: codingAgent.title, trafficPattern: codingAgent.trafficPattern, durationMs: codingAgent.durationMs },
      options: { seed: codingAgent.seed },
    };
    const result = runSimulation(config);
    const evaluation = evaluateScenario(codingAgent, result.metrics);
    const iterationsResult = evaluation.results.find((r) => r.constraint.id === "total-iterations")!;

    // The lenient build's own totalIterations genuinely exceeds the bound —
    // this is the real Phase 5 metric doing real discriminating work, not
    // a fixture asserting what it's told to.
    expect(iterationsResult.actual).toBeGreaterThan(20);
    expect(iterationsResult.passed).toBe(false);
    expect(evaluation.passed).toBe(false);
  });
});

describe("Phase 5's pass^k reliability score, run against Phase 6's scenario configs", () => {
  it("customerSupportAgent's reference solution is reliable across seeds", () => {
    const score = computeReliabilityScore(optimalConfig(customerSupportAgent), {
      seeds: 8,
      successRateThreshold: 0.85,
    });
    expect(score.passingSeeds).toBeGreaterThanOrEqual(6);
  });

  it("codingAgent's reference solution is reliable across seeds", () => {
    const score = computeReliabilityScore(optimalConfig(codingAgent), {
      seeds: 8,
      successRateThreshold: 0.85,
    });
    expect(score.passingSeeds).toBeGreaterThanOrEqual(6);
  });

  it("a build with every reliability dial left at its default is measurably less reliable than the tuned reference, same architecture otherwise", () => {
    const solution = customerSupportAgent.optimalSolution!;
    const untunedEntities = solution.entities.map((e) => {
      if (e.type === "llm_call") return { ...e, config: {} };
      if (e.type === "human_in_loop_gate") return { ...e, config: { maxConcurrent: 40 } };
      if (e.type === "tool_call") return { ...e, config: {} };
      return e;
    });
    const untunedConfig: SimulationConfig = {
      entities: untunedEntities.map(({ id, type, position, config }) => ({ id, type, position, config })),
      connections: solution.connections,
      scenario: {
        id: customerSupportAgent.id,
        title: customerSupportAgent.title,
        trafficPattern: customerSupportAgent.trafficPattern,
        durationMs: customerSupportAgent.durationMs,
      },
      options: { seed: customerSupportAgent.seed },
    };

    const tuned = computeReliabilityScore(optimalConfig(customerSupportAgent), { seeds: 8, successRateThreshold: 0.85 });
    const untuned = computeReliabilityScore(untunedConfig, { seeds: 8, successRateThreshold: 0.85 });

    expect(tuned.passingSeeds).toBeGreaterThan(untuned.passingSeeds);
  });
});
