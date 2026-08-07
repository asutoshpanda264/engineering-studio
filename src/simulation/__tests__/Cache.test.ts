/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import { Cache } from "../entities/Cache";
import type { EvictionPolicy } from "../entities/Cache";
import { RNG } from "../engine/RNG";
import { createRequestRoutedEvent } from "../events/EventFactory";
import type { SimulationContext } from "../entities/Entity";
import type { RequestLifecycleMetadata, SimulationEvent } from "../events/types";
import type { SimulationConfig } from "../types";

// ---- Direct entity-level harness ----
// Drives the Cache through its actual public contract (handleEvent) with
// hand-picked keys and timing, bypassing the probabilistic traffic
// generator entirely — this is what lets the eviction tests below assert
// exact, not just statistical, outcomes.

let requestCounter = 0;

function makeContext(now: number, downstream: string[] = ["db1"]): SimulationContext {
  return {
    now,
    rng: new RNG(1),
    downstream,
    latencyTo: () => 1,
  };
}

/** Sends key `key` through the cache and fully resolves it (miss forwards to
 * "db1" and is immediately answered; a hit answers directly) — leaving the
 * cache's internal store exactly as it would be after one real request. */
function put(cache: Cache, key: string, now: number): { hit: boolean } {
  const requestId = `req_${++requestCounter}`;
  const arrival = createRequestRoutedEvent(now, "client1", cache.id, requestId, {
    startedAt: now,
    direction: "request",
    path: ["client1"],
    key,
  } satisfies RequestLifecycleMetadata);

  const afterArrival = cache.handleEvent(arrival, makeContext(now));
  const processingCompleted = afterArrival.find((e) => e.type === "PROCESSING_COMPLETED");
  const cacheAccess = afterArrival.find(
    (e) => e.type === "CACHE_HIT" || e.type === "CACHE_MISS"
  );
  const hit = cacheAccess?.type === "CACHE_HIT";
  if (!processingCompleted) throw new Error("cache did not schedule completion");

  const afterFirstComplete = cache.handleEvent(
    processingCompleted,
    makeContext(processingCompleted.timestamp)
  );

  if (hit) return { hit: true };

  // Miss: afterFirstComplete contains the forward-to-downstream event.
  // Simulate the downstream answering it immediately.
  const forwarded = afterFirstComplete.find((e) => e.type === "REQUEST_ROUTED");
  if (!forwarded) throw new Error("cache did not forward the miss downstream");

  const response = createRequestRoutedEvent(
    forwarded.timestamp + 1,
    "db1",
    cache.id,
    requestId,
    { ...(forwarded.metadata as RequestLifecycleMetadata), direction: "response" }
  );
  const afterResponseArrival = cache.handleEvent(response, makeContext(response.timestamp));
  const responseCompleted = afterResponseArrival.find((e) => e.type === "PROCESSING_COMPLETED");
  if (!responseCompleted) throw new Error("cache did not schedule storing the response");
  cache.handleEvent(responseCompleted, makeContext(responseCompleted.timestamp));

  return { hit: false };
}

/** Like `put`, but the downstream reply is a failure, not data — confirms
 * a failed fetch on a miss (see Milestone 0's failure-routing fix) isn't
 * mistaken for something worth caching. */
function putFailed(cache: Cache, key: string, now: number): void {
  const requestId = `req_${++requestCounter}`;
  const arrival = createRequestRoutedEvent(now, "client1", cache.id, requestId, {
    startedAt: now,
    direction: "request",
    path: ["client1"],
    key,
  } satisfies RequestLifecycleMetadata);

  const afterArrival = cache.handleEvent(arrival, makeContext(now));
  const processingCompleted = afterArrival.find((e) => e.type === "PROCESSING_COMPLETED");
  if (!processingCompleted) throw new Error("cache did not schedule completion");

  const afterFirstComplete = cache.handleEvent(
    processingCompleted,
    makeContext(processingCompleted.timestamp)
  );
  const forwarded = afterFirstComplete.find((e) => e.type === "REQUEST_ROUTED");
  if (!forwarded) throw new Error("cache did not forward the miss downstream");

  const response = createRequestRoutedEvent(
    forwarded.timestamp + 1,
    "db1",
    cache.id,
    requestId,
    {
      ...(forwarded.metadata as RequestLifecycleMetadata),
      direction: "response",
      failed: true,
      failureReason: "query_failed",
    }
  );
  const afterResponseArrival = cache.handleEvent(response, makeContext(response.timestamp));
  const responseCompleted = afterResponseArrival.find((e) => e.type === "PROCESSING_COMPLETED");
  if (!responseCompleted) throw new Error("cache did not schedule the failure response");
  cache.handleEvent(responseCompleted, makeContext(responseCompleted.timestamp));
}

