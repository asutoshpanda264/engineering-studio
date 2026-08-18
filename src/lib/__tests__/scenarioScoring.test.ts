/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { scoreScenario } from "../scenarioScoring";
import { movieTicketBooking } from "@/scenarios/movieTicketBooking";
import { priceAlertNotifications } from "@/scenarios/priceAlertNotifications";
import { internalAdminDashboard } from "@/scenarios/internalAdminDashboard";
import { trendingHashtagsFeed } from "@/scenarios/trendingHashtagsFeed";
import { iotSensorIngestion } from "@/scenarios/iotSensorIngestion";
import { concertTicketDrop } from "@/scenarios/concertTicketDrop";
import { slowSearchEndpoint } from "@/scenarios/slowSearchEndpoint";
import { viralVideoComments } from "@/scenarios/viralVideoComments";
import { adAuctionBidding } from "@/scenarios/adAuctionBidding";
import { checkoutTimeoutMystery } from "@/scenarios/checkoutTimeoutMystery";
import { recipeOfTheDay } from "@/scenarios/recipeOfTheDay";
import { newsletterSendConfirmations } from "@/scenarios/newsletterSendConfirmations";
import { weatherForecastApi } from "@/scenarios/weatherForecastApi";
import { warehouseInventorySync } from "@/scenarios/warehouseInventorySync";
import { liveSportsScoreboard } from "@/scenarios/liveSportsScoreboard";
import { rideHailingLocationPings } from "@/scenarios/rideHailingLocationPings";
import { flightStatusPushUpdates } from "@/scenarios/flightStatusPushUpdates";
import { globalLeaderboardUpdates } from "@/scenarios/globalLeaderboardUpdates";
import { couponCodeRedemption } from "@/scenarios/couponCodeRedemption";
import { fitnessTrackerStepSync } from "@/scenarios/fitnessTrackerStepSync";
import { apiGatewaySlowdown } from "@/scenarios/apiGatewaySlowdown";
import { wildfireAlertBroadcast } from "@/scenarios/wildfireAlertBroadcast";
import { trendingProductSearch } from "@/scenarios/trendingProductSearch";
import { publicTransitTrackerApi } from "@/scenarios/publicTransitTrackerApi";
import { runSimulation } from "@/simulation/engine/Simulator";
import type { ConnectionConfig, EntityType, SimulationConfig } from "@/simulation/types";
import type { Scenario } from "@/scenarios/types";
import type { ArchitectureNode } from "@/store/workshopStore";
import { DEFAULT_CONNECTION_LATENCY_MS } from "@/lib/simulationDefaults";

function fakeNode(id: string, type: EntityType, config: Record<string, unknown>): ArchitectureNode {
  return {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: { entityType: type, label: id, config },
  } as unknown as ArchitectureNode;
}

function run(
  scenario: Scenario,
  nodes: ArchitectureNode[],
  connections: ConnectionConfig[],
  ignoreBudget = false
) {
  // Mirrors workshopBridge.ts's buildSimulationConfig, which applies
  // DEFAULT_CONNECTION_LATENCY_MS to every edge *unconditionally* —
  // ignoring whatever latencyMs a connection is authored with — since
  // that's what a real student's live simulation always actually uses.
  // A scenario "verified against the real engine" at 0ms was never
  // actually verified against what ships; see simulationDefaults.ts.
  const liveConnections = connections.map((c) => ({ ...c, latencyMs: DEFAULT_CONNECTION_LATENCY_MS }));
  const config: SimulationConfig = {
    entities: nodes.map((n) => ({ id: n.id, type: n.data.entityType, position: n.position, config: n.data.config })),
    connections: liveConnections,
    scenario: { id: scenario.id, title: scenario.title, trafficPattern: scenario.trafficPattern, durationMs: scenario.durationMs },
    options: { seed: scenario.seed },
  };
  const result = runSimulation(config);
  return { result, score: scoreScenario(scenario, result, nodes, liveConnections, ignoreBudget) };
}

