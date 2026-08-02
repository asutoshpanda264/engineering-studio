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
});