function isHit(events: SimulationEvent[]): boolean {
  return events.some((e) => e.type === "CACHE_HIT");
}

/** Just checks hit/miss for `key` without needing to resolve a miss further. */
function get(cache: Cache, key: string, now: number): boolean {
  const requestId = `req_${++requestCounter}`;
  const arrival = createRequestRoutedEvent(now, "client1", cache.id, requestId, {
    startedAt: now,
    direction: "request",
    path: ["client1"],
    key,
  } satisfies RequestLifecycleMetadata);
  return isHit(cache.handleEvent(arrival, makeContext(now)));
}

function makeCache(policy: EvictionPolicy, capacity: number): Cache {
  return new Cache("cache1", { capacity, evictionPolicy: policy, maxConcurrent: 100 });
}

describe("Cache eviction policies (direct entity harness)", () => {
  it("FIFO evicts the oldest inserted key regardless of recent access", () => {
    const cache = makeCache("fifo", 2);
    put(cache, "A", 0);
    put(cache, "B", 10);
    // Access A again — FIFO doesn't care, A was still inserted first.
    expect(get(cache, "A", 20)).toBe(true);
    put(cache, "C", 30); // capacity 2 exceeded -> evicts A (oldest insert), not B

    expect(get(cache, "B", 40)).toBe(true); // still present
    expect(get(cache, "A", 50)).toBe(false); // evicted despite recent access
  });

  it("LRU evicts the least recently used key — recent access protects it", () => {
    const cache = makeCache("lru", 2);
    put(cache, "A", 0);
    put(cache, "B", 10);
    // Touch A so B becomes the least-recently-used entry.
    expect(get(cache, "A", 20)).toBe(true);
    put(cache, "C", 30); // evicts B, not A

    expect(get(cache, "A", 40)).toBe(true); // protected by the recent touch
    expect(get(cache, "B", 50)).toBe(false); // evicted
  });

  it("MRU evicts the most recently used key — the opposite of LRU on the same sequence", () => {
    const cache = makeCache("mru", 2);
    put(cache, "A", 0);
    put(cache, "B", 10);
    // Touch A — under MRU this makes A the eviction target, not B.
    expect(get(cache, "A", 20)).toBe(true);
    put(cache, "C", 30); // evicts A (most recently used), not B

    expect(get(cache, "B", 40)).toBe(true); // survives
    expect(get(cache, "A", 50)).toBe(false); // evicted despite being freshly touched
  });

  it("LFU evicts the least frequently accessed key", () => {
    const cache = makeCache("lfu", 2);
    put(cache, "A", 0);
    put(cache, "B", 10);
    // Access A twice more — A is now clearly more frequent than B.
    get(cache, "A", 20);
    get(cache, "A", 30);
    put(cache, "C", 40); // evicts B (accessCount 1) over A (accessCount 3)

    expect(get(cache, "A", 50)).toBe(true);
    expect(get(cache, "B", 60)).toBe(false);
  });

  it("respects TTL: an entry older than ttlMs is treated as a miss", () => {
    const cache = new Cache("cache1", { capacity: 10, ttlMs: 100, maxConcurrent: 100 });
    put(cache, "A", 0);
    expect(get(cache, "A", 50)).toBe(true); // still within TTL
    expect(get(cache, "A", 150)).toBe(false); // expired
  });

  it("never evicts while under capacity", () => {
    const cache = makeCache("lru", 10);
    put(cache, "A", 0);
    put(cache, "B", 10);
    put(cache, "C", 20);
    expect(get(cache, "A", 30)).toBe(true);
    expect(get(cache, "B", 40)).toBe(true);
    expect(get(cache, "C", 50)).toBe(true);
  });

  it("does not cache a value when the downstream fetch on a miss fails", () => {
    // Regression test for Milestone 0: before the failure-routing fix, a
    // downstream failure after a miss never reached the Cache at all (it
    // routed straight to the client), so this scenario was untestable —
    // the in-flight record just leaked silently instead of resolving.
    const cache = makeCache("lru", 10);
    putFailed(cache, "A", 0);
    expect(get(cache, "A", 10)).toBe(false);
  });
});