describe("scoreScenario — legendary tier", () => {
  // A synthetic scenario with a deliberately weak "optimal" (unconfigured
  // defaults, no cache) — easy to beat on purpose, so this test isn't
  // chasing movieTicketBooking.ts's own genuinely-hard-to-beat numbers.
  const weakOptimalScenario: Scenario = {
    id: "test-legendary",
    title: "Test Legendary",
    difficulty: 1,
    topics: ["system-design"],
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
      editorial: ["test"],
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

describe("priceAlertNotifications's own optimalSolution", () => {
  // Regression guard for the numbers recorded in
  // priceAlertNotifications.ts's own header comment. Also the one test in
  // this codebase that exercises a `burst` (not `constant`) trafficPattern
  // through the full scoring pipeline — a real check that
  // `computeOptimalScore` (scenarioScoring.ts) actually re-simulates with
  // the scenario's own pattern, not a silently-substituted constant rate.
  it("the shipped reference solution clears every gate at 2 stars, not legendary against itself", () => {
    const solution = priceAlertNotifications.optimalSolution!;
    const nodes = solution.entities.map((e) => fakeNode(e.id, e.type, e.config));
    const { score } = run(priceAlertNotifications, nodes, solution.connections);

    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(2);
    expect(score.legendary).toBe(false);
  });

  it("an unmodified, unconfigured build fails on latency, not just capacity", () => {
    const nodes = [
      fakeNode("client", "client", { requestRate: 67 }),
      fakeNode("api", "api", {}),
      fakeNode("db", "database", {}),
    ];
    const connections: ConnectionConfig[] = [
      { source: "client", target: "api", latencyMs: 5 },
      { source: "api", target: "db", latencyMs: 2 },
    ];
    const { score } = run(priceAlertNotifications, nodes, connections);
    expect(score.gatesPassed).toBe(false);
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

/**
 * Regression guard for the numbers recorded in each of the 8-scenario
 * validation wave's own header comments — factored out the same way
 * `describeScenarioBasics` is in validator.test.ts, instead of
 * copy-pasting this block 8 more times.
 */
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

describe("8-scenario validation wave — each optimalSolution's own regression guard", () => {
  describeOptimalSolutionRegression(internalAdminDashboard, 2);
  describeOptimalSolutionRegression(trendingHashtagsFeed, 2);
  describeOptimalSolutionRegression(iotSensorIngestion, 2);
  describeOptimalSolutionRegression(concertTicketDrop, 2);
  describeOptimalSolutionRegression(slowSearchEndpoint, 2);
  describeOptimalSolutionRegression(viralVideoComments, 1);
  describeOptimalSolutionRegression(adAuctionBidding, 1);
  describeOptimalSolutionRegression(checkoutTimeoutMystery, 2);
});

describe("second 8-scenario wave — each optimalSolution's own regression guard", () => {
  describeOptimalSolutionRegression(recipeOfTheDay, 2);
  describeOptimalSolutionRegression(newsletterSendConfirmations, 2);
  describeOptimalSolutionRegression(weatherForecastApi, 2);
  describeOptimalSolutionRegression(warehouseInventorySync, 2);
  describeOptimalSolutionRegression(liveSportsScoreboard, 2);
  describeOptimalSolutionRegression(rideHailingLocationPings, 2);
  describeOptimalSolutionRegression(flightStatusPushUpdates, 2);
  describeOptimalSolutionRegression(globalLeaderboardUpdates, 1);
});

describe("third scenario wave — each optimalSolution's own regression guard", () => {
  describeOptimalSolutionRegression(couponCodeRedemption, 1);
  describeOptimalSolutionRegression(fitnessTrackerStepSync, 2);
  describeOptimalSolutionRegression(apiGatewaySlowdown, 2);
  describeOptimalSolutionRegression(wildfireAlertBroadcast, 2);
  describeOptimalSolutionRegression(trendingProductSearch, 1);
  describeOptimalSolutionRegression(publicTransitTrackerApi, 2);
});

describe("scoreScenario — ignoreBudget option (the budget/cost checking toggle)", () => {
  // recipeOfTheDay's own bare starting scaffold (schema-default API+DB,
  // no cache — see its header) is a real, already-verified case that
  // clears success/latency functionally but fails on cost alone ($461 >
  // its $450 budget) — exactly the shape needed to prove ignoreBudget
  // does something real, not a synthetic fixture.
  function bareRecipeOfTheDay() {
    const nodes = recipeOfTheDay.startingEntities.map((e) => fakeNode(e.id, e.type, e.config));
    return { nodes, connections: recipeOfTheDay.startingConnections };
  }

  it("defaults to counting budget (unchanged existing behavior) when ignoreBudget is omitted", () => {
    const { nodes, connections } = bareRecipeOfTheDay();
    const { score } = run(recipeOfTheDay, nodes, connections);
    expect(score.budgetPassed).toBe(false);
    expect(score.gatesPassed).toBe(false);
  });

  it("ignores the budget gate and drops cost from the composite when ignoreBudget is true", () => {
    const { nodes, connections } = bareRecipeOfTheDay();
    const { score } = run(recipeOfTheDay, nodes, connections, true);
    expect(score.budgetUsd).toBeNull();
    expect(score.budgetPassed).toBe(true);
    expect(score.gatesPassed).toBe(true);
    // Cost dropped out of the composite entirely — same "budgetUsd ===
    // null contributes a perfect 1/3" path a scenario with no budget at
    // all already takes (scenarioScoring.ts's costScore branch).
    expect(score.composite).toBeGreaterThan(0);
  });

  it("keeps the reference solution's own score consistent with the same toggle — no false 'legendary' from comparing a cost-free build against a cost-counting reference", () => {
    const { nodes, connections } = bareRecipeOfTheDay();
    const { score: withBudget } = run(recipeOfTheDay, nodes, connections, false);
    const { score: withoutBudget } = run(recipeOfTheDay, nodes, connections, true);

    // Same build, opposite toggle: gatesPassed flips, and optimalComposite
    // (the reference build's own score) must have been recomputed under
    // the matching setting each time, not read from a stale cache shared
    // across the two.
    expect(withBudget.gatesPassed).toBe(false);
    expect(withoutBudget.gatesPassed).toBe(true);
    expect(withoutBudget.optimalComposite).not.toBeNull();
  });
});
