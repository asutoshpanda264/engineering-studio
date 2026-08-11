/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { evaluateConstraint, evaluateScenario } from "../validator";
import { movieTicketBooking } from "../movieTicketBooking";
import { urlShortener } from "../urlShortener";
import { flashSale } from "../flashSale";
import { parkingReservationPlatform } from "../parkingReservationPlatform";
import type { Scenario, ScenarioConstraint } from "../types";
import type { MetricsSnapshot } from "@/simulation/types";
import { runSimulation } from "@/simulation/engine/Simulator";
import { scoreScenario } from "@/lib/scenarioScoring";
import type { ArchitectureNode } from "@/store/workshopStore";

function baseMetrics(overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot {
  return {
    totalRequests: 100,
    successfulRequests: 100,
    failedRequests: 0,
    successRate: 1,
    averageLatency: 50,
    p50Latency: 45,
    p95Latency: 90,
    p99Latency: 120,
    throughput: 10,
    entityMetrics: {},
    ...overrides,
  };
}

describe("evaluateConstraint", () => {
  const constraint: ScenarioConstraint = {
    id: "test",
    metric: "p95Latency",
    comparator: "lte",
    threshold: 300,
    label: "95% of requests complete within 300ms",
  };

  it("passes when the metric satisfies the comparator", () => {
    const result = evaluateConstraint(constraint, baseMetrics({ p95Latency: 214 }));
    expect(result.passed).toBe(true);
    expect(result.actual).toBe(214);
  });

  it("fails when the metric violates the comparator", () => {
    const result = evaluateConstraint(constraint, baseMetrics({ p95Latency: 450 }));
    expect(result.passed).toBe(false);
  });

  it.each([
    ["lt", 5, 10, true],
    ["lt", 10, 10, false],
    ["lte", 10, 10, true],
    ["gt", 10, 5, true],
    ["gt", 10, 10, false],
    ["gte", 10, 10, true],
  ] as const)("comparator %s: %d vs threshold %d -> %s", (comparator, actual, threshold, expected) => {
    const result = evaluateConstraint(
      { ...constraint, comparator, threshold },
      baseMetrics({ p95Latency: actual })
    );
    expect(result.passed).toBe(expected);
  });
});

describe("evaluateScenario", () => {
  it("passes only when every constraint passes", () => {
    const passing = evaluateScenario(
      movieTicketBooking,
      baseMetrics({ successRate: 0.97, p95Latency: 200 })
    );
    expect(passing.passed).toBe(true);
    expect(passing.results).toHaveLength(movieTicketBooking.constraints.length);

    const failing = evaluateScenario(
      movieTicketBooking,
      baseMetrics({ successRate: 0.6, p95Latency: 200 })
    );
    expect(failing.passed).toBe(false);
    expect(failing.results.some((r) => !r.passed)).toBe(true);
  });
});

describe("movieTicketBooking scenario data", () => {
  it("only uses entity types the Simulator currently implements", () => {
    const implemented = new Set(["client", "api", "database"]);
    for (const entity of movieTicketBooking.startingEntities) {
      expect(implemented.has(entity.type)).toBe(true);
    }
  });

  it("has exactly one client, and every connection references a real entity", () => {
    const ids = new Set(movieTicketBooking.startingEntities.map((e) => e.id));
    const clients = movieTicketBooking.startingEntities.filter((e) => e.type === "client");
    expect(clients).toHaveLength(1);

    for (const connection of movieTicketBooking.startingConnections) {
      expect(ids.has(connection.source)).toBe(true);
      expect(ids.has(connection.target)).toBe(true);
    }
  });

  // Runs the unmodified starting architecture through the real engine.
  // SCENARIOS.md §3: users should never begin with the ideal solution —
  // if this ever starts passing, the scenario stopped being a problem
  // worth solving and its numbers need retuning.
  it("fails at least one constraint when run unmodified — there must be a real problem to solve", () => {
    const config = {
      entities: movieTicketBooking.startingEntities.map(
        ({ id, type, position, config }) => ({ id, type, position, config })
      ),
      connections: movieTicketBooking.startingConnections,
      scenario: {
        id: movieTicketBooking.id,
        title: movieTicketBooking.title,
        trafficPattern: movieTicketBooking.trafficPattern,
        durationMs: movieTicketBooking.durationMs,
      },
      options: { seed: movieTicketBooking.seed },
    };

    const result = runSimulation(config);
    const evaluation = evaluateScenario(movieTicketBooking, result.metrics);
    expect(evaluation.passed).toBe(false);
  });

  // Every given node's own lock must actually be a node that exists, and
  // every locked field must belong to a given node — a locked field on a
  // node nobody guards (or a given id that isn't even on the canvas) would
  // silently do nothing, since workshopStore.ts's enforcement is keyed off
  // exactly these two lists.
  it("every given node id is a real starting entity, and every locked field belongs to one", () => {
    const startingIds = new Set(movieTicketBooking.startingEntities.map((e) => e.id));
    for (const givenId of movieTicketBooking.givenNodeIds ?? []) {
      expect(startingIds.has(givenId)).toBe(true);
    }
    for (const nodeId of Object.keys(movieTicketBooking.lockedFields ?? {})) {
      expect(movieTicketBooking.givenNodeIds ?? []).toContain(nodeId);
    }
  });

  // Dropping every component at its global entityConfigSchema default
  // (API maxConcurrent 10/proc 5ms; Database maxConnections 5/query
  // 15ms/queue 100) and wiring them up is exactly what a student does with
  // zero design effort — confirmed live in the browser to trivially pass
  // under the scenario's first tuning pass (80 req/s), which is the whole
  // reason this scenario was retuned. A default Database's own raw
  // ceiling (5 × 1000/15 ≈ 333 req/s) has to fall short of the fixed
  // demand, or the scenario has no real problem to solve.
  it("dropping unconfigured defaults and wiring them up is NOT enough to pass", () => {
    const client = movieTicketBooking.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 10, maxQueueLength: 50, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 5, maxQueueLength: 100, processingTimeMs: 15, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: movieTicketBooking.id,
        title: movieTicketBooking.title,
        trafficPattern: movieTicketBooking.trafficPattern,
        durationMs: movieTicketBooking.durationMs,
      },
      options: { seed: movieTicketBooking.seed },
    };

    const result = runSimulation(config);
    const evaluation = evaluateScenario(movieTicketBooking, result.metrics);
    expect(evaluation.passed).toBe(false);
  });

  // Builds a full Client->API->Database architecture from scratch, sized
  // for the fixed 370 req/s demand — the reference model has no pre-built
  // graph to widen a field on, so "solvable" now means a student-authored
  // build, not a config tweak on an existing node. Guards against the
  // scenario being unsolvable within the entities actually implemented
  // today.
  it("can be solved by building a properly-sized architecture from scratch", () => {
    const client = movieTicketBooking.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 8, maxQueueLength: 25, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 12, maxQueueLength: 30, processingTimeMs: 12, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: movieTicketBooking.id,
        title: movieTicketBooking.title,
        trafficPattern: movieTicketBooking.trafficPattern,
        durationMs: movieTicketBooking.durationMs,
      },
      options: { seed: movieTicketBooking.seed },
    };

    const result = runSimulation(config);
    const evaluation = evaluateScenario(movieTicketBooking, result.metrics);
    expect(evaluation.passed).toBe(true);
  });

  // The mechanism this whole redesign exists for: the old scenario's own
  // "fix" (crank a config field way past what's needed) still clears the
  // success-rate/latency constraints today — but now it also has to clear
  // a budget, and a lazily overprovisioned build blows past it by more
  // than 2x. scoreScenario must fail the gate (0 stars), not just note a
  // high cost.
  it("lazily overprovisioning clears the old constraints but fails the budget gate", () => {
    const client = movieTicketBooking.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 200, maxQueueLength: 500, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 200, maxQueueLength: 500, processingTimeMs: 15, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: movieTicketBooking.id,
        title: movieTicketBooking.title,
        trafficPattern: movieTicketBooking.trafficPattern,
        durationMs: movieTicketBooking.durationMs,
      },
      options: { seed: movieTicketBooking.seed },
    };

    const result = runSimulation(config);
    const evaluation = evaluateScenario(movieTicketBooking, result.metrics);
    expect(evaluation.passed).toBe(true); // clears the old bar just fine

    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(movieTicketBooking, result, nodes, config.connections);
    expect(score.budgetPassed).toBe(false);
    expect(score.gatesPassed).toBe(false);
    expect(score.stars).toBe(0);
    expect(score.actualCostUsd).toBeGreaterThan(movieTicketBooking.budgetUsd! * 1.8);
  });

  // A cache-fronted build (same shape as the "Bigger cache" run this
  // scenario's numbers were verified against — see this file's own header
  // comment) should clear the budget with real room to spare and earn the
  // top star tier, confirming 3 stars is actually reachable, not just
  // theoretically possible.
  it("a cache-fronted, well-sized build clears the budget and earns 3 stars", () => {
    const client = movieTicketBooking.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 5, maxQueueLength: 20, processingTimeMs: 4 },
        },
        {
          id: "cache",
          type: "cache" as const,
          position: { x: 0, y: 0 },
          config: { capacity: 45, evictionPolicy: "lru", ttlMs: 8000 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 3, maxQueueLength: 15, processingTimeMs: 8, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "cache", latencyMs: 5 },
        { source: "cache", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: movieTicketBooking.id,
        title: movieTicketBooking.title,
        trafficPattern: movieTicketBooking.trafficPattern,
        durationMs: movieTicketBooking.durationMs,
      },
      options: { seed: movieTicketBooking.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(movieTicketBooking, result, nodes, config.connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(3);
  });
});