describe("Cache stampede protection (direct entity harness)", () => {
  it("naive mode (the default) lets every concurrent miss for the same key fetch independently", () => {
    const cache = new Cache("cache1", { capacity: 10, maxConcurrent: 100 });

    const arrivals = ["req_a", "req_b"].map((id) => {
      const arrival = createRequestRoutedEvent(0, "client1", cache.id, id, {
        startedAt: 0,
        direction: "request",
        path: ["client1"],
        key: "hot",
      } satisfies RequestLifecycleMetadata);
      return { id, events: cache.handleEvent(arrival, makeContext(0)) };
    });

    // Both miss independently — neither is tagged coalesced.
    for (const { events } of arrivals) {
      const miss = events.find((e) => e.type === "CACHE_MISS");
      expect(miss?.metadata.coalesced).toBeUndefined();
    }

    // Both schedule their own PROCESSING_COMPLETED, and both go on to
    // forward downstream independently — two fetches for one key.
    const forwards = arrivals.flatMap(({ id, events }) => {
      const completed = events.find((e) => e.type === "PROCESSING_COMPLETED");
      expect(completed).toBeDefined();
      const after = cache.handleEvent(completed!, makeContext(completed!.timestamp));
      return after.filter((e) => e.type === "REQUEST_ROUTED" && e.requestId === id);
    });
    expect(forwards).toHaveLength(2);
  });

  it("coalesced mode collapses concurrent misses for the same key into a single downstream fetch", () => {
    const cache = new Cache("cache1", {
      capacity: 10,
      maxConcurrent: 100,
      stampedeMode: "coalesced",
    });

    // Three requests for the same key, all arriving before any downstream
    // fetch has resolved — the classic stampede shape.
    const [leaderEvents, follower1Events, follower2Events] = ["req_a", "req_b", "req_c"].map(
      (id) => {
        const arrival = createRequestRoutedEvent(0, "client1", cache.id, id, {
          startedAt: 0,
          direction: "request",
          path: ["client1"],
          key: "hot",
        } satisfies RequestLifecycleMetadata);
        return cache.handleEvent(arrival, makeContext(0));
      }
    );

    // The leader misses normally and has real work scheduled.
    const leaderMiss = leaderEvents.find((e) => e.type === "CACHE_MISS");
    expect(leaderMiss?.metadata.coalesced).toBeUndefined();
    const leaderProcessingCompleted = leaderEvents.find((e) => e.type === "PROCESSING_COMPLETED");
    expect(leaderProcessingCompleted).toBeDefined();

    // The followers miss too (they really don't have the value yet) but
    // are tagged coalesced and have nothing of their own scheduled — they
    // wait on the leader instead.
    for (const events of [follower1Events, follower2Events]) {
      const miss = events.find((e) => e.type === "CACHE_MISS");
      expect(miss?.metadata.coalesced).toBe(true);
      expect(events.some((e) => e.type === "PROCESSING_COMPLETED")).toBe(false);
    }

    // Resolving the leader's own admission-time work forwards exactly one
    // request downstream, despite three concurrent misses for "hot".
    const afterLeaderComplete = cache.handleEvent(
      leaderProcessingCompleted!,
      makeContext(leaderProcessingCompleted!.timestamp)
    );
    const forwarded = afterLeaderComplete.filter((e) => e.type === "REQUEST_ROUTED");
    expect(forwarded).toHaveLength(1);

    // The downstream database answers the leader's fetch.
    const response = createRequestRoutedEvent(
      forwarded[0].timestamp + 1,
      "db1",
      cache.id,
      "req_a",
      { ...(forwarded[0].metadata as RequestLifecycleMetadata), direction: "response" }
    );
    const afterResponseArrival = cache.handleEvent(response, makeContext(response.timestamp));
    const responseCompleted = afterResponseArrival.find((e) => e.type === "PROCESSING_COMPLETED");
    const afterStore = cache.handleEvent(
      responseCompleted!,
      makeContext(responseCompleted!.timestamp)
    );

    // All three original requesters — the leader and both followers — get
    // a real completion out of that single fetch.
    const completions = afterStore.filter((e) => e.type === "REQUEST_COMPLETED");
    expect(completions.map((e) => e.requestId).sort()).toEqual(["req_a", "req_b", "req_c"]);

    // And the key is genuinely cached now, for whoever asks next.
    expect(get(cache, "hot", response.timestamp + 10)).toBe(true);
  });

  it("propagates a failed leader fetch to every request that coalesced onto it", () => {
    const cache = new Cache("cache1", {
      capacity: 10,
      maxConcurrent: 100,
      stampedeMode: "coalesced",
    });

    const [leaderEvents, followerEvents] = ["req_a", "req_b"].map((id) => {
      const arrival = createRequestRoutedEvent(0, "client1", cache.id, id, {
        startedAt: 0,
        direction: "request",
        path: ["client1"],
        key: "hot",
      } satisfies RequestLifecycleMetadata);
      return cache.handleEvent(arrival, makeContext(0));
    });
    const leaderProcessingCompleted = leaderEvents.find((e) => e.type === "PROCESSING_COMPLETED");
    expect(followerEvents.some((e) => e.type === "PROCESSING_COMPLETED")).toBe(false);

    const afterLeaderComplete = cache.handleEvent(
      leaderProcessingCompleted!,
      makeContext(leaderProcessingCompleted!.timestamp)
    );
    const forwarded = afterLeaderComplete.find((e) => e.type === "REQUEST_ROUTED");

    // Downstream reports failure instead of a value.
    const response = createRequestRoutedEvent(
      forwarded!.timestamp + 1,
      "db1",
      cache.id,
      "req_a",
      {
        ...(forwarded!.metadata as RequestLifecycleMetadata),
        direction: "response",
        failed: true,
        failureReason: "query_failed",
      }
    );
    const afterResponseArrival = cache.handleEvent(response, makeContext(response.timestamp));
    const responseCompleted = afterResponseArrival.find((e) => e.type === "PROCESSING_COMPLETED");
    const afterFailure = cache.handleEvent(
      responseCompleted!,
      makeContext(responseCompleted!.timestamp)
    );

    const failures = afterFailure.filter((e) => e.type === "REQUEST_FAILED");
    expect(failures.map((e) => e.requestId).sort()).toEqual(["req_a", "req_b"]);
    // Nothing worth caching came back — the follower's wait didn't leak a
    // phantom cache entry either.
    expect(get(cache, "hot", response.timestamp + 10)).toBe(false);
  });
});

