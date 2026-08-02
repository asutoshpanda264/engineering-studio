/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { collectMetrics } from "../metrics/MetricsCollector";
import {
  createRequestDequeuedEvent,
  createRequestQueuedEvent,
} from "../events/EventFactory";
import type { SimulationEvent } from "../events/types";

describe("collectMetrics — queueLength", () => {
  it("is 0 for an entity with no queue activity", () => {
    const metrics = collectMetrics([], ["api1"], 1000);
    expect(metrics.entityMetrics.api1.queueLength).toBe(0);
  });

  it("nets queued against dequeued events for the same entity", () => {
    const events: SimulationEvent[] = [
      createRequestQueuedEvent(10, "api1", "r1"),
      createRequestQueuedEvent(20, "api1", "r2"),
      createRequestQueuedEvent(30, "api1", "r3"),
      createRequestDequeuedEvent(40, "api1", "r1"),
    ];
    const metrics = collectMetrics(events, ["api1"], 1000);
    expect(metrics.entityMetrics.api1.queueLength).toBe(2);
  });

  it("reflects only events present in the given slice — the 'as of a point in time' contract PlaybackController relies on", () => {
    const all: SimulationEvent[] = [
      createRequestQueuedEvent(10, "api1", "r1"),
      createRequestQueuedEvent(20, "api1", "r2"),
      createRequestDequeuedEvent(30, "api1", "r1"),
      createRequestDequeuedEvent(40, "api1", "r2"),
    ];

    // "As of" t=35: r1 has been dequeued, r2 is still waiting.
    const midway = all.filter((e) => e.timestamp <= 35);
    expect(collectMetrics(midway, ["api1"], 35).entityMetrics.api1.queueLength).toBe(1);

    // "As of" the full log: everything queued has since been dequeued.
    expect(collectMetrics(all, ["api1"], 40).entityMetrics.api1.queueLength).toBe(0);
  });

  it("keeps separate entities' queue activity independent", () => {
    const events: SimulationEvent[] = [
      createRequestQueuedEvent(10, "api1", "r1"),
      createRequestQueuedEvent(10, "db1", "r2"),
      createRequestQueuedEvent(20, "db1", "r3"),
      createRequestDequeuedEvent(30, "db1", "r2"),
    ];
    const metrics = collectMetrics(events, ["api1", "db1"], 1000);
    expect(metrics.entityMetrics.api1.queueLength).toBe(1);
    expect(metrics.entityMetrics.db1.queueLength).toBe(1);
  });

  it("never goes negative even if given an unpaired dequeue", () => {
    const events: SimulationEvent[] = [createRequestDequeuedEvent(10, "api1", "r1")];
    const metrics = collectMetrics(events, ["api1"], 1000);
    expect(metrics.entityMetrics.api1.queueLength).toBe(0);
  });
});
