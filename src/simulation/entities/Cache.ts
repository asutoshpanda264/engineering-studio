/**
 * The Cache answers requests from memory when it can, falling through to
 * whatever's behind it (typically a Database) when it can't.
 *
 * ENTITIES.md doesn't document this entity; TECHNICAL-SPECIFICATION.md
 * only sketches Cache config as Capacity / TTL / Eviction Policy. This
 * implements the cache-aside pattern specifically: check cache first: a
 * hit answers immediately without ever touching downstream; a miss falls
 * through, and the fetched value is stored on the way back. Write-through
 * / write-back / write-around are read+write coordination protocols —
 * meaningless without the engine modeling writes as a distinct kind of
 * request, which it doesn't yet. That's a real follow-up, not this pass.
 *
 * Like APIServer/Database, both directions (the inbound request AND the
 * database's returning response, when the request missed) go through
 * the same bounded concurrency/queue admission — a cache does have
 * finite throughput even though its work is fast.
 *
 * Learning goal: a cache only helps when the same key is requested
 * often enough to be worth remembering — hit rate is a property of both
 * the cache (capacity, eviction policy) and the traffic (how repetitive
 * it actually is), not something a cache can force on its own.
 */

import type { Entity, SimulationContext } from "./Entity";
import type { EntityId, RequestId } from "../types";
import type {
  RequestLifecycleMetadata,
  SimulationEvent,
} from "../events/types";
import { BoundedProcessor } from "./BoundedProcessor";
import { CacheStore } from "./CacheStore";
import type { EvictionPolicy } from "./CacheStore";
import { findResponseTarget } from "./responseRouting";
import {
  createCacheAccessEvent,
  createProcessingCompletedEvent,
  createProcessingStartedEvent,
  createQueueFullEvent,
  createRequestCompletedEvent,
  createRequestDequeuedEvent,
  createRequestFailedEvent,
  createRequestQueuedEvent,
  createRequestRoutedEvent,
} from "../events/EventFactory";

export type { EvictionPolicy };

export interface CacheConfig {
  /** Distinct keys the cache can hold before it must evict something. */
  capacity?: number;
  /** Which entry to remove when a new key arrives at capacity. */
  evictionPolicy?: EvictionPolicy;
  /** How long an entry stays valid after being stored, in ms. 0 = never expires. */
  ttlMs?: number;
  /** Lookups/stores the cache can be actively handling at once. */
  maxConcurrent?: number;
  /** Requests allowed to wait once maxConcurrent is reached. */
  maxQueueLength?: number;
  /** Time to serve a hit, in ms — fast, since it's just a memory lookup. */
  hitTimeMs?: number;
  /** Extra bookkeeping time added on a miss, on top of whatever's downstream. */
  missOverheadMs?: number;
}

const DEFAULTS: Required<CacheConfig> = {
  capacity: 20,
  evictionPolicy: "lru",
  ttlMs: 0,
  maxConcurrent: 20,
  maxQueueLength: 100,
  hitTimeMs: 1,
  missOverheadMs: 1,
};

interface InFlightRecord {
  meta: RequestLifecycleMetadata;
  /** Only meaningful when meta.direction === "request". */
  hit: boolean;
}

export class Cache implements Entity {
  readonly id: EntityId;

  private readonly config: Required<CacheConfig>;
  private readonly processor: BoundedProcessor;
  private readonly store: CacheStore;
  private readonly inFlight = new Map<RequestId, InFlightRecord>();

  constructor(id: EntityId, config: CacheConfig = {}) {
    this.id = id;
    this.config = { ...DEFAULTS, ...config };
    this.processor = new BoundedProcessor(
      this.config.maxConcurrent,
      this.config.maxQueueLength
    );
    this.store = new CacheStore({
      capacity: this.config.capacity,
      evictionPolicy: this.config.evictionPolicy,
      ttlMs: this.config.ttlMs,
    });
  }

  handleEvent(
    event: SimulationEvent,
    ctx: SimulationContext
  ): SimulationEvent[] {
    if (event.type === "REQUEST_ROUTED" && event.destination === this.id) {
      return this.onArrival(event, ctx);
    }
    if (event.type === "PROCESSING_COMPLETED" && event.destination === this.id) {
      return this.onProcessingComplete(event, ctx);
    }
    return [];
  }