/** Like `put`, but the request is flagged as targeting a key that will
 * never exist (`exists: false`) — and, unlike `putFailed`, the downstream
 * reply here is a *success*. Proves Cache itself — not downstream — is
 * what resolves a phantom-key request to "not found" (see Cache.ts's class
 * doc on cache penetration). Returns whether this particular request ended
 * up making its own downstream round trip, or was answered locally from
 * the negative cache instead. */
function putPhantom(cache: Cache, key: string, now: number): { forwardedDownstream: boolean } {
  const requestId = `req_${++requestCounter}`;
  const arrival = createRequestRoutedEvent(now, "client1", cache.id, requestId, {
    startedAt: now,
    direction: "request",
    path: ["client1"],
    key,
    exists: false,
  } satisfies RequestLifecycleMetadata);

  const afterArrival = cache.handleEvent(arrival, makeContext(now));
  const processingCompleted = afterArrival.find((e) => e.type === "PROCESSING_COMPLETED");
  if (!processingCompleted) throw new Error("cache did not schedule completion");

  const afterFirstComplete = cache.handleEvent(
    processingCompleted,
    makeContext(processingCompleted.timestamp)
  );

  const forwarded = afterFirstComplete.find((e) => e.type === "REQUEST_ROUTED");
  if (!forwarded) {
    // Answered locally (a negative-cache hit) — nothing forwarded downstream.
    const failed = afterFirstComplete.find((e) => e.type === "REQUEST_FAILED");
    if (!failed || failed.metadata.reason !== "not_found") {
      throw new Error("phantom-key request neither forwarded downstream nor answered not_found");
    }
    return { forwardedDownstream: false };
  }

  const response = createRequestRoutedEvent(
    forwarded.timestamp + 1,
    "db1",
    cache.id,
    requestId,
    { ...(forwarded.metadata as RequestLifecycleMetadata), direction: "response" }
  );
  const afterResponseArrival = cache.handleEvent(response, makeContext(response.timestamp));
  const responseCompleted = afterResponseArrival.find((e) => e.type === "PROCESSING_COMPLETED");
  if (!responseCompleted) throw new Error("cache did not schedule storing the response");
  const afterStore = cache.handleEvent(
    responseCompleted,
    makeContext(responseCompleted.timestamp)
  );
  const failed = afterStore.find((e) => e.type === "REQUEST_FAILED");
  if (!failed || failed.metadata.reason !== "not_found") {
    throw new Error("phantom-key request did not resolve to not_found even though downstream succeeded");
  }
  return { forwardedDownstream: true };
}

