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
