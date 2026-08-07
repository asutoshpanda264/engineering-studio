/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithTwoAPIs(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
      { id: "lb1", type: "load_balancer", position: { x: 0, y: 0 }, config: {} },
      { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
      { id: "api2", type: "api", position: { x: 0, y: 0 }, config: {} },
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "lb1", latencyMs: 5 },
      { source: "lb1", target: "api1", latencyMs: 2 },
      { source: "lb1", target: "api2", latencyMs: 2 },
      { source: "api1", target: "db1", latencyMs: 2 },
      { source: "api2", target: "db1", latencyMs: 2 },
    ],
    scenario: {
      id: "lb-test",
      title: "Load Balancer Test",
      trafficPattern: { type: "constant", rate: 50 },
      durationMs: 5000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("LoadBalancer", () => {
  it("distributes requests round-robin across downstream servers", () => {
    const result = runSimulation(configWithTwoAPIs());

    const api1Requests = result.metrics.entityMetrics.api1.requestCount;
    const api2Requests = result.metrics.entityMetrics.api2.requestCount;

    expect(api1Requests).toBeGreaterThan(0);
    expect(api2Requests).toBeGreaterThan(0);
    // Round-robin over a constant stream should split within one request
    // of even — not just "both got some traffic".
    expect(Math.abs(api1Requests - api2Requests)).toBeLessThanOrEqual(1);
  });

  it("keeps requests succeeding end-to-end through the load balancer", () => {
    const result = runSimulation(configWithTwoAPIs());
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
  });

  it("fails requests gracefully when it has no downstream connection", () => {
    const config = configWithTwoAPIs({
      connections: [{ source: "client1", target: "lb1", latencyMs: 5 }],
    });
    const result = runSimulation(config);

    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const failedEvents = result.events.filter((e) => e.type === "REQUEST_FAILED");
    expect(
      failedEvents.some((e) => e.metadata.reason === "no_downstream_connection")
    ).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithTwoAPIs());
    const b = runSimulation(configWithTwoAPIs());
    expect(a.events).toEqual(b.events);
  });

  it("exposes a per-target routing distribution that sums to the total dispatched requests", () => {
    const result = runSimulation(configWithTwoAPIs());
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution;

    expect(distribution).toBeDefined();
    const api1Entry = distribution!.find((d) => d.targetId === "api1");
    const api2Entry = distribution!.find((d) => d.targetId === "api2");

    // Every request from the client is dispatched by lb1 exactly once,
    // so the per-target totals should add up to the full request count.
    expect((api1Entry?.requests ?? 0) + (api2Entry?.requests ?? 0)).toBe(
      result.metrics.totalRequests
    );
    expect(api1Entry?.requests).toBeGreaterThan(0);
    expect(api2Entry?.requests).toBeGreaterThan(0);
  });

  it("splits evenly under least_connections when both targets are equally fast, same as round_robin", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "least_connections" },
        },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "api2", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution!;
    const api1Requests = distribution.find((d) => d.targetId === "api1")?.requests ?? 0;
    const api2Requests = distribution.find((d) => d.targetId === "api2")?.requests ?? 0;
    const total = api1Requests + api2Requests;

    expect(total).toBeGreaterThan(0);
    expect(Math.abs(api1Requests - api2Requests) / total).toBeLessThan(0.1);
  });

  it("favors the faster target under least_connections once targets diverge in speed", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "least_connections" },
        },
        {
          id: "api1",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 2, processingJitterMs: 0, maxConcurrent: 2 },
        },
        {
          id: "api2",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 40, processingJitterMs: 0, maxConcurrent: 2 },
        },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution!;
    const api1Requests = distribution.find((d) => d.targetId === "api1")?.requests ?? 0;
    const api2Requests = distribution.find((d) => d.targetId === "api2")?.requests ?? 0;

    expect(api1Requests).toBeGreaterThan(api2Requests);
  });

  it("recovers a target's in-flight count under least_connections after that target fails a request", () => {
    // Regression test for Milestone 0: before the failure-routing fix, a
    // REQUEST_FAILED from a downstream target routed straight to the
    // client, bypassing the load balancer — recordCompletion() never
    // fired, so a failing target's in-flight count only ever grew,
    // starving it of all future traffic. With the fix, a failure passes
    // back through here exactly like a success does.
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "least_connections" },
        },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { failureProbability: 1 } },
        { id: "db2", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [
        { source: "client1", target: "lb1", latencyMs: 5 },
        { source: "lb1", target: "db1", latencyMs: 2 },
        { source: "lb1", target: "db2", latencyMs: 2 },
      ],
      scenario: {
        id: "lb-failure-recovery-test",
        title: "Load Balancer Failure Recovery Test",
        trafficPattern: { type: "constant", rate: 50 },
        durationMs: 5000,
      },
      options: { seed: 42 },
    };

    const result = runSimulation(config);
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution!;
    const db1Requests = distribution.find((d) => d.targetId === "db1")?.requests ?? 0;
    const db2Requests = distribution.find((d) => d.targetId === "db2")?.requests ?? 0;

    // If the counter leaked, db1's in-flight count would only ever climb,
    // and least_connections would starve it almost entirely in favor of
    // db2. With the fix, both stay close to evenly split, same as the
    // "equally fast" case above — db1 always failing doesn't make it
    // "busier" from the load balancer's point of view once its response
    // (a failure) comes back through.
    expect(db1Requests).toBeGreaterThan(0);
    const total = db1Requests + db2Requests;
    expect(Math.abs(db1Requests - db2Requests) / total).toBeLessThan(0.15);
  });

  it("weighted_round_robin splits requests proportionally to configured weight, regardless of speed", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "weighted_round_robin", weights: { api1: 3, api2: 1 } },
        },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "api2", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution!;
    const api1Requests = distribution.find((d) => d.targetId === "api1")?.requests ?? 0;
    const api2Requests = distribution.find((d) => d.targetId === "api2")?.requests ?? 0;
    const total = api1Requests + api2Requests;

    expect(total).toBeGreaterThan(0);
    // Weight 3:1 -> api1 should land close to 75% of traffic.
    expect(api1Requests / total).toBeGreaterThan(0.7);
    expect(api1Requests / total).toBeLessThan(0.8);
  });

  it("weighted_round_robin defaults an unlisted target's weight to 1, splitting evenly with no weights configured", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "weighted_round_robin" },
        },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "api2", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution!;
    const api1Requests = distribution.find((d) => d.targetId === "api1")?.requests ?? 0;
    const api2Requests = distribution.find((d) => d.targetId === "api2")?.requests ?? 0;
    const total = api1Requests + api2Requests;

    expect(Math.abs(api1Requests - api2Requests) / total).toBeLessThan(0.1);
  });

  it("weighted_round_robin keeps favoring the heavier-weighted target even once it's also the slower one", () => {
    // Round robin and least_connections both have a specific reason to
    // favor a target (position in cycle; in-flight count). Weighted round
    // robin's reason is purely the configured weight — it shouldn't back
    // off that just because the heavier target also happens to be slow.
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "weighted_round_robin", weights: { api1: 4, api2: 1 } },
        },
        {
          id: "api1",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 40, processingJitterMs: 0, maxConcurrent: 50 },
        },
        {
          id: "api2",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 2, processingJitterMs: 0, maxConcurrent: 50 },
        },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution!;
    const api1Requests = distribution.find((d) => d.targetId === "api1")?.requests ?? 0;
    const api2Requests = distribution.find((d) => d.targetId === "api2")?.requests ?? 0;

    expect(api1Requests).toBeGreaterThan(api2Requests);
  });

  it("is deterministic under weighted_round_robin for a given seed", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "weighted_round_robin", weights: { api1: 2 } },
        },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "api2", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const a = runSimulation(config);
    const b = runSimulation(config);
    expect(a.events).toEqual(b.events);
  });

  it("round_robin ignores target speed and keeps splitting evenly regardless", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "lb1", type: "load_balancer", position: { x: 0, y: 0 }, config: {} },
        {
          id: "api1",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 2, processingJitterMs: 0, maxConcurrent: 2 },
        },
        {
          id: "api2",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 40, processingJitterMs: 0, maxConcurrent: 2 },
        },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution!;
    const api1Requests = distribution.find((d) => d.targetId === "api1")?.requests ?? 0;
    const api2Requests = distribution.find((d) => d.targetId === "api2")?.requests ?? 0;
    const total = api1Requests + api2Requests;

    expect(Math.abs(api1Requests - api2Requests) / total).toBeLessThan(0.1);
  });

  it("ip_hash sends every request for the same key to the same target — session affinity", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 6 } },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "ip_hash" },
        },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "api2", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);

    const dispatches = result.events.filter(
      (e) =>
        e.type === "REQUEST_ROUTED" && e.source === "lb1" && e.metadata.direction === "request"
    );
    expect(dispatches.length).toBeGreaterThan(0);

    const targetByKey = new Map<string, string>();
    for (const event of dispatches) {
      const key = event.metadata.key as string;
      const target = event.destination as string;
      const seen = targetByKey.get(key);
      if (seen === undefined) {
        targetByKey.set(key, target);
      } else {
        expect(target).toBe(seen);
      }
    }
    // Both targets actually get used across the key pool — this isn't
    // trivially true if the hash collapsed onto one target only.
    expect(new Set(targetByKey.values()).size).toBeGreaterThan(1);
  });

  it("is deterministic under ip_hash for a given seed", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 6 } },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "ip_hash" },
        },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "api2", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const a = runSimulation(config);
    const b = runSimulation(config);
    expect(a.events).toEqual(b.events);
  });

  it("splits evenly under least_response_time when both targets are equally fast, same as round_robin", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "least_response_time" },
        },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "api2", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution!;
    const api1Requests = distribution.find((d) => d.targetId === "api1")?.requests ?? 0;
    const api2Requests = distribution.find((d) => d.targetId === "api2")?.requests ?? 0;
    const total = api1Requests + api2Requests;

    expect(total).toBeGreaterThan(0);
    // Looser than the least_connections/round_robin equivalents above:
    // least_response_time ties on EMA-smoothed latency samples, not exact
    // integer counts, so its steady-state split is close but noisier —
    // and shifts slightly whenever anything upstream in the shared RNG
    // sequence changes (e.g. a new traffic-generation draw added for an
    // unrelated entity), since this whole engine draws from one ordered
    // stream rather than per-concern substreams. The exploration
    // mechanism (see LoadBalancer.ts) keeps it from ever locking in
    // permanently, which is the actual property under test.
    expect(Math.abs(api1Requests - api2Requests) / total).toBeLessThan(0.2);
  });

  it("favors the faster target under least_response_time once targets diverge in speed", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "least_response_time" },
        },
        {
          id: "api1",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 2, processingJitterMs: 0, maxConcurrent: 50 },
        },
        {
          id: "api2",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 40, processingJitterMs: 0, maxConcurrent: 50 },
        },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);
    const distribution = result.metrics.entityMetrics.lb1.routingDistribution!;
    const api1Requests = distribution.find((d) => d.targetId === "api1")?.requests ?? 0;
    const api2Requests = distribution.find((d) => d.targetId === "api2")?.requests ?? 0;

    expect(api1Requests).toBeGreaterThan(api2Requests);
  });

  it("is deterministic under least_response_time for a given seed", () => {
    const config = configWithTwoAPIs({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "lb1",
          type: "load_balancer",
          position: { x: 0, y: 0 },
          config: { algorithm: "least_response_time" },
        },
        {
          id: "api1",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 2, processingJitterMs: 0 },
        },
        {
          id: "api2",
          type: "api",
          position: { x: 0, y: 0 },
          config: { processingTimeMs: 40, processingJitterMs: 0 },
        },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const a = runSimulation(config);
    const b = runSimulation(config);
    expect(a.events).toEqual(b.events);
  });
});