describe("Cache penetration / negative caching (direct entity harness)", () => {
  it("resolves a phantom-key request as not_found even though downstream itself reports success", () => {
    const cache = new Cache("cache1", { capacity: 10, maxConcurrent: 100 });
    const result = putPhantom(cache, "missing_0", 0);
    expect(result.forwardedDownstream).toBe(true);
  });

  it("never caches a phantom key positively — a later real lookup for it still misses", () => {
    const cache = new Cache("cache1", { capacity: 10, maxConcurrent: 100 });
    putPhantom(cache, "missing_0", 0);
    expect(get(cache, "missing_0", 10)).toBe(false);
  });

  it("negativeCaching off (the default): every repeat request for the same phantom key hits downstream again", () => {
    const cache = new Cache("cache1", { capacity: 10, maxConcurrent: 100 });
    const first = putPhantom(cache, "missing_0", 0);
    const second = putPhantom(cache, "missing_0", 10);
    expect(first.forwardedDownstream).toBe(true);
    expect(second.forwardedDownstream).toBe(true);
  });

  it("negativeCaching on: a repeat request for the same phantom key is answered locally, without a downstream trip", () => {
    const cache = new Cache("cache1", {
      capacity: 10,
      maxConcurrent: 100,
      negativeCaching: "on",
      negativeCacheTtlMs: 10_000,
    });
    const first = putPhantom(cache, "missing_0", 0);
    const second = putPhantom(cache, "missing_0", 10);
    expect(first.forwardedDownstream).toBe(true);
    expect(second.forwardedDownstream).toBe(false);
  });

  it("negativeCaching on: once the negative-cache entry itself expires, the next request reopens a downstream trip", () => {
    const cache = new Cache("cache1", {
      capacity: 10,
      maxConcurrent: 100,
      negativeCaching: "on",
      negativeCacheTtlMs: 20,
    });
    const first = putPhantom(cache, "missing_0", 0);
    const withinTtl = putPhantom(cache, "missing_0", 10);
    const afterTtl = putPhantom(cache, "missing_0", 30);
    expect(first.forwardedDownstream).toBe(true);
    expect(withinTtl.forwardedDownstream).toBe(false);
    expect(afterTtl.forwardedDownstream).toBe(true);
  });

  it("tags a negative-cache hit's CACHE_MISS event as negative and notFound", () => {
    const cache = new Cache("cache1", {
      capacity: 10,
      maxConcurrent: 100,
      negativeCaching: "on",
      negativeCacheTtlMs: 10_000,
    });
    putPhantom(cache, "missing_0", 0);

    const requestId = `req_${++requestCounter}`;
    const arrival = createRequestRoutedEvent(10, "client1", cache.id, requestId, {
      startedAt: 10,
      direction: "request",
      path: ["client1"],
      key: "missing_0",
      exists: false,
    } satisfies RequestLifecycleMetadata);
    const events = cache.handleEvent(arrival, makeContext(10));
    const miss = events.find((e) => e.type === "CACHE_MISS");
    expect(miss?.metadata.negative).toBe(true);
    expect(miss?.metadata.notFound).toBe(true);
  });

  it("does not treat a normal (existing) key's request as phantom", () => {
    const cache = new Cache("cache1", { capacity: 10, maxConcurrent: 100 });
    expect(put(cache, "A", 0).hit).toBe(false); // first lookup, ordinary miss
    expect(get(cache, "A", 10)).toBe(true); // cached normally, unlike a phantom key
  });
});