/** Runs a scenario's unmodified starting architecture through the real engine. */
function runUnmodified(scenario: Scenario) {
  const config = {
    entities: scenario.startingEntities.map(({ id, type, position, config }) => ({
      id,
      type,
      position,
      config,
    })),
    connections: scenario.startingConnections,
    scenario: {
      id: scenario.id,
      title: scenario.title,
      trafficPattern: scenario.trafficPattern,
      durationMs: scenario.durationMs,
    },
    options: { seed: scenario.seed },
  };
  return runSimulation(config);
}

describe("urlShortener scenario data", () => {
  const implemented = new Set(["client", "api", "database", "load_balancer", "cache", "cdn"]);

  it("only uses entity types the Simulator currently implements", () => {
    for (const entity of urlShortener.startingEntities) {
      expect(implemented.has(entity.type)).toBe(true);
    }
  });

  it("has exactly one client, and every connection references a real entity", () => {
    const ids = new Set(urlShortener.startingEntities.map((e) => e.id));
    const clients = urlShortener.startingEntities.filter((e) => e.type === "client");
    expect(clients).toHaveLength(1);

    for (const connection of urlShortener.startingConnections) {
      expect(ids.has(connection.source)).toBe(true);
      expect(ids.has(connection.target)).toBe(true);
    }
  });

  it("fails at least one constraint when run unmodified — there must be a real problem to solve", () => {
    const result = runUnmodified(urlShortener);
    const evaluation = evaluateScenario(urlShortener, result.metrics);
    expect(evaluation.passed).toBe(false);
  });

  // Every given node's own lock must actually be a node that exists, and
  // every locked field must belong to a given node — see
  // movieTicketBooking's identical test for why this matters. Both
  // requestRate AND keyPoolSize are locked here (see this file's header
  // comment): shrinking the pool would make a cache artificially
  // effective, an easy out rather than the real lesson.
  it("every given node id is a real starting entity, and every locked field belongs to one", () => {
    const startingIds = new Set(urlShortener.startingEntities.map((e) => e.id));
    for (const givenId of urlShortener.givenNodeIds ?? []) {
      expect(startingIds.has(givenId)).toBe(true);
    }
    for (const nodeId of Object.keys(urlShortener.lockedFields ?? {})) {
      expect(urlShortener.givenNodeIds ?? []).toContain(nodeId);
    }
    expect(urlShortener.lockedFields?.client).toEqual(
      expect.arrayContaining(["requestRate", "keyPoolSize"])
    );
  });

  // Dropping every component at its global entityConfigSchema default (API
  // maxConcurrent 10/proc 5ms; Database maxConnections 5/query 15ms) and
  // wiring them up is exactly what a student does with zero design effort
  // — a default Database's own raw ceiling (5 x 1000/15 ≈ 333 req/s) has
  // to fall short of the fixed 400 req/s demand, or the scenario has no
  // real problem to solve. This is a genuine capacity failure, not merely
  // a budget one (see this file's own header comment): the unconfigured
  // build's cost ($693) is well under budget ($1400).
  it("dropping unconfigured defaults and wiring them up is NOT enough to pass", () => {
    const client = urlShortener.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 10, maxQueueLength: 50, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 5, maxQueueLength: 100, processingTimeMs: 15, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: urlShortener.id,
        title: urlShortener.title,
        trafficPattern: urlShortener.trafficPattern,
        durationMs: urlShortener.durationMs,
      },
      options: { seed: urlShortener.seed },
    };

    const result = runSimulation(config);
    const evaluation = evaluateScenario(urlShortener, result.metrics);
    expect(evaluation.passed).toBe(false);

    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(urlShortener, result, nodes, config.connections);
    expect(score.budgetPassed).toBe(true); // the failure is capacity, not cost
  });

  // A properly-sized database with no cache is a legitimate, adequate
  // solution — it just isn't the cheapest one available (usage cost scales
  // with every request reaching the database, cache or not).
  it("a properly-sized, no-cache build clears the budget and earns 2 stars", () => {
    const client = urlShortener.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 15, maxQueueLength: 40, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 15, maxQueueLength: 60, processingTimeMs: 10, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: urlShortener.id,
        title: urlShortener.title,
        trafficPattern: urlShortener.trafficPattern,
        durationMs: urlShortener.durationMs,
      },
      options: { seed: urlShortener.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(urlShortener, result, nodes, config.connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(2);
  });

  // The intended fix: a Cache between API and Database, sized to the
  // Client's full key pool, cuts real request volume reaching the
  // database — the scenario's real 2★→3★ lever (see this file's header
  // comment on why raw sizing alone plateaus at 2 stars).
  it("a cache-fronted, well-sized build clears the budget and earns 3 stars", () => {
    const client = urlShortener.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 5, maxQueueLength: 20, processingTimeMs: 1 },
        },
        {
          id: "cache",
          type: "cache" as const,
          position: { x: 0, y: 0 },
          config: { capacity: 30, evictionPolicy: "lru" as const, ttlMs: 0 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 1, maxQueueLength: 15, processingTimeMs: 1, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "cache", latencyMs: 5 },
        { source: "cache", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: urlShortener.id,
        title: urlShortener.title,
        trafficPattern: urlShortener.trafficPattern,
        durationMs: urlShortener.durationMs,
      },
      options: { seed: urlShortener.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(urlShortener, result, nodes, config.connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(3);
  });

  // The mechanism this whole redesign exists for: cranking a database's
  // connections/concurrency far past what's needed (a UI-unreachable
  // value, matching movieTicketBooking.ts's own precedent) still clears
  // the old success-rate/latency constraints, but blows the budget.
  it("lazily overprovisioning clears the old constraints but fails the budget gate", () => {
    const client = urlShortener.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 150, maxQueueLength: 300, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 150, maxQueueLength: 500, processingTimeMs: 10, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: urlShortener.id,
        title: urlShortener.title,
        trafficPattern: urlShortener.trafficPattern,
        durationMs: urlShortener.durationMs,
      },
      options: { seed: urlShortener.seed },
    };

    const result = runSimulation(config);
    const evaluation = evaluateScenario(urlShortener, result.metrics);
    expect(evaluation.passed).toBe(true); // clears the old bar just fine

    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(urlShortener, result, nodes, config.connections);
    expect(score.budgetPassed).toBe(false);
    expect(score.gatesPassed).toBe(false);
    expect(score.stars).toBe(0);
    expect(score.actualCostUsd).toBeGreaterThan(urlShortener.budgetUsd! * 1.15);
  });

  // Regression guard for the numbers in this file's own header comment:
  // the shipped optimalSolution scores exactly 3 stars against itself,
  // never legendary (computeOptimalScore only ever calls computeBaseScore,
  // never the public scoreScenario — see scenarioScoring.ts).
  it("the shipped optimalSolution scores 3 stars against itself, not legendary", () => {
    const { entities, connections } = urlShortener.optimalSolution!;
    const config = {
      entities: entities.map(({ id, type, position, config }) => ({ id, type, position, config })),
      connections,
      scenario: {
        id: urlShortener.id,
        title: urlShortener.title,
        trafficPattern: urlShortener.trafficPattern,
        durationMs: urlShortener.durationMs,
      },
      options: { seed: urlShortener.seed },
    };

    const result = runSimulation(config);
    const nodes = entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(urlShortener, result, nodes, connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(3);
    expect(score.legendary).toBe(false);
  });

  // The exploit found live while tuning this scenario (see this file's own
  // header comment): wiring the Client straight to the Database — or
  // straight to a Cache with the Database behind it — skips the API
  // Server entirely and used to be the cheapest possible "solution" here,
  // with zero caching and zero design effort. architectureValidation.ts's
  // generic gate closes it.
  it("wiring the Client directly to the Database, skipping the API Server, does not pass — even though it's cheap", () => {
    const client = urlShortener.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 15, maxQueueLength: 60, processingTimeMs: 10, failureProbability: 0 },
        },
      ],
      connections: [{ source: client.id, target: "database", latencyMs: 5 }],
      scenario: {
        id: urlShortener.id,
        title: urlShortener.title,
        trafficPattern: urlShortener.trafficPattern,
        durationMs: urlShortener.durationMs,
      },
      options: { seed: urlShortener.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(urlShortener, result, nodes, config.connections);
    expect(score.architectureValid).toBe(false);
    expect(score.gatesPassed).toBe(false);
    expect(score.stars).toBe(0);
  });
});

