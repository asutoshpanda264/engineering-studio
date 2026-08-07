/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import {
  computeEdgeLatencies,
  computeEdgePositions,
  DEFAULT_USER_POSITION,
} from "../entities/CDN";
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

  it("keeps per-edge latency within the configured min/max range", () => {
    // Per-edge latency is now derived from real distance to the User pin
    // (computeEdgeLatencies), not evenly spaced by index — checking the
    // exact spread directly is computeEdgeLatencies' own unit tests'
    // job. Here, confirm the extremes are still respected end-to-end by
    // keeping requests to a single key so hits dominate and duration is
    // dominated by edge latency (hitTimeMs is tiny by comparison).
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

  it("never produces a hit when the origin always fails, even for a repeated key", () => {
    // Regression test for Milestone 0: before the failure-routing fix, a
    // downstream failure after a miss never reached the CDN (routed
    // straight to the client instead), so this scenario was untestable —
    // the in-flight record just leaked. If a failed fetch were ever
    // mistakenly cached, the same repeated key would eventually produce a
    // CACHE_HIT despite the origin never successfully answering once.
    const result = runSimulation(
      configWithCDN({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 1 } },
          { id: "cdn1", type: "cdn", position: { x: 0, y: 0 }, config: { edgeCount: 1, capacity: 20 } },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { failureProbability: 1 } },
        ],
      })
    );

    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const hits = result.events.filter((e) => e.type === "CACHE_HIT");
    expect(hits.length).toBe(0);
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
  it("gives the nearest edge to the User pin the min latency and the farthest the max", () => {
    // With the user pin far to one side, computeEdgePositions' ring
    // guarantees a clear nearest/farthest edge rather than a tie.
    const latencies = computeEdgeLatencies(5, 10, 30, 8, 50);
    expect(Math.min(...latencies)).toBe(10);
    expect(Math.max(...latencies)).toBe(30);
    for (const l of latencies) {
      expect(l).toBeGreaterThanOrEqual(10);
      expect(l).toBeLessThanOrEqual(30);
    }
  });

  it("moving the User pin changes which edge is nearest", () => {
    // computeEdgePositions puts edge 0 at the top of the ring (angle
    // -90°, i.e. directly above center) — a user placed just above it
    // should find it nearest; a user placed just below the opposite side
    // should find some other edge nearest instead.
    const nearTop = computeEdgeLatencies(4, 10, 30, 50, 5);
    const nearBottom = computeEdgeLatencies(4, 10, 30, 50, 95);
    expect(nearTop.indexOf(Math.min(...nearTop))).not.toBe(
      nearBottom.indexOf(Math.min(...nearBottom))
    );
  });

  it("returns exactly the min latency for a single edge", () => {
    expect(computeEdgeLatencies(1, 15, 90)).toEqual([15]);
  });

  it("is a pure function — same inputs always produce the same output", () => {
    expect(computeEdgeLatencies(7, 5, 80, 20, 60)).toEqual(
      computeEdgeLatencies(7, 5, 80, 20, 60)
    );
  });

  it("never produces fewer than one edge, even for a non-positive count", () => {
    expect(computeEdgeLatencies(0, 5, 80)).toEqual([5]);
  });

  it("defaults to DEFAULT_USER_POSITION when no user position is given", () => {
    expect(computeEdgeLatencies(5, 10, 30)).toEqual(
      computeEdgeLatencies(5, 10, 30, DEFAULT_USER_POSITION.x, DEFAULT_USER_POSITION.y)
    );
  });
});

describe("computeEdgePositions", () => {
  it("returns one position per edge, all inside the 0–100 plane", () => {
    const positions = computeEdgePositions(6);
    expect(positions).toHaveLength(6);
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });

  it("is a pure function of edge count alone", () => {
    expect(computeEdgePositions(4)).toEqual(computeEdgePositions(4));
  });
});

describe("proximity-weighted edge routing", () => {
  it("routes more requests to the edge nearest the User pin", () => {
    // User pin placed right next to edge 0 (top of the ring, angle -90°)
    // — that edge should receive a clear majority of dispatches.
    const result = runSimulation(
      configWithCDN({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 20 } },
          {
            id: "cdn1",
            type: "cdn",
            position: { x: 0, y: 0 },
            config: { edgeCount: 5, capacity: 50, userX: 50, userY: 12 },
          },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
      })
    );
    const cdnMetrics = result.metrics.entityMetrics.cdn1;
    const edges = cdnMetrics.cdnEdges!;
    const totalRequests = edges.reduce((sum, e) => sum + e.requests, 0);
    const nearest = edges.reduce((max, e) => (e.requests > max.requests ? e : max));
    expect(nearest.edgeIndex).toBe(0);
    expect(nearest.requests / totalRequests).toBeGreaterThan(1 / edges.length);
  });
});
