/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "@/simulation/engine/Simulator";
import { estimateCost } from "@/lib/costEngine";
import type { SimulationConfig } from "@/simulation/types";
import type { ArchitectureNode } from "@/store/workshopStore";

function toArchitectureNodes(config: SimulationConfig): ArchitectureNode[] {
  return config.entities.map((entity) => ({
    id: entity.id,
    type: "component",
    position: entity.position,
    data: {
      entityType: entity.type,
      label: entity.type,
      config: entity.config,
    },
  }));
}

function baseConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "api1", latencyMs: 5 },
      { source: "api1", target: "db1", latencyMs: 2 },
    ],
    scenario: {
      id: "test",
      title: "Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 5000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("estimateCost", () => {
  it("prices every non-client entity, excludes the client entirely", () => {
    const config = baseConfig();
    const result = runSimulation(config);
    const cost = estimateCost(result, toArchitectureNodes(config));

    expect(cost.entities.map((e) => e.entityId).sort()).toEqual(["api1", "db1"]);
    expect(cost.entities.every((e) => e.monthlyTotalCost > 0)).toBe(true);
  });

  it("charges base cost even for a node no traffic ever reached", () => {
    const config = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        // db1 has no connection at all, so it's never reached.
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [{ source: "client1", target: "api1", latencyMs: 5 }],
    });
    const result = runSimulation(config);
    const cost = estimateCost(result, toArchitectureNodes(config));

    const db = cost.entities.find((e) => e.entityId === "db1");
    expect(db).toBeDefined();
    expect(db!.monthlyUsageCost).toBe(0);
    expect(db!.monthlyBaseCost).toBeGreaterThan(0); // provisioned capacity costs money at zero load, like real infra
  });

  it("scales Cache cost with capacity instead of staying flat (regression: /1000 divisor was unreachable given the 500 schema cap)", () => {
    const small = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 5 } },
        { id: "cache1", type: "cache", position: { x: 0, y: 0 }, config: { capacity: 20 } },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [
        { source: "client1", target: "cache1", latencyMs: 1 },
        { source: "cache1", target: "db1", latencyMs: 2 },
      ],
    });
    const large = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 5 } },
        { id: "cache1", type: "cache", position: { x: 0, y: 0 }, config: { capacity: 500 } },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [
        { source: "client1", target: "cache1", latencyMs: 1 },
        { source: "cache1", target: "db1", latencyMs: 2 },
      ],
    });

    const smallCost = estimateCost(runSimulation(small), toArchitectureNodes(small)).entities.find(
      (e) => e.entityId === "cache1"
    )!;
    const largeCost = estimateCost(runSimulation(large), toArchitectureNodes(large)).entities.find(
      (e) => e.entityId === "cache1"
    )!;

    expect(largeCost.monthlyTotalCost).toBeGreaterThan(smallCost.monthlyTotalCost);
    expect(largeCost.severity).not.toBe("normal");
  });

  it("prices CDN off cdnEdges request volume, not the (miss-inflated) raw requestCount", () => {
    const config = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 100_000 } }, // huge pool -> almost all misses
        { id: "cdn1", type: "cdn", position: { x: 0, y: 0 }, config: { edgeCount: 3, capacity: 20 } },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [
        { source: "client1", target: "cdn1", latencyMs: 1 },
        { source: "cdn1", target: "db1", latencyMs: 2 },
      ],
    });
    const result = runSimulation(config);
    const cost = estimateCost(result, toArchitectureNodes(config));
    const cdn = cost.entities.find((e) => e.entityId === "cdn1")!;

    const edgeRequests = result.metrics.entityMetrics.cdn1.cdnEdges!.reduce(
      (sum, e) => sum + e.requests,
      0
    );
    const rawRequestCount = result.metrics.entityMetrics.cdn1.requestCount;

    // Heavy misses mean requestCount (2x per miss) is well above cdnEdges'
    // real per-request count — cost must track the latter.
    expect(rawRequestCount).toBeGreaterThan(edgeRequests);
    const expectedVolume = (edgeRequests / (result.duration / 1000)) * 730 * 3600;
    expect(cdn.monthlyRequestVolume).toBeCloseTo(expectedVolume, 0);
  });

  it("prices Load Balancer off routed traffic, not requestCount (which is always 0 — it has no BoundedProcessor)", () => {
    const config = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 100 } },
        { id: "lb1", type: "load_balancer", position: { x: 0, y: 0 }, config: {} },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "api2", type: "api", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [
        { source: "client1", target: "lb1", latencyMs: 5 },
        { source: "lb1", target: "api1", latencyMs: 2 },
        { source: "lb1", target: "api2", latencyMs: 2 },
      ],
      scenario: {
        id: "lb-test",
        title: "LB Test",
        trafficPattern: { type: "constant", rate: 100 },
        durationMs: 5000,
      },
    });
    const result = runSimulation(config);
    expect(result.metrics.entityMetrics.lb1.requestCount).toBe(0); // sanity: confirms the bug this test guards against

    const cost = estimateCost(result, toArchitectureNodes(config));
    const lb = cost.entities.find((e) => e.entityId === "lb1")!;

    expect(lb.monthlyRequestVolume).toBeGreaterThan(0);
    expect(lb.monthlyUsageCost).toBeGreaterThan(0);
  });

  it("crosses severity thresholds as cost rises", () => {
    const cheap = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 5 } },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: { maxConcurrent: 1 } },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
      scenario: {
        id: "cheap",
        title: "Cheap",
        trafficPattern: { type: "constant", rate: 5 },
        durationMs: 5000,
      },
    });
    const expensive = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 1000 } },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: { maxConcurrent: 50, maxQueueLength: 200 } },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { maxConnections: 50, maxQueueLength: 500 } },
      ],
      scenario: {
        id: "expensive",
        title: "Expensive",
        trafficPattern: { type: "constant", rate: 1000 },
        durationMs: 5000,
      },
    });

    const cheapCost = estimateCost(runSimulation(cheap), toArchitectureNodes(cheap));
    const expensiveCost = estimateCost(runSimulation(expensive), toArchitectureNodes(expensive));

    const cheapApi = cheapCost.entities.find((e) => e.entityId === "api1")!;
    const expensiveApi = expensiveCost.entities.find((e) => e.entityId === "api1")!;

    expect(cheapApi.severity).toBe("normal");
    expect(expensiveApi.severity).toBe("high");
  });

  it("sets the architecture-wide severity to the worst entity severity", () => {
    const config = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 1000 } },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: { maxConcurrent: 50, maxQueueLength: 500 } },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { maxConnections: 50, maxQueueLength: 500 } },
      ],
      scenario: {
        id: "overload",
        title: "Overload",
        trafficPattern: { type: "constant", rate: 1000 },
        durationMs: 5000,
      },
    });
    const result = runSimulation(config);
    const cost = estimateCost(result, toArchitectureNodes(config));

    const rank = { normal: 0, elevated: 1, high: 2 } as const;
    const worst = cost.entities.reduce<"normal" | "elevated" | "high">(
      (w, e) => (rank[e.severity] > rank[w] ? e.severity : w),
      "normal"
    );

    expect(cost.severity).toBe(worst);
    expect(cost.totalMonthlyCost).toBeCloseTo(
      cost.entities.reduce((sum, e) => sum + e.monthlyTotalCost, 0),
      5
    );
  });

  it("prices base (provisioned) cost from config alone, before any simulation has run", () => {
    const config = baseConfig();
    const cost = estimateCost(null, toArchitectureNodes(config));

    expect(cost.entities.map((e) => e.entityId).sort()).toEqual(["api1", "db1"]);
    for (const entity of cost.entities) {
      expect(entity.hasUsageData).toBe(false);
      expect(entity.monthlyUsageCost).toBe(0);
      expect(entity.monthlyBaseCost).toBeGreaterThan(0);
      // Base-only cost should exactly match what the same config would
      // report as its base line once a real run's usage cost is added —
      // a null result must never change what base cost comes out to.
      const withRun = estimateCost(runSimulation(config), toArchitectureNodes(config)).entities.find(
        (e) => e.entityId === entity.entityId
      )!;
      expect(entity.monthlyBaseCost).toBeCloseTo(withRun.monthlyBaseCost, 5);
      expect(withRun.hasUsageData).toBe(true);
    }
  });

  it("returns an empty, normal-severity estimate when there's nothing to price", () => {
    const config = baseConfig({ entities: [{ id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} }] });
    config.connections = [];
    const result = runSimulation(config);
    const cost = estimateCost(result, toArchitectureNodes(config));

    expect(cost.entities).toEqual([]);
    expect(cost.totalMonthlyCost).toBe(0);
    expect(cost.severity).toBe("normal");
  });
});
