/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { evaluateConstraint, evaluateScenario } from "../validator";
import { movieTicketBooking } from "../movieTicketBooking";
import { urlShortener } from "../urlShortener";
import { flashSale } from "../flashSale";
import type { Scenario, ScenarioConstraint } from "../types";
import type { MetricsSnapshot } from "@/simulation/types";
import { runSimulation } from "@/simulation/engine/Simulator";

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

  // A student who widens the database's connection pool and queue —
  // the bottleneck the starting config was built around — should be able
  // to pass. Guards against the scenario being unsolvable within the
  // entities actually implemented today.
  it("can be solved by giving the database more capacity", () => {
    const config = {
      entities: movieTicketBooking.startingEntities.map(({ id, type, position, config }) =>
        type === "database"
          ? { id, type, position, config: { ...config, maxConnections: 5, maxQueueLength: 15 } }
          : { id, type, position, config }
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
    expect(evaluation.passed).toBe(true);
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
  // Load Balancer/Cache/CDN are implemented alongside Client/API/Database
  // (see entityCatalog.ts — only message_queue isn't yet).
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

  // The intended fix isn't a config tweak — it's inserting a Cache between
  // API and Database, which is the whole point of this scenario.
  it("can be solved by inserting a Cache between API and Database", () => {
    const config = {
      entities: [
        ...urlShortener.startingEntities
          .filter((e) => e.type !== "database")
          .map(({ id, type, position, config }) => ({ id, type, position, config })),
        {
          id: "cache",
          type: "cache" as const,
          position: { x: 0, y: 0 },
          config: { capacity: 30, evictionPolicy: "lru", ttlMs: 0 },
        },
        ...urlShortener.startingEntities
          .filter((e) => e.type === "database")
          .map(({ id, type, position, config }) => ({ id, type, position, config })),
      ],
      connections: [
        { source: "client", target: "api", latencyMs: 5 },
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
    const evaluation = evaluateScenario(urlShortener, result.metrics);
    expect(evaluation.passed).toBe(true);
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

  // The intended fix is horizontal scaling — a LoadBalancer plus a second
  // API server, both wired to the same downstream Database.
  it("can be solved by adding a LoadBalancer and a second API server", () => {
    const api = flashSale.startingEntities.find((e) => e.type === "api")!;
    const database = flashSale.startingEntities.find((e) => e.type === "database")!;
    const client = flashSale.startingEntities.find((e) => e.type === "client")!;

    const config = {
      entities: [
        { id: client.id, type: client.type, position: client.position, config: client.config },
        { id: "lb", type: "load_balancer" as const, position: { x: 0, y: 0 }, config: {} },
        { id: "api1", type: "api" as const, position: { x: 0, y: 0 }, config: api.config },
        { id: "api2", type: "api" as const, position: { x: 0, y: 0 }, config: api.config },
        {
          id: database.id,
          type: database.type,
          position: database.position,
          config: database.config,
        },
      ],
      connections: [
        { source: client.id, target: "lb", latencyMs: 5 },
        { source: "lb", target: "api1", latencyMs: 5 },
        { source: "lb", target: "api2", latencyMs: 5 },
        { source: "api1", target: database.id, latencyMs: 5 },
        { source: "api2", target: database.id, latencyMs: 5 },
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
    expect(evaluation.passed).toBe(true);
  });
});
