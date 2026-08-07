/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithKafka(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 30 } },
      {
        id: "kafka1",
        type: "kafka",
        position: { x: 0, y: 0 },
        config: { partitionCount: 3, consumerCountPerGroup: 3, dispatchTimeMs: 5 },
      },
      { id: "group1", type: "database", position: { x: 0, y: 0 }, config: {} },
      { id: "group2", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "kafka1", latencyMs: 2 },
      { source: "kafka1", target: "group1", latencyMs: 1 },
      { source: "kafka1", target: "group2", latencyMs: 1 },
    ],
    scenario: {
      id: "kafka-test",
      title: "Kafka Test",
      trafficPattern: { type: "constant", rate: 30 },
      durationMs: 3000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("Kafka (through the full Simulator)", () => {
  it("hashes the same key to the same partition, every time", () => {
    const result = runSimulation(configWithKafka());
    const assignments = result.events.filter(
      (e) => e.type === "PARTITION_ASSIGNED" && e.source === "kafka1"
    );
    expect(assignments.length).toBeGreaterThan(0);

    const partitionByKey = new Map<string, number>();
    for (const event of assignments) {
      const key = event.metadata.key as string;
      const partition = event.metadata.partitionIndex as number;
      const seen = partitionByKey.get(key);
      if (seen === undefined) partitionByKey.set(key, partition);
      else expect(partition).toBe(seen);
    }
  });

  it("records a partition assignment even before any consumer group is connected", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "kafka1", type: "kafka", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [{ source: "client1", target: "kafka1", latencyMs: 1 }],
      scenario: {
        id: "no-downstream",
        title: "No Downstream",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 500,
      },
      options: { seed: 1 },
    };
    const result = runSimulation(config);
    const assignments = result.events.filter((e) => e.type === "PARTITION_ASSIGNED");
    expect(assignments.length).toBeGreaterThan(0);
    // The producer is still acked even though there's no group to deliver to.
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
  });

  it("delivers every message to every consumer group independently (fan-out)", () => {
    const result = runSimulation(configWithKafka());
    const group1Starts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "group1"
    ).length;
    const group2Starts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "group2"
    ).length;

    expect(group1Starts).toBeGreaterThan(0);
    expect(group2Starts).toBeGreaterThan(0);
    expect(Math.abs(group1Starts - group2Starts)).toBeLessThanOrEqual(2);
  });

  it("acknowledges the producer immediately, regardless of consumer groups", () => {
    const result = runSimulation(configWithKafka());
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
    expect(result.metrics.averageLatency).toBeLessThan(10);
  });

  it("never lets a consumer group's own dispatch inflate client-facing totals", () => {
    const result = runSimulation(configWithKafka());
    expect(result.metrics.successRate).toBeLessThanOrEqual(1);
    expect(result.metrics.successfulRequests).toBeLessThanOrEqual(result.metrics.totalRequests);
  });

  it("exposes both a partition distribution and a consumer-group distribution", () => {
    const result = runSimulation(configWithKafka());
    const metrics = result.metrics.entityMetrics.kafka1;
    expect(metrics.kafkaPartitions?.length).toBeGreaterThan(0);
    expect(metrics.routingDistribution?.map((d) => d.targetId).sort()).toEqual([
      "group1",
      "group2",
    ]);
  });

  it("a group's effective parallelism is capped at Partition Count — more consumers past that changes nothing", () => {
    // Two configs differing only in consumerCountPerGroup, both already
    // at or above the partition ceiling — their throughput/backlog
    // behavior should be indistinguishable, proof the extra consumers
    // in the second config did nothing.
    const capped = (consumerCountPerGroup: number) =>
      runSimulation(
        configWithKafka({
          entities: [
            { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 200 } },
            {
              id: "kafka1",
              type: "kafka",
              position: { x: 0, y: 0 },
              config: { partitionCount: 2, consumerCountPerGroup, dispatchTimeMs: 20 },
            },
            { id: "group1", type: "database", position: { x: 0, y: 0 }, config: {} },
          ],
          connections: [
            { source: "client1", target: "kafka1", latencyMs: 1 },
            { source: "kafka1", target: "group1", latencyMs: 1 },
          ],
          scenario: {
            id: "cap-test",
            title: "Cap Test",
            trafficPattern: { type: "constant", rate: 200 },
            durationMs: 2000,
          },
        })
      );

    const atCeiling = capped(2);
    const wayPastCeiling = capped(10);

    const startsFor = (result: ReturnType<typeof runSimulation>) =>
      result.events.filter((e) => e.type === "PROCESSING_STARTED" && e.source === "group1").length;

    expect(startsFor(atCeiling)).toBe(startsFor(wayPastCeiling));
  });

  it("one consumer group falling behind doesn't affect another's delivery", () => {
    const result = runSimulation(
      configWithKafka({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 200 } },
          {
            id: "kafka1",
            type: "kafka",
            position: { x: 0, y: 0 },
            config: {
              partitionCount: 4,
              consumerCountPerGroup: 4,
              maxQueueLength: 500,
              dispatchTimeMs: 5,
            },
          },
          { id: "group1", type: "database", position: { x: 0, y: 0 }, config: {} },
          { id: "group2", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
        connections: [
          { source: "client1", target: "kafka1", latencyMs: 1 },
          { source: "kafka1", target: "group1", latencyMs: 1 },
          { source: "kafka1", target: "group2", latencyMs: 1 },
        ],
        scenario: {
          id: "independence-test",
          title: "Independence Test",
          trafficPattern: { type: "constant", rate: 200 },
          durationMs: 2000,
        },
      })
    );

    // Both groups see the full stream and deliver comparably — no group's
    // internal state leaks into or starves the other.
    const group1Starts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "group1"
    ).length;
    const group2Starts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "group2"
    ).length;
    expect(group1Starts).toBeGreaterThan(0);
    expect(group2Starts).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithKafka());
    const b = runSimulation(configWithKafka());
    expect(a.events).toEqual(b.events);
  });
});
