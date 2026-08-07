/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithReplicaPool(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
      {
        id: "pool1",
        type: "replica_pool",
        position: { x: 0, y: 0 },
        config: { writeRatio: 0.2 },
      },
      { id: "leader", type: "database", position: { x: 0, y: 0 }, config: {} },
      { id: "replica1", type: "database", position: { x: 0, y: 0 }, config: {} },
      { id: "replica2", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "pool1", latencyMs: 1 },
      { source: "pool1", target: "leader", latencyMs: 1 },
      { source: "pool1", target: "replica1", latencyMs: 1 },
      { source: "pool1", target: "replica2", latencyMs: 1 },
    ],
    scenario: {
      id: "replica-pool-test",
      title: "Replica Pool Test",
      trafficPattern: { type: "constant", rate: 50 },
      durationMs: 5000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("ReplicaPool", () => {
  it("routes roughly writeRatio of requests to the leader (first connection)", () => {
    const result = runSimulation(configWithReplicaPool());
    const distribution = result.metrics.entityMetrics.pool1.routingDistribution!;
    const leaderRequests = distribution.find((d) => d.targetId === "leader")?.requests ?? 0;
    const total = distribution.reduce((sum, d) => sum + d.requests, 0);

    expect(total).toBeGreaterThan(0);
    // writeRatio 0.2, seeded RNG over hundreds of requests should land
    // close to it — generous tolerance since it's a single Bernoulli
    // roll per request, not an exact quota.
    expect(leaderRequests / total).toBeGreaterThan(0.1);
    expect(leaderRequests / total).toBeLessThan(0.3);
  });

  it("spreads reads round-robin evenly across the remaining replicas", () => {
    const result = runSimulation(configWithReplicaPool());
    const distribution = result.metrics.entityMetrics.pool1.routingDistribution!;
    const replica1Requests = distribution.find((d) => d.targetId === "replica1")?.requests ?? 0;
    const replica2Requests = distribution.find((d) => d.targetId === "replica2")?.requests ?? 0;

    expect(replica1Requests).toBeGreaterThan(0);
    expect(replica2Requests).toBeGreaterThan(0);
    const total = replica1Requests + replica2Requests;
    expect(Math.abs(replica1Requests - replica2Requests) / total).toBeLessThan(0.1);
  });

  it("every request reaching the pool is dispatched exactly once", () => {
    const result = runSimulation(configWithReplicaPool());
    const distribution = result.metrics.entityMetrics.pool1.routingDistribution!;
    const total = distribution.reduce((sum, d) => sum + d.requests, 0);
    expect(total).toBe(result.metrics.totalRequests);
  });

  it("keeps requests succeeding end-to-end through the pool", () => {
    const result = runSimulation(configWithReplicaPool());
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
  });

  it("degrades gracefully to a single target when no replicas are configured — reads and writes both go there", () => {
    const result = runSimulation(
      configWithReplicaPool({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
          { id: "pool1", type: "replica_pool", position: { x: 0, y: 0 }, config: { writeRatio: 0.2 } },
          { id: "leader", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
        connections: [
          { source: "client1", target: "pool1", latencyMs: 1 },
          { source: "pool1", target: "leader", latencyMs: 1 },
        ],
      })
    );

    const distribution = result.metrics.entityMetrics.pool1.routingDistribution!;
    expect(distribution.length).toBe(1);
    expect(distribution[0].targetId).toBe("leader");
    expect(distribution[0].requests).toBe(result.metrics.totalRequests);
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
  });

  it("fails gracefully when it has no downstream connection", () => {
    const config = configWithReplicaPool({
      connections: [{ source: "client1", target: "pool1", latencyMs: 1 }],
    });
    const result = runSimulation(config);

    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const failedEvents = result.events.filter((e) => e.type === "REQUEST_FAILED");
    expect(
      failedEvents.some((e) => e.metadata.reason === "no_downstream_connection")
    ).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithReplicaPool());
    const b = runSimulation(configWithReplicaPool());
    expect(a.events).toEqual(b.events);
  });
});