  private onArrival(
    event: SimulationEvent,
    ctx: SimulationContext
  ): SimulationEvent[] {
    if (!event.requestId) return [];
    const meta = event.metadata as RequestLifecycleMetadata;

    const result = this.processor.admit(event);
    if (result === "rejected") {
      return [
        createQueueFullEvent(ctx.now, this.id, event.requestId),
        createRequestFailedEvent(
          ctx.now,
          this.id,
          meta.path[0],
          event.requestId,
          "capacity_exceeded",
          { startedAt: meta.startedAt }
        ),
      ];
    }
    if (result === "queued") {
      return [createRequestQueuedEvent(ctx.now, this.id, event.requestId)];
    }
    return this.beginProcessing(event.requestId, meta, ctx);
  }

  private beginProcessing(
    requestId: RequestId,
    meta: RequestLifecycleMetadata,
    ctx: SimulationContext
  ): SimulationEvent[] {
    const isRequestLeg = meta.direction === "request";
    // Decide hit/miss (and touch the entry on a hit) now, at admission —
    // not when processing finishes — so a burst of identical keys
    // arriving back-to-back all see the same, already-warm cache state.
    const hit = isRequestLeg && this.store.lookup(meta.key, ctx.now);
    if (isRequestLeg && hit) this.store.touch(meta.key, ctx.now);

    this.inFlight.set(requestId, { meta, hit });

    const base = isRequestLeg
      ? hit
        ? this.config.hitTimeMs
        : this.config.missOverheadMs
      : this.config.hitTimeMs; // storing the fetched value on the way back is cheap too
    const duration = Math.max(1, base + ctx.rng.nextInt(0, 2));

    const events: SimulationEvent[] = [
      createProcessingStartedEvent(ctx.now, this.id, requestId),
    ];
    if (isRequestLeg) {
      events.push(
        createCacheAccessEvent(
          hit ? "CACHE_HIT" : "CACHE_MISS",
          ctx.now,
          this.id,
          requestId,
          meta.key,
          hit
        )
      );
    }
    events.push(
      createProcessingCompletedEvent(ctx.now + duration, this.id, requestId)
    );
    return events;
  }

  private onProcessingComplete(
    event: SimulationEvent,
    ctx: SimulationContext
  ): SimulationEvent[] {
    if (!event.requestId) return [];
    const record = this.inFlight.get(event.requestId);
    this.inFlight.delete(event.requestId);

    const events: SimulationEvent[] = [];

    const nextQueued = this.processor.complete();
    if (nextQueued && nextQueued.requestId) {
      events.push(createRequestDequeuedEvent(ctx.now, this.id, nextQueued.requestId));
      events.push(
        ...this.beginProcessing(
          nextQueued.requestId,
          nextQueued.metadata as RequestLifecycleMetadata,
          ctx
        )
      );
    }

    if (!record) return events;
    const { meta, hit } = record;

    if (meta.direction === "request") {
      if (hit) {
        events.push(...this.respond(meta, ctx, event.requestId));
        return events;
      }

      const target = ctx.downstream[0];
      if (!target) {
        events.push(
          createRequestFailedEvent(
            ctx.now,
            this.id,
            meta.path[0],
            event.requestId,
            "no_downstream_connection",
            { startedAt: meta.startedAt }
          )
        );
        return events;
      }
      const latency = ctx.latencyTo(target);
      events.push(
        createRequestRoutedEvent(
          ctx.now + latency,
          this.id,
          target,
          event.requestId,
          { ...meta, direction: "request", path: [...meta.path, this.id] }
        )
      );
    } else {
      // The value we missed on has come back from downstream — store it
      // before continuing the response, so the next request for this key
      // can hit.
      this.store.set(meta.key, ctx.now);
      events.push(...this.respond(meta, ctx, event.requestId));
    }

    return events;
  }

  private respond(
    meta: RequestLifecycleMetadata,
    ctx: SimulationContext,
    requestId: string
  ): SimulationEvent[] {
    const { target, isClient } = findResponseTarget(this.id, meta.path);
    if (isClient) {
      const duration = ctx.now - meta.startedAt;
      return [
        createRequestCompletedEvent(ctx.now, this.id, target, requestId, duration),
      ];
    }
    const latency = ctx.latencyTo(target);
    return [
      createRequestRoutedEvent(ctx.now + latency, this.id, target, requestId, {
        ...meta,
        direction: "response",
        path: meta.path,
      }),
    ];
  }

}
