/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { collectMetrics } from "../metrics/MetricsCollector";
import {
  createCacheAccessEvent,
  createGuardrailEvaluatedEvent,
  createRequestDequeuedEvent,
  createRequestFailedEvent,
  createRequestQueuedEvent,
  createRequestRoutedEvent,
  createProcessingStartedEvent,
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

describe("collectMetrics — totalIterations (docs/Agentic_AI.md §2.5)", () => {
  it("is undefined when no agentOrchestratorIds are given", () => {
    const events: SimulationEvent[] = [
      createProcessingStartedEvent(10, "orch1", "r1"),
      createRequestRoutedEvent(10, "orch1", "tool1", "r1", { direction: "request" }),
    ];
    const metrics = collectMetrics(events, ["orch1", "tool1"], 1000);
    expect(metrics.totalIterations).toBeUndefined();
  });

  it("is 0 when every session dispatches exactly once — no retries or fan-out", () => {
    const events: SimulationEvent[] = [
      createProcessingStartedEvent(10, "orch1", "r1"),
      createRequestRoutedEvent(10, "orch1", "tool1", "r1", { direction: "request" }),
      createProcessingStartedEvent(20, "orch1", "r2"),
      createRequestRoutedEvent(20, "orch1", "tool1", "r2", { direction: "request" }),
    ];
    const metrics = collectMetrics(events, ["orch1", "tool1"], 1000, [], ["orch1"]);
    expect(metrics.totalIterations).toBe(0);
  });

  it("counts dispatches beyond one-per-session as iterations — a retry loop's own signature", () => {
    // One admitted session (r1), retried against tool1 three times total.
    const events: SimulationEvent[] = [
      createProcessingStartedEvent(10, "orch1", "r1"),
      createRequestRoutedEvent(10, "orch1", "tool1", "r1", { direction: "request" }),
      createRequestRoutedEvent(20, "orch1", "tool1", "r1", { direction: "request" }),
      createRequestRoutedEvent(30, "orch1", "tool1", "r1", { direction: "request" }),
    ];
    const metrics = collectMetrics(events, ["orch1", "tool1"], 1000, [], ["orch1"]);
    expect(metrics.totalIterations).toBe(2); // 3 dispatches - 1 session
  });

  it("sums across every orchestrator id given", () => {
    const events: SimulationEvent[] = [
      createProcessingStartedEvent(10, "orch1", "r1"),
      createRequestRoutedEvent(10, "orch1", "tool1", "r1", { direction: "request" }),
      createRequestRoutedEvent(20, "orch1", "tool1", "r1", { direction: "request" }),
      createProcessingStartedEvent(10, "orch2", "r2"),
      createRequestRoutedEvent(10, "orch2", "tool1", "r2", { direction: "request" }),
      createRequestRoutedEvent(20, "orch2", "tool1", "r2", { direction: "request" }),
      createRequestRoutedEvent(30, "orch2", "tool1", "r2", { direction: "request" }),
    ];
    const metrics = collectMetrics(events, ["orch1", "orch2", "tool1"], 1000, [], [
      "orch1",
      "orch2",
    ]);
    expect(metrics.totalIterations).toBe(1 + 2); // orch1: 2-1=1, orch2: 3-1=2
  });
});

describe("collectMetrics — guardrailRejectionRate (docs/Agentic_AI.md §2.5)", () => {
  it("is undefined when no guardrailValidatorIds are given", () => {
    const events: SimulationEvent[] = [
      createGuardrailEvaluatedEvent(10, "guard1", "r1", false, "guardrail_rejected"),
    ];
    const metrics = collectMetrics(events, ["guard1"], 1000);
    expect(metrics.guardrailRejectionRate).toBeUndefined();
  });

  it("is 0 when every check passed", () => {
    const events: SimulationEvent[] = [
      createGuardrailEvaluatedEvent(10, "guard1", "r1", true, null),
      createGuardrailEvaluatedEvent(20, "guard1", "r2", true, null),
    ];
    const metrics = collectMetrics(events, ["guard1"], 1000, [], [], ["guard1"]);
    expect(metrics.guardrailRejectionRate).toBe(0);
  });

  it("divides rejections by total checks, not just failures", () => {
    const events: SimulationEvent[] = [
      createGuardrailEvaluatedEvent(10, "guard1", "r1", false, "guardrail_rejected"),
      createGuardrailEvaluatedEvent(20, "guard1", "r2", true, null),
      createGuardrailEvaluatedEvent(30, "guard1", "r3", true, null),
      createGuardrailEvaluatedEvent(40, "guard1", "r4", true, null),
    ];
    const metrics = collectMetrics(events, ["guard1"], 1000, [], [], ["guard1"]);
    expect(metrics.guardrailRejectionRate).toBe(0.25);
  });

  it("correctly counts a guardrail deep in a chain (not client-adjacent) — the real bug this marker fixes", () => {
    // A guardrail wired inside an orchestrator's retry loop never itself
    // emits REQUEST_FAILED — only whichever entity is client-adjacent
    // does, attributed to *that* entity. GUARDRAIL_EVALUATED sidesteps
    // this entirely by having the guardrail report its own outcome.
    const events: SimulationEvent[] = [
      createGuardrailEvaluatedEvent(10, "guard1", "r1", false, "guardrail_rejected"),
      createRequestFailedEvent(15, "orch1", "client1", "r1", "iteration_limit_exceeded"),
    ];
    const metrics = collectMetrics(events, ["orch1", "guard1"], 1000, [], ["orch1"], ["guard1"]);
    expect(metrics.guardrailRejectionRate).toBe(1);
  });
});
