/**
 * The Database executes queries against a bounded connection pool.
 *
 * ENTITIES.md doesn't document this entity in detail (only Client is
 * fully written up) — this behavior fills that gap using the config
 * fields TECHNICAL-SPECIFICATION.md sketches for it directly: Maximum
 * Connections, Processing Time, Failure Probability.
 *
 * The Database is the end of the request leg for this simple pipeline:
 * on success it responds to whichever entity sent it the query (the
 * immediately preceding hop in `path`, not necessarily the client
 * directly); on failure it fails straight back to the client, since
 * there's no partial response to generate.
 *
 * Learning goal: a database is a shared, limited resource — every
 * query it runs concurrently competes for the same connection pool,
 * and it can fail independently of anything upstream.
 */

import type { Entity, SimulationContext } from "./Entity";
import type { EntityId, RequestId } from "../types";
import type {
  RequestLifecycleMetadata,
  SimulationEvent,
} from "../events/types";
import { BoundedProcessor } from "./BoundedProcessor";
import { findResponseTarget } from "./responseRouting";
import {
  createDatabaseBusyEvent,
  createProcessingCompletedEvent,
  createProcessingStartedEvent,
  createRequestCompletedEvent,
  createRequestDequeuedEvent,
  createRequestFailedEvent,
  createRequestQueuedEvent,
  createRequestRoutedEvent,
} from "../events/EventFactory";

export interface DatabaseConfig {
  /** Concurrent queries the connection pool allows. */
  maxConnections?: number;
  /** Queries allowed to wait once maxConnections is reached. */
  maxQueueLength?: number;
  /** Base time to execute a query, in ms. */
  processingTimeMs?: number;
  /** Random +/- jitter applied to processingTimeMs, in ms. */
  processingJitterMs?: number;
  /** Chance (0.0-1.0) a query fails independently of load. */
  failureProbability?: number;
}

const DEFAULTS: Required<DatabaseConfig> = {
  maxConnections: 5,
  maxQueueLength: 100,
  processingTimeMs: 15,
  processingJitterMs: 5,
  failureProbability: 0,
};

export class Database implements Entity {
  readonly id: EntityId;

  private readonly config: Required<DatabaseConfig>;
  private readonly processor: BoundedProcessor;
  private readonly inFlight = new Map<RequestId, RequestLifecycleMetadata>();

  constructor(id: EntityId, config: DatabaseConfig = {}) {
    this.id = id;
    this.config = { ...DEFAULTS, ...config };
    this.processor = new BoundedProcessor(
      this.config.maxConnections,
      this.config.maxQueueLength
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
    const meta = event.metadata as RequestLifecycleMetadata;

    const result = this.processor.admit(event);
    if (result === "rejected") {
      return [
        createDatabaseBusyEvent(ctx.now, this.id, event.requestId),
        createRequestFailedEvent(
          ctx.now,
          this.id,
          meta.path[0],
          event.requestId,
          "database_busy",
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
    this.inFlight.set(requestId, meta);
    const jitter = ctx.rng.nextInt(
      -this.config.processingJitterMs,
      this.config.processingJitterMs + 1
    );
    const duration = Math.max(1, this.config.processingTimeMs + jitter);

    return [
      createProcessingStartedEvent(ctx.now, this.id, requestId),
      createProcessingCompletedEvent(ctx.now + duration, this.id, requestId),
    ];
  }

  private onProcessingComplete(
    event: SimulationEvent,
    ctx: SimulationContext
  ): SimulationEvent[] {
    if (!event.requestId) return [];
    const meta = this.inFlight.get(event.requestId);
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

    if (!meta) return events;

    const clientId = meta.path[0];
    const failed = ctx.rng.next() < this.config.failureProbability;

    if (failed) {
      events.push(
        createRequestFailedEvent(
          ctx.now,
          this.id,
          clientId,
          event.requestId,
          "query_failed",
          { startedAt: meta.startedAt }
        )
      );
      return events;
    }

    // Respond to whoever sent the query — see responseRouting.ts. If
    // that's the client directly (no hops in between), this must be the
    // terminal REQUEST_COMPLETED: Client only reacts to REQUEST_STARTED,
    // so a REQUEST_ROUTED here would go unrecognized and the request would
    // silently vanish with no metrics.
    const { target, isClient } = findResponseTarget(this.id, meta.path);
    if (isClient) {
      const duration = ctx.now - meta.startedAt;
      events.push(
        createRequestCompletedEvent(
          ctx.now,
          this.id,
          target,
          event.requestId,
          duration
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
          direction: "response",
          path: meta.path,
        }
      )
    );

    return events;
  }
}
