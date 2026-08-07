/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { collectMetrics } from "../metrics/MetricsCollector";
import {
  createCacheAccessEvent,
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

describe("collectMetrics — cachePenetration", () => {
  it("is absent when no miss was ever tagged notFound", () => {
    const events: SimulationEvent[] = [
      createCacheAccessEvent("CACHE_HIT", 10, "cache1", "r1", "A", true),
      createCacheAccessEvent("CACHE_MISS", 20, "cache1", "r2", "B", false),
    ];
    const metrics = collectMetrics(events, ["cache1"], 1000);
    expect(metrics.entityMetrics.cache1.cachePenetration).toBeUndefined();
  });

  it("counts a downstream-hitting not-found miss, not tagged negative or coalesced", () => {
    const events: SimulationEvent[] = [
      createCacheAccessEvent("CACHE_MISS", 10, "cache1", "r1", "missing_0", false, {
        notFound: true,
      }),
    ];
    const metrics = collectMetrics(events, ["cache1"], 1000);
    expect(metrics.entityMetrics.cache1.cachePenetration).toEqual({
      negativeHits: 0,
      downstreamMisses: 1,
    });
  });

  it("counts a negative-cache hit separately from a downstream-hitting miss", () => {
    const events: SimulationEvent[] = [
      createCacheAccessEvent("CACHE_MISS", 10, "cache1", "r1", "missing_0", false, {
        notFound: true,
      }),
      createCacheAccessEvent("CACHE_MISS", 20, "cache1", "r2", "missing_0", false, {
        notFound: true,
        negative: true,
      }),
    ];
    const metrics = collectMetrics(events, ["cache1"], 1000);
    expect(metrics.entityMetrics.cache1.cachePenetration).toEqual({
      negativeHits: 1,
      downstreamMisses: 1,
    });
  });

  it("excludes a coalesced-onto-a-not-found-leader miss from downstreamMisses", () => {
    const events: SimulationEvent[] = [
      createCacheAccessEvent("CACHE_MISS", 10, "cache1", "r1", "missing_0", false, {
        notFound: true,
      }),
      createCacheAccessEvent("CACHE_MISS", 10, "cache1", "r2", "missing_0", false, {
        notFound: true,
        coalesced: true,
      }),
    ];
    const metrics = collectMetrics(events, ["cache1"], 1000);
    // Only the leader (r1) independently reached downstream; the follower
    // (r2) shared its outcome without its own trip and isn't a
    // negative-cache hit either — neither bucket should count it.
    expect(metrics.entityMetrics.cache1.cachePenetration).toEqual({
      negativeHits: 0,
      downstreamMisses: 1,
    });
  });

  it("also subtracts negativeHits out of cacheStampede's independentMisses", () => {
    const events: SimulationEvent[] = [
      createCacheAccessEvent("CACHE_MISS", 10, "cache1", "r1", "missing_0", false, {
        notFound: true,
      }),
      createCacheAccessEvent("CACHE_MISS", 20, "cache1", "r2", "missing_0", false, {
        notFound: true,
        negative: true,
      }),
    ];
    const metrics = collectMetrics(events, ["cache1"], 1000);
    expect(metrics.entityMetrics.cache1.cacheStampede).toEqual({
      coalescedMisses: 0,
      independentMisses: 1,
    });
  });
});

describe("collectMetrics — cacheAvalanche", () => {
  it("is absent when no miss was ever tagged expired", () => {
    const events: SimulationEvent[] = [
      createCacheAccessEvent("CACHE_MISS", 10, "cache1", "r1", "A", false),
    ];
    const metrics = collectMetrics(events, ["cache1"], 1000);
    expect(metrics.entityMetrics.cache1.cacheAvalanche).toBeUndefined();
  });

  it("reports a peak burst of 1 for expiry misses spread well outside the burst window", () => {
    const events: SimulationEvent[] = [
      createCacheAccessEvent("CACHE_MISS", 0, "cache1", "r1", "A", false, { expired: true }),
      createCacheAccessEvent("CACHE_MISS", 500, "cache1", "r2", "B", false, { expired: true }),
      createCacheAccessEvent("CACHE_MISS", 1000, "cache1", "r3", "C", false, { expired: true }),
    ];
    const metrics = collectMetrics(events, ["cache1"], 2000);
    expect(metrics.entityMetrics.cache1.cacheAvalanche).toEqual({
      expiredMisses: 3,
      peakExpiryBurst: 1,
    });
  });

  it("reports a peak burst matching the largest cluster within a 100ms window", () => {
    const events: SimulationEvent[] = [
      // A tight cluster of 4, all within 100ms of each other.
      createCacheAccessEvent("CACHE_MISS", 300, "cache1", "r1", "A", false, { expired: true }),
      createCacheAccessEvent("CACHE_MISS", 320, "cache1", "r2", "B", false, { expired: true }),
      createCacheAccessEvent("CACHE_MISS", 350, "cache1", "r3", "C", false, { expired: true }),
      createCacheAccessEvent("CACHE_MISS", 400, "cache1", "r4", "D", false, { expired: true }),
      // A lone, unrelated expiry far outside that cluster.
      createCacheAccessEvent("CACHE_MISS", 900, "cache1", "r5", "E", false, { expired: true }),
    ];
    const metrics = collectMetrics(events, ["cache1"], 2000);
    expect(metrics.entityMetrics.cache1.cacheAvalanche).toEqual({
      expiredMisses: 5,
      peakExpiryBurst: 4,
    });
  });

  it("does not confuse an ordinary (non-expiry) miss with an expiry-driven one", () => {
    const events: SimulationEvent[] = [
      createCacheAccessEvent("CACHE_MISS", 10, "cache1", "r1", "A", false),
      createCacheAccessEvent("CACHE_MISS", 20, "cache1", "r2", "A", false, { expired: true }),
    ];
    const metrics = collectMetrics(events, ["cache1"], 1000);
    expect(metrics.entityMetrics.cache1.cacheAvalanche).toEqual({
      expiredMisses: 1,
      peakExpiryBurst: 1,
    });
  });
});
