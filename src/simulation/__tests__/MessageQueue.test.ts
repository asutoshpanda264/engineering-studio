/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithQueue(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 30 } },
      {
        id: "mq1",
        type: "message_queue",
        position: { x: 0, y: 0 },
        config: { consumerCount: 3, maxQueueLength: 500, dispatchTimeMs: 10 },
      },
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "mq1", latencyMs: 2 },
      { source: "mq1", target: "db1", latencyMs: 2 },
    ],
    scenario: {
      id: "mq-test",
      title: "Message Queue Test",
      trafficPattern: { type: "constant", rate: 30 },
      durationMs: 5000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("MessageQueue (through the full Simulator)", () => {
  it("acknowledges the producer without waiting for the consumer to finish", () => {
    const result = runSimulation(configWithQueue());
    expect(result.metrics.totalRequests).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.95);

    // The client-facing completion happens at enqueue time — far faster
    // than a real round trip through the database would take, since the
    // producer never waits on the consumer.
    expect(result.metrics.averageLatency).toBeLessThan(10);
  });

  it("never lets a queue-originated dispatch inflate client-facing totals", () => {
    // Chain the consumer leg through two more hops so multiple internal
    // REQUEST_COMPLETED/FAILED events get generated per message — if
    // those leaked into the client-facing counts, successRate could
    // exceed 1.0 or totals would run away from totalRequests.
    const result = runSimulation(
      configWithQueue({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 30 } },
          {
            id: "mq1",
            type: "message_queue",
            position: { x: 0, y: 0 },
            config: { consumerCount: 3, maxQueueLength: 500, dispatchTimeMs: 5 },
          },
          { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
        connections: [
          { source: "client1", target: "mq1", latencyMs: 2 },
          { source: "mq1", target: "api1", latencyMs: 1 },
          { source: "api1", target: "db1", latencyMs: 1 },
        ],
      })
    );

    expect(result.metrics.successRate).toBeLessThanOrEqual(1);
    expect(result.metrics.successfulRequests).toBeLessThanOrEqual(result.metrics.totalRequests);
    expect(result.metrics.failedRequests).toBeLessThanOrEqual(result.metrics.totalRequests);
  });

  it("actually delivers dispatched messages to the downstream consumer", () => {
    const result = runSimulation(configWithQueue());
    const dbStarts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "db1"
    );
    expect(dbStarts.length).toBeGreaterThan(0);
  });

  it("absorbs a burst into its backlog instead of rejecting outright, given enough headroom", () => {
    const result = runSimulation(
      configWithQueue({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 200 } },
          {
            id: "mq1",
            type: "message_queue",
            position: { x: 0, y: 0 },
            config: { consumerCount: 1, maxQueueLength: 5000, dispatchTimeMs: 20 },
          },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { maxConnections: 1 } },
        ],
        scenario: {
          id: "burst",
          title: "Burst",
          trafficPattern: { type: "constant", rate: 200 },
          durationMs: 2000,
        },
      })
    );

    // A single slow consumer could never keep up with 200 req/s directly,
    // but every producer-facing request still succeeds — the backlog
    // absorbed the burst instead of the producer seeing rejections.
    expect(result.metrics.successRate).toBeGreaterThan(0.99);
    const queued = result.events.filter((e) => e.type === "REQUEST_QUEUED" && e.source === "mq1");
    expect(queued.length).toBeGreaterThan(0);
  });

  it("applies backpressure — rejects the producer once the backlog itself is full", () => {
    const result = runSimulation(
      configWithQueue({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 200 } },
          {
            id: "mq1",
            type: "message_queue",
            position: { x: 0, y: 0 },
            config: { consumerCount: 1, maxQueueLength: 2, dispatchTimeMs: 50 },
          },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { maxConnections: 1 } },
        ],
        scenario: {
          id: "overload",
          title: "Overload",
          trafficPattern: { type: "constant", rate: 200 },
          durationMs: 2000,
        },
      })
    );

    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const fullEvents = result.events.filter((e) => e.type === "QUEUE_FULL" && e.source === "mq1");
    expect(fullEvents.length).toBeGreaterThan(0);
    const reasons = result.events
      .filter((e) => e.type === "REQUEST_FAILED")
      .map((e) => e.metadata.reason);
    expect(reasons).toContain("queue_full");
  });

  it("fails gracefully (and observably) when it has no downstream connection, without failing the producer", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "mq1", type: "message_queue", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [{ source: "client1", target: "mq1", latencyMs: 1 }],
      scenario: {
        id: "no-downstream",
        title: "No Downstream",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 1000,
      },
      options: { seed: 1 },
    };

    const result = runSimulation(config);
    // The producer was already acknowledged — this is the queue's own
    // local problem, not a client-facing failure.
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
    expect(result.metrics.failedRequests).toBe(0);
    expect(result.metrics.entityMetrics.mq1.errorCount).toBeGreaterThan(0);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithQueue());
    const b = runSimulation(configWithQueue());
    expect(a.events).toEqual(b.events);
  });
});