// ---- Full-pipeline tests (through the real Simulator + traffic generator) ----

function configWithCache(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      {
        id: "client1",
        type: "client",
        position: { x: 0, y: 0 },
        // Small pool relative to volume so repeats — and therefore hits — are guaranteed.
        config: { keyPoolSize: 5 },
      },
      { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
      {
        id: "cache1",
        type: "cache",
        position: { x: 0, y: 0 },
        config: { capacity: 20 },
      },
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "api1", latencyMs: 2 },
      { source: "api1", target: "cache1", latencyMs: 1 },
      { source: "cache1", target: "db1", latencyMs: 2 },
    ],
    scenario: {
      id: "cache-test",
      title: "Cache Test",
      trafficPattern: { type: "constant", rate: 50 },
      durationMs: 5000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("Cache (through the full Simulator)", () => {
  it("produces hits once keys repeat, with a small key pool relative to traffic", () => {
    const result = runSimulation(configWithCache());
    const hits = result.events.filter((e) => e.type === "CACHE_HIT");
    const misses = result.events.filter((e) => e.type === "CACHE_MISS");

    expect(hits.length).toBeGreaterThan(0);
    expect(misses.length).toBeGreaterThan(0);
    expect(hits.length).toBeGreaterThan(misses.length);
  });

  it("routes the response back through a Cache placed between Client/API and the Database", () => {
    // This is exactly the topology that exposed the original response-routing
    // bug: without findResponseTarget, API's response handler completed
    // straight to the client and the Cache never saw the response to store
    // it — hit rate would stay at 0% forever, no matter how repetitive the
    // traffic actually was.
    const result = runSimulation(configWithCache());
    expect(result.metrics.successRate).toBeGreaterThan(0.95);

    const hits = result.events.filter((e) => e.type === "CACHE_HIT");
    expect(hits.length).toBeGreaterThan(0);
  });

  it("produces almost no hits when the key pool is much larger than traffic volume", () => {
    const config = configWithCache({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 100_000 } },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "cache1", type: "cache", position: { x: 0, y: 0 }, config: { capacity: 20 } },
        { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
      ],
    });
    const result = runSimulation(config);
    const hits = result.events.filter((e) => e.type === "CACHE_HIT").length;
    const misses = result.events.filter((e) => e.type === "CACHE_MISS").length;

    expect(hits / (hits + misses)).toBeLessThan(0.05);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithCache());
    const b = runSimulation(configWithCache());
    expect(a.events).toEqual(b.events);
  });

  it("fails gracefully on a miss with no downstream connection", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "cache1", type: "cache", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [{ source: "client1", target: "cache1", latencyMs: 1 }],
      scenario: {
        id: "no-downstream",
        title: "No Downstream",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 1000,
      },
      options: { seed: 1 },
    };

    const result = runSimulation(config);
    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const failedEvents = result.events.filter((e) => e.type === "REQUEST_FAILED");
    expect(
      failedEvents.some((e) => e.metadata.reason === "no_downstream_connection")
    ).toBe(true);
  });
});