describe("flashSale scenario data", () => {
  const implemented = new Set(["client", "api", "database", "load_balancer", "cache", "cdn"]);

  it("only uses entity types the Simulator currently implements", () => {
    for (const entity of flashSale.startingEntities) {
      expect(implemented.has(entity.type)).toBe(true);
    }
  });

  it("has exactly one client, and every connection references a real entity", () => {
    const ids = new Set(flashSale.startingEntities.map((e) => e.id));
    const clients = flashSale.startingEntities.filter((e) => e.type === "client");
    expect(clients).toHaveLength(1);

    for (const connection of flashSale.startingConnections) {
      expect(ids.has(connection.source)).toBe(true);
      expect(ids.has(connection.target)).toBe(true);
    }
  });

  it("fails at least one constraint when run unmodified — there must be a real problem to solve", () => {
    const result = runUnmodified(flashSale);
    const evaluation = evaluateScenario(flashSale, result.metrics);
    expect(evaluation.passed).toBe(false);
  });

  // Every given node's own lock must actually be a node that exists, and
  // every locked field must belong to a given node — see
  // movieTicketBooking's identical test for why this matters.
  it("every given node id is a real starting entity, and every locked field belongs to one", () => {
    const startingIds = new Set(flashSale.startingEntities.map((e) => e.id));
    for (const givenId of flashSale.givenNodeIds ?? []) {
      expect(startingIds.has(givenId)).toBe(true);
    }
    for (const nodeId of Object.keys(flashSale.lockedFields ?? {})) {
      expect(flashSale.givenNodeIds ?? []).toContain(nodeId);
    }
  });

  // Dropping every component at its global entityConfigSchema default
  // (API maxConcurrent 10/proc 5ms; Database sql/5conn/query 15ms) and
  // wiring them up is exactly what a student does with zero design
  // effort — a default SQL pool's own raw ceiling (5 x 1000/15 ≈ 333
  // req/s) has to fall short of the fixed 400 req/s demand, or the
  // scenario has no real problem to solve. This is a genuine capacity
  // failure, not merely a budget one (see this file's own header
  // comment): the unconfigured build's cost ($693) is well under budget
  // ($1600), so evaluation itself must fail.
  it("dropping unconfigured defaults and wiring them up is NOT enough to pass", () => {
    const client = flashSale.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 10, maxQueueLength: 50, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { type: "sql" as const, maxConnections: 5, maxQueueLength: 100, processingTimeMs: 15, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: flashSale.id,
        title: flashSale.title,
        trafficPattern: flashSale.trafficPattern,
        durationMs: flashSale.durationMs,
      },
      options: { seed: flashSale.seed },
    };

    const result = runSimulation(config);
    const evaluation = evaluateScenario(flashSale, result.metrics);
    expect(evaluation.passed).toBe(false);

    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(flashSale, result, nodes, config.connections);
    expect(score.budgetPassed).toBe(true); // the failure is capacity, not cost
  });

  // A properly-sized SQL database (no type change) is a legitimate,
  // adequate solution — it just isn't the cheapest one available.
  it("a properly-sized SQL build clears the budget and earns 2 stars", () => {
    const client = flashSale.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 15, maxQueueLength: 30, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { type: "sql" as const, maxConnections: 25, maxQueueLength: 60, processingTimeMs: 10, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: flashSale.id,
        title: flashSale.title,
        trafficPattern: flashSale.trafficPattern,
        durationMs: flashSale.durationMs,
      },
      options: { seed: flashSale.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(flashSale, result, nodes, config.connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(2);
  });

  // Same functional shape as the adequate SQL build, but switching the
  // Database's type to nosql (3x connection-ceiling, 0.5x query-time
  // multiplier, at the SAME cost — see Database.ts / costEngine.ts) lets a
  // much smaller, cheaper-tier pool hit the same ceiling. This is the
  // scenario's real 2★→3★ lever, not a cache (see this file's header
  // comment on why keyPoolSize is locked).
  it("switching to NoSQL with a minimal pool is cheaper and earns 3 stars", () => {
    const client = flashSale.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 5, maxQueueLength: 20, processingTimeMs: 4 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { type: "nosql" as const, maxConnections: 5, maxQueueLength: 40, processingTimeMs: 8, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: flashSale.id,
        title: flashSale.title,
        trafficPattern: flashSale.trafficPattern,
        durationMs: flashSale.durationMs,
      },
      options: { seed: flashSale.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(flashSale, result, nodes, config.connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(3);
  });

  // The mechanism this whole redesign exists for: cranking a SQL pool's
  // connections/concurrency far past what's needed (a UI-unreachable
  // value, matching movieTicketBooking.ts's own precedent) still clears
  // the old success-rate/latency constraints, but blows the budget by a
  // wide margin.
  it("lazily overprovisioning SQL clears the old constraints but fails the budget gate", () => {
    const client = flashSale.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 150, maxQueueLength: 300, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { type: "sql" as const, maxConnections: 150, maxQueueLength: 500, processingTimeMs: 10, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: flashSale.id,
        title: flashSale.title,
        trafficPattern: flashSale.trafficPattern,
        durationMs: flashSale.durationMs,
      },
      options: { seed: flashSale.seed },
    };

    const result = runSimulation(config);
    const evaluation = evaluateScenario(flashSale, result.metrics);
    expect(evaluation.passed).toBe(true); // clears the old bar just fine

    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(flashSale, result, nodes, config.connections);
    expect(score.budgetPassed).toBe(false);
    expect(score.gatesPassed).toBe(false);
    expect(score.stars).toBe(0);
    expect(score.actualCostUsd).toBeGreaterThan(flashSale.budgetUsd! * 1.15);
  });

  // Regression guard for the numbers in this file's own header comment:
  // the shipped optimalSolution scores exactly 3 stars against itself,
  // never legendary (computeOptimalScore only ever calls computeBaseScore,
  // never the public scoreScenario — see scenarioScoring.ts).
  it("the shipped optimalSolution scores 3 stars against itself, not legendary", () => {
    const { entities, connections } = flashSale.optimalSolution!;
    const config = {
      entities: entities.map(({ id, type, position, config }) => ({ id, type, position, config })),
      connections,
      scenario: {
        id: flashSale.id,
        title: flashSale.title,
        trafficPattern: flashSale.trafficPattern,
        durationMs: flashSale.durationMs,
      },
      options: { seed: flashSale.seed },
    };

    const result = runSimulation(config);
    const nodes = entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(flashSale, result, nodes, config.connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(3);
    expect(score.legendary).toBe(false);
  });

  // A cache in front of the database is a real, exploreable option — but
  // with keyPoolSize locked at 1000 (many distinct orders, not a small
  // repeatable set), it should stay honestly worse than the NoSQL
  // reference, even maximally sized. Guards against the exact loophole
  // this file's header comment documents finding (and locking
  // keyPoolSize to close) during tuning.
  it("a cache doesn't beat the optimalSolution given the locked keyPoolSize", () => {
    const client = flashSale.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 5, maxQueueLength: 20, processingTimeMs: 1 },
        },
        {
          id: "cache",
          type: "cache" as const,
          position: { x: 0, y: 0 },
          config: { capacity: 500, evictionPolicy: "lru" as const, ttlMs: 0 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { type: "nosql" as const, maxConnections: 1, maxQueueLength: 20, processingTimeMs: 1, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "cache", latencyMs: 5 },
        { source: "cache", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: flashSale.id,
        title: flashSale.title,
        trafficPattern: flashSale.trafficPattern,
        durationMs: flashSale.durationMs,
      },
      options: { seed: flashSale.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(flashSale, result, nodes, config.connections);
    expect(score.legendary).toBe(false);
  });
});

describe("parkingReservationPlatform scenario data", () => {
  const implemented = new Set(["client", "api", "database", "load_balancer", "cache", "cdn"]);

  it("only uses entity types the Simulator currently implements", () => {
    for (const entity of parkingReservationPlatform.startingEntities) {
      expect(implemented.has(entity.type)).toBe(true);
    }
  });

  it("has exactly one client, and every connection references a real entity", () => {
    const ids = new Set(parkingReservationPlatform.startingEntities.map((e) => e.id));
    const clients = parkingReservationPlatform.startingEntities.filter(
      (e) => e.type === "client"
    );
    expect(clients).toHaveLength(1);

    for (const connection of parkingReservationPlatform.startingConnections) {
      expect(ids.has(connection.source)).toBe(true);
      expect(ids.has(connection.target)).toBe(true);
    }
  });

  it("fails at least one constraint when run unmodified — there must be a real problem to solve", () => {
    const result = runUnmodified(parkingReservationPlatform);
    const evaluation = evaluateScenario(parkingReservationPlatform, result.metrics);
    expect(evaluation.passed).toBe(false);
  });

  // Every given node's own lock must actually be a node that exists, and
  // every locked field must belong to a given node — see
  // movieTicketBooking's identical test for why this matters. Both
  // requestRate AND keyPoolSize are locked here (see this file's header
  // comment): a small pool would let a Cache cheaply dominate the intended
  // "diagnose the real bottleneck" lesson.
  it("every given node id is a real starting entity, and every locked field belongs to one", () => {
    const startingIds = new Set(parkingReservationPlatform.startingEntities.map((e) => e.id));
    for (const givenId of parkingReservationPlatform.givenNodeIds ?? []) {
      expect(startingIds.has(givenId)).toBe(true);
    }
    for (const nodeId of Object.keys(parkingReservationPlatform.lockedFields ?? {})) {
      expect(parkingReservationPlatform.givenNodeIds ?? []).toContain(nodeId);
    }
    expect(parkingReservationPlatform.lockedFields?.client).toEqual(
      expect.arrayContaining(["requestRate", "keyPoolSize"])
    );
  });

  // Dropping every component at its global entityConfigSchema default (API
  // maxConcurrent 10/proc 5ms; Database maxConnections 5/query 15ms) and
  // wiring them up is exactly what a student does with zero design effort
  // — a default Database's own raw ceiling (5 x 1000/15 ≈ 333 req/s) has
  // to fall short of the fixed 400 req/s demand.
  function defaultConfig(overrides: { apiMaxConcurrent?: number } = {}) {
    const client = parkingReservationPlatform.startingEntities.find((e) => e.type === "client")!;
    return {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: overrides.apiMaxConcurrent ?? 10, maxQueueLength: 50, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 5, maxQueueLength: 100, processingTimeMs: 15, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: parkingReservationPlatform.id,
        title: parkingReservationPlatform.title,
        trafficPattern: parkingReservationPlatform.trafficPattern,
        durationMs: parkingReservationPlatform.durationMs,
      },
      options: { seed: parkingReservationPlatform.seed },
    };
  }

  it("dropping unconfigured defaults and wiring them up is NOT enough to pass", () => {
    const config = defaultConfig();
    const result = runSimulation(config);
    const evaluation = evaluateScenario(parkingReservationPlatform, result.metrics);
    expect(evaluation.passed).toBe(false);
  });

  // The real lesson this scenario teaches: both the API server and the
  // database look saturated at once in the unmodified run, but they aren't
  // two independent problems — the API server's slots are stuck waiting on
  // a struggling database (backpressure), not short on their own capacity.
  it("unconfigured-defaults run: both the API server and the database sit near capacity together", () => {
    const result = runSimulation(defaultConfig());
    const api = result.metrics.entityMetrics["api"];
    const database = result.metrics.entityMetrics["database"];
    expect(api.utilization).toBeGreaterThan(0.9);
    expect(database.utilization).toBeGreaterThan(0.9);
  });

  // Raising the entity that LOOKS saturated (the API server) without
  // touching the actual bottleneck (the database) doesn't meaningfully
  // help — confirms the API's high utilization was a downstream symptom,
  // not an independent shortage of its own.
  it("raising only the API server's concurrency does not fix it — the database was always the real ceiling", () => {
    const result = runSimulation(defaultConfig({ apiMaxConcurrent: 30 }));
    const evaluation = evaluateScenario(parkingReservationPlatform, result.metrics);
    expect(evaluation.passed).toBe(false);
  });

  // Sizing ONLY the database (the real bottleneck) — leaving the API
  // server at its default — is a legitimate, adequate solution on its own.
  it("sizing only the database (the real bottleneck) clears the budget and earns 2 stars", () => {
    const client = parkingReservationPlatform.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 10, maxQueueLength: 50, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 13, maxQueueLength: 100, processingTimeMs: 15, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: parkingReservationPlatform.id,
        title: parkingReservationPlatform.title,
        trafficPattern: parkingReservationPlatform.trafficPattern,
        durationMs: parkingReservationPlatform.durationMs,
      },
      options: { seed: parkingReservationPlatform.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(parkingReservationPlatform, result, nodes, config.connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(2);
  });

  // Sizing both entities deliberately, with processing time tightened to
  // the schema floor, is what separates 2★ from 3★ here — a latency-driven
  // lever, not a cost-tier one (the database's base cost is identical
  // anywhere from 1-20 connections, see this file's header comment).
  it("a well-optimized build (tight processing times on both sides) clears the budget and earns 3 stars", () => {
    const client = parkingReservationPlatform.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 5, maxQueueLength: 20, processingTimeMs: 1 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 11, maxQueueLength: 30, processingTimeMs: 1, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: parkingReservationPlatform.id,
        title: parkingReservationPlatform.title,
        trafficPattern: parkingReservationPlatform.trafficPattern,
        durationMs: parkingReservationPlatform.durationMs,
      },
      options: { seed: parkingReservationPlatform.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(parkingReservationPlatform, result, nodes, config.connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(3);
  });

  // The mechanism this whole redesign exists for: cranking capacity far
  // past what's needed (a UI-unreachable value, matching
  // movieTicketBooking.ts's own precedent) still clears the old
  // success-rate/latency constraints, but blows the budget.
  it("lazily overprovisioning clears the old constraints but fails the budget gate", () => {
    const client = parkingReservationPlatform.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "api",
          type: "api" as const,
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 300, maxQueueLength: 500, processingTimeMs: 5 },
        },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 300, maxQueueLength: 700, processingTimeMs: 10, failureProbability: 0 },
        },
      ],
      connections: [
        { source: client.id, target: "api", latencyMs: 5 },
        { source: "api", target: "database", latencyMs: 5 },
      ],
      scenario: {
        id: parkingReservationPlatform.id,
        title: parkingReservationPlatform.title,
        trafficPattern: parkingReservationPlatform.trafficPattern,
        durationMs: parkingReservationPlatform.durationMs,
      },
      options: { seed: parkingReservationPlatform.seed },
    };

    const result = runSimulation(config);
    const evaluation = evaluateScenario(parkingReservationPlatform, result.metrics);
    expect(evaluation.passed).toBe(true); // clears the old bar just fine

    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(parkingReservationPlatform, result, nodes, config.connections);
    expect(score.budgetPassed).toBe(false);
    expect(score.gatesPassed).toBe(false);
    expect(score.stars).toBe(0);
    expect(score.actualCostUsd).toBeGreaterThan(parkingReservationPlatform.budgetUsd! * 1.5);
  });

  // Regression guard for the numbers in this file's own header comment:
  // the shipped optimalSolution scores exactly 3 stars against itself,
  // never legendary (computeOptimalScore only ever calls computeBaseScore,
  // never the public scoreScenario — see scenarioScoring.ts).
  it("the shipped optimalSolution scores 3 stars against itself, not legendary", () => {
    const { entities, connections } = parkingReservationPlatform.optimalSolution!;
    const config = {
      entities: entities.map(({ id, type, position, config }) => ({ id, type, position, config })),
      connections,
      scenario: {
        id: parkingReservationPlatform.id,
        title: parkingReservationPlatform.title,
        trafficPattern: parkingReservationPlatform.trafficPattern,
        durationMs: parkingReservationPlatform.durationMs,
      },
      options: { seed: parkingReservationPlatform.seed },
    };

    const result = runSimulation(config);
    const nodes = entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(parkingReservationPlatform, result, nodes, connections);
    expect(score.gatesPassed).toBe(true);
    expect(score.stars).toBe(3);
    expect(score.legendary).toBe(false);
  });

  // The exploit closed generically by architectureValidation.ts (see
  // urlShortener.ts's own header comment for where it was first found):
  // wiring the Client straight to the Database, skipping the API Server,
  // does not pass here either — even though it would otherwise be cheap.
  it("wiring the Client directly to the Database, skipping the API Server, does not pass", () => {
    const client = parkingReservationPlatform.startingEntities.find((e) => e.type === "client")!;
    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        {
          id: "database",
          type: "database" as const,
          position: { x: 0, y: 0 },
          config: { maxConnections: 13, maxQueueLength: 100, processingTimeMs: 15, failureProbability: 0 },
        },
      ],
      connections: [{ source: client.id, target: "database", latencyMs: 5 }],
      scenario: {
        id: parkingReservationPlatform.id,
        title: parkingReservationPlatform.title,
        trafficPattern: parkingReservationPlatform.trafficPattern,
        durationMs: parkingReservationPlatform.durationMs,
      },
      options: { seed: parkingReservationPlatform.seed },
    };

    const result = runSimulation(config);
    const nodes = config.entities.map(
      (e) => ({ id: e.id, type: "component", position: e.position, data: { entityType: e.type, label: e.id, config: e.config } })
    ) as unknown as ArchitectureNode[];
    const score = scoreScenario(parkingReservationPlatform, result, nodes, config.connections);
    expect(score.architectureValid).toBe(false);
    expect(score.gatesPassed).toBe(false);
  });
});
