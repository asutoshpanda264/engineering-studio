/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function baseConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
      { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "api1", latencyMs: 5 },
      { source: "api1", target: "db1", latencyMs: 2 },
    ],
    scenario: {
      id: "test-scenario",
      title: "Test",
      trafficPattern: { type: "constant", rate: 50 },
      durationMs: 2000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("runSimulation — Client -> API -> Database", () => {
  it("carries requests end-to-end with a mostly-successful outcome under light load", () => {
    const result = runSimulation(baseConfig());

    expect(result.metrics.totalRequests).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
    expect(result.metrics.averageLatency).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });

  it("brackets the event log with SIMULATION_STARTED and SIMULATION_FINISHED", () => {
    const result = runSimulation(baseConfig());
    expect(result.events[0].type).toBe("SIMULATION_STARTED");
    expect(result.events[result.events.length - 1].type).toBe(
      "SIMULATION_FINISHED"
    );
  });

  it("keeps the event log in non-decreasing timestamp order", () => {
    const result = runSimulation(baseConfig());
    for (let i = 1; i < result.events.length; i++) {
      expect(result.events[i].timestamp).toBeGreaterThanOrEqual(
        result.events[i - 1].timestamp
      );
    }
  });

  it("is fully deterministic for a given seed", () => {
    const a = runSimulation(baseConfig());
    const b = runSimulation(baseConfig());

    expect(a.events).toEqual(b.events);
    expect(a.metrics).toEqual(b.metrics);
  });

  it("produces a different (but still valid) run for a different seed", () => {
    const a = runSimulation(baseConfig({ options: { seed: 1 } }));
    const b = runSimulation(baseConfig({ options: { seed: 2 } }));

    expect(a.events).not.toEqual(b.events);
  });

  it("computes utilization for the database within [0, 1]", () => {
    const result = runSimulation(baseConfig());
    const dbMetrics = result.metrics.entityMetrics["db1"];
    expect(dbMetrics.utilization).toBeGreaterThan(0);
    expect(dbMetrics.utilization).toBeLessThanOrEqual(1);
  });

  it("warns instead of crashing when there is no client", () => {
    const config = baseConfig();
    config.entities = config.entities.filter((e) => e.type !== "client");

    const result = runSimulation(config);
    expect(result.warnings).toContain(
      "No client entity found; no requests were generated."
    );
    expect(result.metrics.totalRequests).toBe(0);
  });

  it("rejects requests under backpressure instead of queueing forever", () => {
    const config = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        {
          id: "db1",
          type: "database",
          position: { x: 0, y: 0 },
          config: { maxConnections: 1, maxQueueLength: 0, processingTimeMs: 50 },
        },
      ],
      scenario: {
        id: "overload",
        title: "Overload",
        trafficPattern: { type: "constant", rate: 200 },
        durationMs: 2000,
      },
    });

    const result = runSimulation(config);
    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const failedEvents = result.events.filter((e) => e.type === "REQUEST_FAILED");
    expect(
      failedEvents.some((e) => e.metadata.reason === "database_busy")
    ).toBe(true);
  });

  it("queues requests under backpressure and drains the backlog to zero by the end", () => {
    const config = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        {
          id: "api1",
          type: "api",
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 1, maxQueueLength: 20, processingTimeMs: 50 },
        },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
      scenario: {
        id: "queueing",
        title: "Queueing",
        trafficPattern: { type: "constant", rate: 100 },
        durationMs: 1000,
      },
    });

    const result = runSimulation(config);

    const queued = result.events.filter(
      (e) => e.type === "REQUEST_QUEUED" && e.source === "api1"
    );
    const dequeued = result.events.filter(
      (e) => e.type === "REQUEST_DEQUEUED" && e.source === "api1"
    );
    expect(queued.length).toBeGreaterThan(0);
    // The discrete-event loop only stops once every scheduled event has been
    // processed, so nothing can be left sitting in the backlog at the end.
    expect(dequeued.length).toBe(queued.length);
    expect(result.metrics.entityMetrics.api1.queueLength).toBe(0);
  });
});
