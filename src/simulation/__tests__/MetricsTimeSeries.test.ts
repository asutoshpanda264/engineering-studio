/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { computeMetricsTimeSeries } from "../metrics/MetricsTimeSeries";
import {
  createRequestCompletedEvent,
  createRequestFailedEvent,
} from "../events/EventFactory";
import type { SimulationEvent } from "../events/types";

describe("computeMetricsTimeSeries", () => {
  it("returns one point per bucket, spanning the full duration", () => {
    const series = computeMetricsTimeSeries([], 1000, 10);
    expect(series).toHaveLength(10);
    expect(series[0].time).toBe(0);
    expect(series[9].time).toBe(900);
  });

  it("returns an empty series for a non-positive duration or bucket count", () => {
    expect(computeMetricsTimeSeries([], 0, 10)).toEqual([]);
    expect(computeMetricsTimeSeries([], 1000, 0)).toEqual([]);
  });

  it("scopes each bucket to its own time window, not a running cumulative total", () => {
    const events: SimulationEvent[] = [
      createRequestCompletedEvent(50, "api", "client", "r1", 20),
      createRequestCompletedEvent(150, "api", "client", "r2", 30),
    ];
    // 2 buckets of 100ms: [0,100) and [100,200)
    const series = computeMetricsTimeSeries(events, 200, 2);

    expect(series[0].successRate).toBe(1);
    expect(series[0].averageLatency).toBe(20);
    expect(series[1].successRate).toBe(1);
    expect(series[1].averageLatency).toBe(30);
  });

  it("computes success rate from resolved (completed + failed) requests within the bucket", () => {
    const events: SimulationEvent[] = [
      createRequestCompletedEvent(10, "api", "client", "r1", 5),
      createRequestCompletedEvent(20, "api", "client", "r2", 5),
      createRequestFailedEvent(30, "api", "client", "r3", "capacity_exceeded"),
    ];
    const series = computeMetricsTimeSeries(events, 100, 1);
    expect(series[0].successRate).toBeCloseTo(2 / 3);
  });

  it("is 0 success rate (not NaN) for a bucket with no resolved requests", () => {
    const series = computeMetricsTimeSeries([], 1000, 10);
    for (const point of series) {
      expect(point.successRate).toBe(0);
      expect(point.averageLatency).toBe(0);
      expect(point.p95Latency).toBe(0);
      expect(point.throughput).toBe(0);
    }
  });

  it("computes throughput as completions per second within the bucket", () => {
    const events: SimulationEvent[] = [
      createRequestCompletedEvent(10, "api", "client", "r1", 5),
      createRequestCompletedEvent(20, "api", "client", "r2", 5),
    ];
    // Single 500ms bucket, 2 completions -> 4 req/s.
    const series = computeMetricsTimeSeries(events, 500, 1);
    expect(series[0].throughput).toBe(4);
  });

  it("clamps an event at exactly the final timestamp into the last bucket", () => {
    const events: SimulationEvent[] = [
      createRequestCompletedEvent(1000, "api", "client", "r1", 5),
    ];
    const series = computeMetricsTimeSeries(events, 1000, 10);
    expect(series[9].successRate).toBe(1);
  });
});
