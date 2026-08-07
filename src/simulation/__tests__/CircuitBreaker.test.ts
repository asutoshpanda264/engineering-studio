/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithCircuitBreaker(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      {
        id: "cb1",
        type: "circuit_breaker",
        position: { x: 0, y: 0 },
        config: { failureThreshold: 5, tripDurationMs: 500, halfOpenMaxProbes: 1 },
      },
      // failureProbability: 1 gives a deterministic, always-failing
      // downstream — the simplest way to force a real trip.
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { failureProbability: 1 } },
    ],
    connections: [
      { source: "client1", target: "cb1", latencyMs: 1 },
      { source: "cb1", target: "db1", latencyMs: 1 },
    ],
    scenario: {
      id: "circuit-breaker-test",
      title: "Circuit Breaker Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 3000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("CircuitBreaker", () => {
  it("trips open after failureThreshold consecutive failures from the wrapped target", () => {
    const result = runSimulation(configWithCircuitBreaker());
    const openedEvents = result.events.filter((e) => e.type === "CIRCUIT_OPENED");
    expect(openedEvents.length).toBeGreaterThan(0);
    expect(result.metrics.entityMetrics.cb1.circuitBreaker?.tripCount).toBeGreaterThan(0);
  });

  it("fails every request instantly while open, without ever forwarding to the target", () => {
    const result = runSimulation(configWithCircuitBreaker());
    const firstOpened = result.events.find((e) => e.type === "CIRCUIT_OPENED");
    expect(firstOpened).toBeDefined();

    // Every REQUEST_ROUTED reaching db1 (direction: request) after the
    // trip, before the breaker's tripDurationMs has elapsed, would mean
    // the breaker let something through while it should have been
    // failing fast.
    const routedToDbWhileOpen = result.events.filter(
      (e) =>
        e.type === "REQUEST_ROUTED" &&
        e.destination === "db1" &&
        e.metadata.direction === "request" &&
        e.timestamp > firstOpened!.timestamp &&
        e.timestamp < firstOpened!.timestamp + 500 // tripDurationMs
    );
    expect(routedToDbWhileOpen.length).toBe(0);

    const failedEvents = result.events.filter((e) => e.type === "REQUEST_FAILED");
    expect(failedEvents.some((e) => e.metadata.reason === "circuit_open")).toBe(true);
  });

  it("never trips, and reports itself closed, when the target never fails", () => {
    const result = runSimulation(
      configWithCircuitBreaker({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
          {
            id: "cb1",
            type: "circuit_breaker",
            position: { x: 0, y: 0 },
            config: { failureThreshold: 5, tripDurationMs: 500, halfOpenMaxProbes: 1 },
          },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { failureProbability: 0 } },
        ],
      })
    );
    expect(result.events.some((e) => e.type === "CIRCUIT_OPENED")).toBe(false);
    expect(result.metrics.entityMetrics.cb1.circuitBreaker?.state).toBe("closed");
    expect(result.metrics.entityMetrics.cb1.circuitBreaker?.tripCount).toBe(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
  });

  it("closes again once a half-open probe genuinely succeeds", () => {
    // A target that fails only sometimes (not always): frequently enough
    // to trip the breaker, but with a real chance any given probe —
    // including a half-open one — succeeds. tripDurationMs is short so
    // several open/probe cycles fit inside the run.
    const result = runSimulation(
      configWithCircuitBreaker({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 30 } },
          {
            id: "cb1",
            type: "circuit_breaker",
            position: { x: 0, y: 0 },
            config: { failureThreshold: 3, tripDurationMs: 50, halfOpenMaxProbes: 1 },
          },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { failureProbability: 0.5 } },
        ],
        scenario: {
          id: "circuit-breaker-recovery-test",
          title: "Circuit Breaker Recovery Test",
          trafficPattern: { type: "constant", rate: 30 },
          durationMs: 5000,
        },
      })
    );

    const closedEvents = result.events.filter((e) => e.type === "CIRCUIT_CLOSED");
    // Index 0 is always the one-time initial-state marker (see
    // CircuitBreaker.ts) — a second one only happens via a real
    // half-open-probe-succeeded transition.
    expect(closedEvents.length).toBeGreaterThan(1);
    expect(result.events.some((e) => e.type === "CIRCUIT_OPENED")).toBe(true);
  });

  it("reopens immediately if the half-open probe itself fails", () => {
    const result = runSimulation(configWithCircuitBreaker());
    const openedEvents = result.events.filter((e) => e.type === "CIRCUIT_OPENED");
    const halfOpenedEvents = result.events.filter((e) => e.type === "CIRCUIT_HALF_OPENED");

    // The target always fails (failureProbability: 1), so every probe
    // must fail too — every half-open should be followed by a re-open,
    // meaning at least as many opens as half-opens (the first open has
    // no preceding half-open, since it comes from the initial trip).
    expect(halfOpenedEvents.length).toBeGreaterThan(0);
    expect(openedEvents.length).toBeGreaterThanOrEqual(halfOpenedEvents.length);
    // The only CIRCUIT_CLOSED should be the one-time "starting state"
    // marker emitted on the very first request (see CircuitBreaker.ts) —
    // a real close-from-half-open transition never happens here, since
    // every probe fails too.
    const closedEvents = result.events.filter((e) => e.type === "CIRCUIT_CLOSED");
    expect(closedEvents.length).toBe(1);
    expect(closedEvents[0].timestamp).toBeLessThan(halfOpenedEvents[0].timestamp);
  });

  it("fails gracefully when it has no downstream connection", () => {
    const config = configWithCircuitBreaker({
      connections: [{ source: "client1", target: "cb1", latencyMs: 1 }],
    });
    const result = runSimulation(config);

    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const failedEvents = result.events.filter((e) => e.type === "REQUEST_FAILED");
    expect(
      failedEvents.some((e) => e.metadata.reason === "no_downstream_connection")
    ).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithCircuitBreaker());
    const b = runSimulation(configWithCircuitBreaker());
    expect(a.events).toEqual(b.events);
  });
});
