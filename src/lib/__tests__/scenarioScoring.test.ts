/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { scoreScenario } from "../scenarioScoring";
import { movieTicketBooking } from "@/scenarios/movieTicketBooking";
import { runSimulation } from "@/simulation/engine/Simulator";
import type { ConnectionConfig, EntityType, SimulationConfig } from "@/simulation/types";
import type { Scenario } from "@/scenarios/types";
import type { ArchitectureNode } from "@/store/workshopStore";

function fakeNode(id: string, type: EntityType, config: Record<string, unknown>): ArchitectureNode {
  return {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: { entityType: type, label: id, config },
  } as unknown as ArchitectureNode;
}

function run(scenario: Scenario, nodes: ArchitectureNode[], connections: ConnectionConfig[]) {
  const config: SimulationConfig = {
    entities: nodes.map((n) => ({ id: n.id, type: n.data.entityType, position: n.position, config: n.data.config })),
    connections,
    scenario: { id: scenario.id, title: scenario.title, trafficPattern: scenario.trafficPattern, durationMs: scenario.durationMs },
    options: { seed: scenario.seed },
  };
  const result = runSimulation(config);
  return { result, score: scoreScenario(scenario, result, nodes, connections) };
}

describe("scoreScenario — legendary tier", () => {
  // A synthetic scenario with a deliberately weak "optimal" (unconfigured
  // defaults, no cache) — easy to beat on purpose, so this test isn't
  // chasing movieTicketBooking.ts's own genuinely-hard-to-beat numbers.
  const weakOptimalScenario: Scenario = {
    id: "test-legendary",
    title: "Test Legendary",
    difficulty: 1,
    story: "",
    startingEntities: [
      { id: "client", type: "client", label: "Client", position: { x: 0, y: 0 }, config: { requestRate: 100 } },
    ],
    startingConnections: [],
    givenNodeIds: ["client"],
    lockedFields: { client: ["requestRate"] },
    budgetUsd: 2000,
    trafficPattern: { type: "constant", rate: 100 },
    durationMs: 10_000,
    seed: 42,
    constraints: [
      { id: "success-rate", metric: "successRate", comparator: "gte", threshold: 0.95, label: "" },
      { id: "p95-latency", metric: "p95Latency", comparator: "lte", threshold: 300, label: "" },
    ],
    hints: [],
    learningGoals: [],
    optimalSolution: {
      summary: "test",
      entities: [
        { id: "client", type: "client", label: "Client", position: { x: 0, y: 0 }, config: { requestRate: 100 } },
        { id: "api", type: "api", label: "API Server", position: { x: 0, y: 0 }, config: { maxConcurrent: 20, maxQueueLength: 50, processingTimeMs: 5 } },
        { id: "database", type: "database", label: "Database", position: { x: 0, y: 0 }, config: { maxConnections: 20, maxQueueLength: 50, processingTimeMs: 5, failureProbability: 0 } },
      ],
      connections: [
        { source: "client", target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
    },
  };

  it("a build tighter than the weak reference beats it and earns 5 stars / legendary", () => {
    const nodes = [
      fakeNode("client", "client", { requestRate: 100 }),
      fakeNode("api", "api", { maxConcurrent: 3, maxQueueLength: 10, processingTimeMs: 2 }),
      fakeNode("database", "database", { maxConnections: 3, maxQueueLength: 10, processingTimeMs: 2, failureProbability: 0 }),
    ];
    const { score } = run(weakOptimalScenario, nodes, [
      { source: "client", target: "api", latencyMs: 5 },
      { source: "api", target: "database", latencyMs: 5 },
    ]);

    expect(score.gatesPassed).toBe(true);
    expect(score.optimalComposite).not.toBeNull();
    expect(score.composite).toBeGreaterThan(score.optimalComposite!);
    expect(score.legendary).toBe(true);
    expect(score.stars).toBe(5);
  });

  it("reproducing the exact reference build does not count as beating it", () => {
    const nodes = weakOptimalScenario.optimalSolution!.entities.map((e) => fakeNode(e.id, e.type, e.config));
    const { score } = run(weakOptimalScenario, nodes, weakOptimalScenario.optimalSolution!.connections);

    expect(score.gatesPassed).toBe(true);
    expect(score.legendary).toBe(false);
    expect(score.stars).toBeLessThanOrEqual(3);
  });

  it("a worse (but still passing) build never gets legendary", () => {
    const nodes = [
      fakeNode("client", "client", { requestRate: 100 }),
      fakeNode("api", "api", { maxConcurrent: 20, maxQueueLength: 50, processingTimeMs: 20 }),
      fakeNode("database", "database", { maxConnections: 20, maxQueueLength: 50, processingTimeMs: 20, failureProbability: 0 }),
    ];
    const { score } = run(weakOptimalScenario, nodes, [
      { source: "client", target: "api", latencyMs: 5 },
      { source: "api", target: "database", latencyMs: 5 },
    ]);

    expect(score.legendary).toBe(false);
    expect(score.stars).not.toBe(5);
  });

  it("a scenario with no optimalSolution never produces a legendary result", () => {
    const scenarioWithoutOptimal: Scenario = { ...weakOptimalScenario, optimalSolution: undefined };
    const nodes = [
      fakeNode("client", "client", { requestRate: 100 }),
      fakeNode("api", "api", { maxConcurrent: 20, maxQueueLength: 50, processingTimeMs: 1 }),
      fakeNode("database", "database", { maxConnections: 20, maxQueueLength: 50, processingTimeMs: 1, failureProbability: 0 }),
    ];
    const { score } = run(scenarioWithoutOptimal, nodes, [
      { source: "client", target: "api", latencyMs: 5 },
      { source: "api", target: "database", latencyMs: 5 },
    ]);

    expect(score.optimalComposite).toBeNull();
    expect(score.legendary).toBe(false);
  });
});

describe("movieTicketBooking's own optimalSolution", () => {
  // Regression guard for the numbers recorded in movieTicketBooking.ts's
  // own header comment — if this ever stops passing at 3 stars, the
  // shipped reference solution and the doc comment have drifted apart.
  it("the shipped reference solution clears every gate at 3 stars, not legendary against itself", () => {
    const solution = movieTicketBooking.optimalSolution!;
    const nodes = solution.entities.map((e) => fakeNode(e.id, e.type, e.config));
    const { score } = run(movieTicketBooking, nodes, solution.connections);

    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(3);
    expect(score.legendary).toBe(false);
  });

  // Found live while tuning URL Shortener (see docs/scenario-redesign.md):
  // wiring the Client straight to the Database, skipping the API Server
  // entirely, used to beat this scenario's own optimalSolution and score
  // "legendary" — cheaper than any real build, since API pricing is the
  // only meaningfully-taxed compute tier and nothing enforced a request
  // ever passing through one. architectureValidation.ts's generic gate
  // closes this for every budget-gated scenario, not just this one.
  it("skipping the API Server entirely no longer beats the reference — it doesn't even pass", () => {
    const nodes = [
      fakeNode("client", "client", { requestRate: 370 }),
      fakeNode("database", "database", {
        maxConnections: 15,
        maxQueueLength: 60,
        processingTimeMs: 10,
        failureProbability: 0,
      }),
    ];
    const { score } = run(movieTicketBooking, nodes, [{ source: "client", target: "database", latencyMs: 5 }]);

    expect(score.architectureValid).toBe(false);
    expect(score.gatesPassed).toBe(false);
    expect(score.stars).toBe(0);
    expect(score.legendary).toBe(false);
  });
});
