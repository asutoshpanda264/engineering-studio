/**
 * The CDN answers requests from one of several geographically distributed
 * edge caches instead of a single central one, falling through to the
 * origin (whatever's connected downstream) on a miss — same cache-aside
 * idea as Cache, just replicated across edges that are each closer to
 * *some* users than a single origin server could be.
 *
 * TECHNICAL-SPECIFICATION.md sketches CDN as "5 geographic edges, a
 * latency matrix, TLS/DDoS modeling, a cost calculator, world map
 * visualization." This implements the part that's actually entity
 * *behavior* — edge count, per-edge distance-to-user, and per-edge
 * cache-aside — since that's what teaches the real lesson (latency is
 * partly a physics problem). TLS/DDoS modeling and a cost calculator
 * aren't entity behavior, they're separate features with their own
 * logic; a world map visualization is a geo UI component. All three are
 * real follow-ups, not silently faked here.
 *
 * We don't simulate *where* a request's user actually is (there's no
 * concept of user geography anywhere in the engine) — instead each
 * incoming request is assigned a uniformly random edge, which is an
 * honest stand-in for "different requests come from different regions."
 * Each edge has its own latency-to-user (closer edges = faster) and its
 * own independent CacheStore — content warmed at one edge isn't visible
 * at another, exactly like real CDN edges.
 *
 * Learning goal: more edges mean better worst-case latency (some user is
 * always closer to *an* edge), but each edge caches independently, so
 * splitting the same traffic across more edges can mean each one is
 * individually colder — proximity and hit rate pull in different
 * directions, and a CDN is a bet that proximity wins.
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

/**
 * One-way latency to each edge, evenly spaced across [min, max]. Exported
 * so the UI can render the same edges the entity actually uses (e.g. a
 * schematic edge map) without recomputing a second, potentially-drifting
 * copy of this formula.
 */
export function computeEdgeLatencies(
  edgeCount: number,
  minEdgeLatencyMs: number,
  maxEdgeLatencyMs: number
): number[] {
  const count = Math.max(1, edgeCount);
  return Array.from({ length: count }, (_, i) =>
    count === 1
      ? minEdgeLatencyMs
      : Math.round(
          minEdgeLatencyMs + ((maxEdgeLatencyMs - minEdgeLatencyMs) * i) / (count - 1)
        )
  );
}

export interface CDNConfig {
  /** How many geographically distributed edges the CDN operates. */
  edgeCount?: number;
  /** One-way latency to the nearest edge, in ms. */
  minEdgeLatencyMs?: number;
  /** One-way latency to the farthest edge, in ms. */
  maxEdgeLatencyMs?: number;
  /** Distinct keys each edge can hold before it must evict something. */
  capacity?: number;
  /** Which entry an edge removes when a new key arrives at its capacity. */
  evictionPolicy?: EvictionPolicy;
  /** How long an entry stays valid at an edge, in ms. 0 = never expires. */
  ttlMs?: number;
  /** Lookups/stores a single edge can be actively handling at once. */
  maxConcurrent?: number;
  /** Requests allowed to wait once an edge is at maxConcurrent. */
  maxQueueLength?: number;
  /** Time to serve a hit, in ms, on top of the edge's latency-to-user. */
  hitTimeMs?: number;
  /** Extra bookkeeping time added on a miss, on top of the origin's own latency. */
  missOverheadMs?: number;
}

const DEFAULTS: Required<CDNConfig> = {
  edgeCount: 5,
  minEdgeLatencyMs: 1,
  maxEdgeLatencyMs: 6,
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
  edgeIndex: number;
  /** Only meaningful when meta.direction === "request". */
  hit: boolean;
}

/** Metadata CDN piggybacks on the request while it's away at the origin,
 * so the response can be attributed back to the edge that missed on it —
 * RequestLifecycleMetadata's index signature allows entity-specific
 * fields like this without polluting the shared, typed shape. */
interface CDNResponseMetadata extends RequestLifecycleMetadata {
  cdnEdgeIndex?: number;
}

export class CDN implements Entity {
  readonly id: EntityId;

  private readonly config: Required<CDNConfig>;
  private readonly processor: BoundedProcessor;
  private readonly edges: CacheStore[];
  /** One-way latency to each edge, evenly spaced across the configured
   * range — deterministic by construction, since entities don't receive
   * an RNG until handleEvent runs. */
  private readonly edgeLatencyMs: number[];
  private readonly inFlight = new Map<RequestId, InFlightRecord>();

  constructor(id: EntityId, config: CDNConfig = {}) {
    this.id = id;
    this.config = { ...DEFAULTS, ...config };
    this.processor = new BoundedProcessor(
      this.config.maxConcurrent,
      this.config.maxQueueLength
    );

    const edgeCount = Math.max(1, this.config.edgeCount);
    this.edges = Array.from(
      { length: edgeCount },
      () =>
        new CacheStore({
          capacity: this.config.capacity,
          evictionPolicy: this.config.evictionPolicy,
          ttlMs: this.config.ttlMs,
        })
    );
    this.edgeLatencyMs = computeEdgeLatencies(
      edgeCount,
      this.config.minEdgeLatencyMs,
      this.config.maxEdgeLatencyMs
    );
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
    const meta = event.metadata as CDNResponseMetadata;

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

  /** Deterministic key -> edge routing (FNV-1a hash mod edge count), so
   * the same key always lands on the same edge — mirrors how anycast/geo
   * routing keeps a given user's requests hitting the same nearby edge. */
  private hashKeyToEdge(key: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return Math.abs(hash) % this.edges.length;
  }

  private beginProcessing(
    requestId: RequestId,
    meta: CDNResponseMetadata,
    ctx: SimulationContext
  ): SimulationEvent[] {
    const isRequestLeg = meta.direction === "request";
    // A response leg carries the edge it originally missed on; a request
    // leg routes by key, not randomly — real CDNs route a given piece of
    // content to the same nearby edge consistently (anycast/geo-DNS), so
    // a key cached at one edge keeps hitting there instead of fragmenting
    // across edges on every request.
    const edgeIndex = isRequestLeg
      ? this.hashKeyToEdge(meta.key)
      : (meta.cdnEdgeIndex ?? 0);
    const edge = this.edges[edgeIndex];

    const hit = isRequestLeg && edge.lookup(meta.key, ctx.now);
    if (isRequestLeg && hit) edge.touch(meta.key, ctx.now);

    this.inFlight.set(requestId, { meta, edgeIndex, hit });

    const workTime = isRequestLeg
      ? hit
        ? this.config.hitTimeMs
        : this.config.missOverheadMs
      : this.config.hitTimeMs;
    // Distance to the user applies on both legs — once reaching the edge,
    // once again on the way back — the same way connection latency
    // between two graph-connected entities applies each direction.
    const duration = Math.max(
      1,
      this.edgeLatencyMs[edgeIndex] + workTime + ctx.rng.nextInt(0, 2)
    );

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
          hit,
          { edgeIndex }
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
          nextQueued.metadata as CDNResponseMetadata,
          ctx
        )
      );
    }

    if (!record) return events;
    const { meta, edgeIndex, hit } = record;

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
          {
            ...meta,
            direction: "request",
            path: [...meta.path, this.id],
            cdnEdgeIndex: edgeIndex,
          }
        )
      );
    } else {
      // The value we missed on has come back from the origin — store it
      // at the edge that originally missed, then continue the response.
      this.edges[edgeIndex].set(meta.key, ctx.now);
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