describe("Cache stampede protection (through the full Simulator)", () => {
  // A single hot key (pool size 1) with a short TTL under sustained,
  // concurrent traffic — the shape that actually produces a stampede:
  // every TTL expiry leaves a short window where several in-flight
  // requests all miss the same key at once.
  function configWithStampede(stampedeMode: "naive" | "coalesced"): SimulationConfig {
    return {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 1 } },
        {
          id: "api1",
          type: "api",
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 200, maxQueueLength: 1000 },
        },
        {
          id: "cache1",
          type: "cache",
          position: { x: 0, y: 0 },
          config: {
            capacity: 5,
            ttlMs: 20,
            maxConcurrent: 200,
            maxQueueLength: 1000,
            stampedeMode,
          },
        },
        {
          id: "db1",
          type: "database",
          position: { x: 0, y: 0 },
          config: { maxConnections: 200, maxQueueLength: 1000 },
        },
      ],
      connections: [
        { source: "client1", target: "api1", latencyMs: 1 },
        { source: "api1", target: "cache1", latencyMs: 1 },
        { source: "cache1", target: "db1", latencyMs: 1 },
      ],
      scenario: {
        id: "stampede-test",
        title: "Stampede Test",
        trafficPattern: { type: "constant", rate: 200 },
        durationMs: 2000,
      },
      options: { seed: 7 },
    };
  }

  it("forwards fewer requests downstream under coalesced mode than naive, for identical traffic", () => {
    const naive = runSimulation(configWithStampede("naive"));
    const coalesced = runSimulation(configWithStampede("coalesced"));

    const downstreamForwards = (result: ReturnType<typeof runSimulation>) =>
      result.events.filter(
        (e) => e.type === "REQUEST_ROUTED" && e.source === "cache1" && e.destination === "db1"
      ).length;

    // Same key, same TTL, same traffic — the only thing that changed is
    // whether concurrent misses fetch independently or share one fetch.
    expect(downstreamForwards(coalesced)).toBeLessThan(downstreamForwards(naive));
  });

  it("still resolves nearly every request successfully under coalesced mode", () => {
    const result = runSimulation(configWithStampede("coalesced"));
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
  });

  it("is deterministic for a given seed under coalesced mode", () => {
    const a = runSimulation(configWithStampede("coalesced"));
    const b = runSimulation(configWithStampede("coalesced"));
    expect(a.events).toEqual(b.events);
  });
});

describe("Cache penetration (through the full Simulator)", () => {
  function configWithPenetration(negativeCaching: "off" | "on"): SimulationConfig {
    return {
      entities: [
        {
          id: "client1",
          type: "client",
          position: { x: 0, y: 0 },
          config: { keyPoolSize: 50, missingKeyRate: 0.3 },
        },
        {
          id: "api1",
          type: "api",
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 200, maxQueueLength: 1000 },
        },
        {
          id: "cache1",
          type: "cache",
          position: { x: 0, y: 0 },
          config: {
            capacity: 50,
            maxConcurrent: 200,
            maxQueueLength: 1000,
            negativeCaching,
            negativeCacheTtlMs: 10_000,
          },
        },
        {
          id: "db1",
          type: "database",
          position: { x: 0, y: 0 },
          config: { maxConnections: 200, maxQueueLength: 1000 },
        },
      ],
      connections: [
        { source: "client1", target: "api1", latencyMs: 1 },
        { source: "api1", target: "cache1", latencyMs: 1 },
        { source: "cache1", target: "db1", latencyMs: 1 },
      ],
      scenario: {
        id: "penetration-test",
        title: "Penetration Test",
        trafficPattern: { type: "constant", rate: 100 },
        durationMs: 3000,
      },
      options: { seed: 11 },
    };
  }

  it("forwards fewer not-found requests downstream under negativeCaching \"on\" than \"off\", for identical traffic", () => {
    const off = runSimulation(configWithPenetration("off"));
    const on = runSimulation(configWithPenetration("on"));

    const notFoundForwards = (result: ReturnType<typeof runSimulation>) =>
      result.events.filter(
        (e) =>
          e.type === "REQUEST_ROUTED" &&
          e.source === "cache1" &&
          e.destination === "db1" &&
          (e.metadata as { exists?: boolean }).exists === false
      ).length;

    expect(notFoundForwards(on)).toBeLessThan(notFoundForwards(off));
  });

  it("reports cachePenetration metrics with negativeHits once negativeCaching is on", () => {
    const result = runSimulation(configWithPenetration("on"));
    const penetration = result.metrics.entityMetrics.cache1.cachePenetration;
    expect(penetration).toBeDefined();
    expect(penetration!.negativeHits).toBeGreaterThan(0);
    expect(penetration!.downstreamMisses).toBeGreaterThan(0);
  });

  it("reports no negativeHits when negativeCaching is off", () => {
    const result = runSimulation(configWithPenetration("off"));
    const penetration = result.metrics.entityMetrics.cache1.cachePenetration;
    expect(penetration).toBeDefined();
    expect(penetration!.negativeHits).toBe(0);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithPenetration("on"));
    const b = runSimulation(configWithPenetration("on"));
    expect(a.events).toEqual(b.events);
  });
});

