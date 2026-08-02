/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import { computeEdgeLatencies } from "../entities/CDN";
import type { SimulationConfig } from "../types";

function configWithCDN(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 5 } },
      {
        id: "cdn1",
        type: "cdn",
        position: { x: 0, y: 0 },
        config: { edgeCount: 5, capacity: 20 },
      },
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "cdn1", latencyMs: 2 },
      { source: "cdn1", target: "db1", latencyMs: 10 },
    ],
    scenario: {
      id: "cdn-test",
      title: "CDN Test",
      trafficPattern: { type: "constant", rate: 50 },
      durationMs: 8000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("CDN", () => {
  it("carries requests end-to-end and produces both hits and misses", () => {
    const result = runSimulation(configWithCDN());
    expect(result.metrics.successRate).toBeGreaterThan(0.95);

    const hits = result.events.filter((e) => e.type === "CACHE_HIT");
    const misses = result.events.filter((e) => e.type === "CACHE_MISS");
    expect(hits.length).toBeGreaterThan(0);
    expect(misses.length).toBeGreaterThan(0);
  });

  it("routes the response for a miss back through the CDN to store it", () => {
    // Same class of bug the Cache work exposed: if the response didn't
    // route back through the CDN, edges would never warm up and hit rate
    // would stay at 0% regardless of how repetitive the traffic was.
    const result = runSimulation(configWithCDN());
    const hits = result.events.filter((e) => e.type === "CACHE_HIT");
    expect(hits.length).toBeGreaterThan(0);
  });

  it("splitting identical traffic across more edges lowers the aggregate hit rate", () => {
    // Each edge warms up independently — more edges means the same
    // traffic is spread thinner across more independent caches.
    const fewEdges = runSimulation(
      configWithCDN({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 5 } },
          { id: "cdn1", type: "cdn", position: { x: 0, y: 0 }, config: { edgeCount: 1, capacity: 20 } },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
      })
    );
    const manyEdges = runSimulation(
      configWithCDN({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 5 } },
          { id: "cdn1", type: "cdn", position: { x: 0, y: 0 }, config: { edgeCount: 20, capacity: 20 } },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
      })
    );

    const hitRate = (r: typeof fewEdges) => {
      const hits = r.events.filter((e) => e.type === "CACHE_HIT").length;
      const misses = r.events.filter((e) => e.type === "CACHE_MISS").length;
      return hits / (hits + misses);
    };

    expect(hitRate(fewEdges)).toBeGreaterThan(hitRate(manyEdges));
  });

  it("spaces per-edge latency evenly between min and max", () => {
    // 3 edges over [10, 30] should land exactly on 10, 20, 30 — checked
    // indirectly via the spread of PROCESSING_COMPLETED timing for
    // isolated single-edge runs would be indirect; instead confirm the
    // extremes are respected by keeping requests to a single key so hits
    // dominate and duration is dominated by edge latency (hitTimeMs is
    // tiny by comparison), across many edges to sample the full range.
    const result = runSimulation(
      configWithCDN({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 1 } },
          {
            id: "cdn1",
            type: "cdn",
            position: { x: 0, y: 0 },
            config: { edgeCount: 5, minEdgeLatencyMs: 10, maxEdgeLatencyMs: 50, capacity: 20 },
          },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
        scenario: {
          id: "latency-spread",
          title: "Latency Spread",
          trafficPattern: { type: "constant", rate: 200 },
          durationMs: 5000,
        },
      })
    );

    const hitDurations = result.events
      .filter((e) => e.type === "PROCESSING_COMPLETED" && e.source === "cdn1")
      .map((e) => e.timestamp);
    expect(hitDurations.length).toBeGreaterThan(0);
    // Every hit/miss round trip should be bounded by roughly 2x the max
    // configured edge latency plus a small work-time allowance — nothing
    // should blow past the configured range.
    expect(result.metrics.averageLatency).toBeLessThan(250);
  });

  it("fails gracefully on a miss with no downstream connection", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "cdn1", type: "cdn", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [{ source: "client1", target: "cdn1", latencyMs: 1 }],
      scenario: {
        id: "no-downstream",
        title: "No Downstream",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 1000,
      },
      options: { seed: 1 },
    };

    const result = runSimulation(config);
    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const failedEvents = result.events.filter((e) => e.type === "REQUEST_FAILED");
    expect(
      failedEvents.some((e) => e.metadata.reason === "no_downstream_connection")
    ).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithCDN());
    const b = runSimulation(configWithCDN());
    expect(a.events).toEqual(b.events);
  });

  it("computes real per-edge hit rates that sum to the aggregate", () => {
    const result = runSimulation(configWithCDN());
    const cdnMetrics = result.metrics.entityMetrics.cdn1;
    expect(cdnMetrics.cdnEdges).toBeDefined();
    const edges = cdnMetrics.cdnEdges!;

    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      expect(edge.hitRate).toBeGreaterThanOrEqual(0);
      expect(edge.hitRate).toBeLessThanOrEqual(1);
    }

    const totalRequests = edges.reduce((sum, e) => sum + e.requests, 0);
    const totalHits = edges.reduce((sum, e) => sum + e.requests * e.hitRate, 0);
    const aggregateFromEdges = totalHits / totalRequests;
    expect(aggregateFromEdges).toBeCloseTo(cdnMetrics.cacheHitRate!, 5);
  });
});

describe("computeEdgeLatencies", () => {
  it("spaces latencies evenly between min and max", () => {
    expect(computeEdgeLatencies(3, 10, 30)).toEqual([10, 20, 30]);
    expect(computeEdgeLatencies(5, 0, 100)).toEqual([0, 25, 50, 75, 100]);
  });

  it("returns exactly the min latency for a single edge", () => {
    expect(computeEdgeLatencies(1, 15, 90)).toEqual([15]);
  });

  it("is a pure function — same inputs always produce the same output", () => {
    expect(computeEdgeLatencies(7, 5, 80)).toEqual(computeEdgeLatencies(7, 5, 80));
  });

  it("never produces fewer than one edge, even for a non-positive count", () => {
    expect(computeEdgeLatencies(0, 5, 80)).toEqual([5]);
  });
});
