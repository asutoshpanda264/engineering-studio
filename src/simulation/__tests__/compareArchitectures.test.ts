/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { removeEntityAndReroute } from "../engine/compareArchitectures";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function baseConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 5 } },
      { id: "cdn1", type: "cdn", position: { x: 0, y: 0 }, config: { edgeCount: 5, capacity: 20 } },
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "cdn1", latencyMs: 5 },
      { source: "cdn1", target: "db1", latencyMs: 100 },
    ],
    scenario: {
      id: "compare-test",
      title: "Compare Test",
      trafficPattern: { type: "constant", rate: 50 },
      durationMs: 8000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("removeEntityAndReroute", () => {
  it("removes the entity and reconnects its predecessors straight to its successor", () => {
    const config = baseConfig();
    const result = removeEntityAndReroute(config, "cdn1");

    expect(result).not.toBeNull();
    expect(result!.entities.map((e) => e.id)).toEqual(["client1", "db1"]);
    expect(result!.connections).toEqual([
      { source: "client1", target: "db1", latencyMs: 100 },
    ]);
  });

  it("uses the removed entity's outgoing latency, not its incoming latency", () => {
    // The whole point: bypassing a CDN should reflect the true distance
    // to the origin (100ms) — not the short hop to the nearest edge (5ms),
    // which would make "without CDN" look unrealistically fast.
    const config = baseConfig();
    const result = removeEntityAndReroute(config, "cdn1");
    expect(result!.connections[0].latencyMs).toBe(100);
    expect(result!.connections[0].latencyMs).not.toBe(5);
  });

  it("reroutes every predecessor when multiple entities feed the removed one", () => {
    const config = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "lb1", type: "load_balancer", position: { x: 0, y: 0 }, config: {} },
        { id: "cdn1", type: "cdn", position: { x: 0, y: 0 }, config: {} },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [
        { source: "client1", target: "cdn1", latencyMs: 5 },
        { source: "lb1", target: "cdn1", latencyMs: 8 },
        { source: "cdn1", target: "db1", latencyMs: 100 },
      ],
    });
    const result = removeEntityAndReroute(config, "cdn1");

    const targets = result!.connections.map((c) => `${c.source}->${c.target}`);
    expect(targets).toContain("client1->db1");
    expect(targets).toContain("lb1->db1");
    expect(result!.connections).toHaveLength(2);
  });

  it("returns null for an unknown entity id", () => {
    expect(removeEntityAndReroute(baseConfig(), "does-not-exist")).toBeNull();
  });

  it("returns null when the entity has no outgoing connection", () => {
    const config = baseConfig({
      connections: [{ source: "client1", target: "cdn1", latencyMs: 5 }],
    });
    expect(removeEntityAndReroute(config, "cdn1")).toBeNull();
  });

  it("returns null when the entity has no incoming connection", () => {
    const config = baseConfig({
      connections: [{ source: "cdn1", target: "db1", latencyMs: 100 }],
    });
    expect(removeEntityAndReroute(config, "cdn1")).toBeNull();
  });
});

describe("CDN vs. no-CDN comparison (real, run twice)", () => {
  it("shows lower average latency with the CDN than without it, for repetitive traffic", () => {
    const config = baseConfig();
    const bypassed = removeEntityAndReroute(config, "cdn1")!;

    const withCDN = runSimulation(config);
    const withoutCDN = runSimulation(bypassed);

    // Small key pool -> most requests hit an edge and skip the 100ms trip
    // to origin entirely, so the CDN run should be meaningfully faster.
    expect(withCDN.metrics.averageLatency).toBeLessThan(withoutCDN.metrics.averageLatency);
  });

  it("both runs see identical traffic — same seed, same request count", () => {
    const config = baseConfig();
    const bypassed = removeEntityAndReroute(config, "cdn1")!;

    const withCDN = runSimulation(config);
    const withoutCDN = runSimulation(bypassed);

    expect(withCDN.metrics.totalRequests).toBe(withoutCDN.metrics.totalRequests);
  });
});