describe("Cache avalanche / TTL jitter (through the full Simulator)", () => {
  // Deliberately extreme traffic (rate 3000/s over a short 600ms run): a
  // very high rate packs the cold-start window tight enough that, without
  // jitter, every one of the 20 keys' first cache entries lands within a
  // handful of ms of each other — so their un-jittered TTLs expire in
  // lockstep too, a genuine synchronized avalanche, not a statistical
  // maybe. Continued high-rate traffic afterward means an actual expiry is
  // detected almost immediately (this engine's expiry is lazy-on-lookup),
  // so jitter's spread in *when things actually expire* is visible in
  // *when they're detected*, instead of being masked by detection lag.
  function configWithAvalanche(ttlJitterPercent: number): SimulationConfig {
    return {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { keyPoolSize: 20 } },
        {
          id: "api1",
          type: "api",
          position: { x: 0, y: 0 },
          config: { maxConcurrent: 2000, maxQueueLength: 5000 },
        },
        {
          id: "cache1",
          type: "cache",
          position: { x: 0, y: 0 },
          config: {
            capacity: 20,
            ttlMs: 300,
            ttlJitterPercent,
            maxConcurrent: 2000,
            maxQueueLength: 5000,
          },
        },
        {
          id: "db1",
          type: "database",
          position: { x: 0, y: 0 },
          config: { maxConnections: 2000, maxQueueLength: 5000 },
        },
      ],
      connections: [
        { source: "client1", target: "api1", latencyMs: 1 },
        { source: "api1", target: "cache1", latencyMs: 1 },
        { source: "cache1", target: "db1", latencyMs: 1 },
      ],
      scenario: {
        id: "avalanche-test",
        title: "Avalanche Test",
        trafficPattern: { type: "constant", rate: 3000 },
        durationMs: 600,
      },
      options: { seed: 1 },
    };
  }

  it("without jitter, every cached key expires in the same synchronized burst", () => {
    const result = runSimulation(configWithAvalanche(0));
    const avalanche = result.metrics.entityMetrics.cache1.cacheAvalanche;
    expect(avalanche).toBeDefined();
    // All 20 keys share the exact same TTL and were all first cached
    // within a few ms of each other under this traffic — they expire
    // together too: the peak burst covers every one of them.
    expect(avalanche!.peakExpiryBurst).toBe(20);
  });

  it("staggers expiries into a meaningfully smaller peak burst with jitter than without, for identical traffic", () => {
    const noJitter = runSimulation(configWithAvalanche(0));
    const withJitter = runSimulation(configWithAvalanche(0.5));

    const peakBurst = (result: ReturnType<typeof runSimulation>) =>
      result.metrics.entityMetrics.cache1.cacheAvalanche?.peakExpiryBurst ?? 0;

    expect(peakBurst(withJitter)).toBeLessThan(peakBurst(noJitter));
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithAvalanche(0.3));
    const b = runSimulation(configWithAvalanche(0.3));
    expect(a.events).toEqual(b.events);
  });
});
