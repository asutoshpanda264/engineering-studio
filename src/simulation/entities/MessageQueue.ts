/**
 * The MessageQueue buffers work between a producer and a pool of
 * consumers, so the two can run at different speeds.
 *
 * ENTITIES.md doesn't document this entity; entityEducation.ts already
 * states its intended lesson — "producers don't wait on consumers" and
 * "accepted the request" is a different moment from "finished the
 * request." That's the one real behavioral difference from
 * APIServer/Database/Cache: every other bounded-capacity entity replies
 * only once a request has been fully handled *and* forwarded onward if
 * needed. A queue replies the instant a message is durably admitted
 * (started or merely queued — either way it wasn't rejected), then
 * dispatches to its downstream consumer as an entirely separate,
 * self-contained request under the same requestId — same visual packet,
 * decoupled outcome.
 *
 * That second, queue-originated leg is a real simulated request/response
 * (so a downstream API Server or Database reacts to it exactly as it
 * would to anything else — full capacity checks, real latency), which
 * means it also ends in a genuine REQUEST_COMPLETED/REQUEST_FAILED, just
 * addressed back to this queue instead of a client. MetricsCollector's
 * `clientIds` filter is what keeps that from double-counting against the
 * client-facing totals — see its comment for why.
 *
 * Learning goal: backpressure doesn't have to mean "reject immediately."
 * A queue trades that for "reject only once the buffer itself is full,"
 * absorbing bursts a downstream consumer alone couldn't keep up with —
 * at the cost of the consumer seeing work later than the producer sent it.
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
  createProcessingCompletedEvent,
  createProcessingStartedEvent,
  createQueueFullEvent,
  createRequestCompletedEvent,
  createRequestDequeuedEvent,
  createRequestFailedEvent,
  createRequestQueuedEvent,
  createRequestRoutedEvent,
} from "../events/EventFactory";

export interface MessageQueueConfig {
  /** Consumers pulling messages off the backlog at once. */
  consumerCount?: number;
  /** Messages the queue can buffer once every consumer is busy, before rejecting new ones. */
  maxQueueLength?: number;
  /** Time a consumer takes to pick up and hand off one message, in ms. */
  dispatchTimeMs?: number;
  /** Random +/- jitter applied to dispatchTimeMs, in ms. */
  dispatchJitterMs?: number;
}

const DEFAULTS: Required<MessageQueueConfig> = {
  consumerCount: 3,
  maxQueueLength: 500,
  dispatchTimeMs: 10,
  dispatchJitterMs: 3,
};

/** What's needed to dispatch a message once a consumer is free for it. */
interface PendingDispatch {
  key: string;
}

export class MessageQueue implements Entity {
  readonly id: EntityId;

  private readonly config: Required<MessageQueueConfig>;
  private readonly processor: BoundedProcessor;
  private readonly dispatching = new Map<RequestId, PendingDispatch>();

  constructor(id: EntityId, config: MessageQueueConfig = {}) {
    this.id = id;
    this.config = { ...DEFAULTS, ...config };
    this.processor = new BoundedProcessor(
      this.config.consumerCount,
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
      return this.onDispatchComplete(event, ctx);
    }
    // A queue-originated dispatch's own REQUEST_COMPLETED/REQUEST_FAILED
    // also lands here (addressed to this.id, see class doc) — nothing
    // left to do with it, the producer was already acknowledged.
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
          "queue_full",
          { startedAt: meta.startedAt }
        ),
      ];
    }

    // Admitted — durably accepted, so the producer is done waiting right
    // here, regardless of whether a consumer is free yet.
    const events: SimulationEvent[] = this.acknowledge(meta, ctx, event.requestId);

    if (result === "queued") {
      events.push(createRequestQueuedEvent(ctx.now, this.id, event.requestId));
      return events;
    }

    events.push(...this.beginDispatch(event.requestId, meta.key, ctx));
    return events;
  }

  /** Replies up the original path immediately — the producer never waits for a consumer. */
  private acknowledge(
    meta: RequestLifecycleMetadata,
    ctx: SimulationContext,
    requestId: RequestId
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

  private beginDispatch(
    requestId: RequestId,
    key: string,
    ctx: SimulationContext
  ): SimulationEvent[] {
    this.dispatching.set(requestId, { key });
    const jitter = ctx.rng.nextInt(
      -this.config.dispatchJitterMs,
      this.config.dispatchJitterMs + 1
    );
    const duration = Math.max(1, this.config.dispatchTimeMs + jitter);

    return [
      createProcessingStartedEvent(ctx.now, this.id, requestId),
      createProcessingCompletedEvent(ctx.now + duration, this.id, requestId),
    ];
  }

  private onDispatchComplete(
    event: SimulationEvent,
    ctx: SimulationContext
  ): SimulationEvent[] {
    if (!event.requestId) return [];
    const pending = this.dispatching.get(event.requestId);
    this.dispatching.delete(event.requestId);

    const events: SimulationEvent[] = [];

    const nextQueued = this.processor.complete();
    if (nextQueued && nextQueued.requestId) {
      const nextMeta = nextQueued.metadata as RequestLifecycleMetadata;
      events.push(createRequestDequeuedEvent(ctx.now, this.id, nextQueued.requestId));
      events.push(...this.beginDispatch(nextQueued.requestId, nextMeta.key, ctx));
    }

    if (!pending) return events;

    const target = ctx.downstream[0];
    if (!target) {
      // Nothing to deliver to — the producer's already been acknowledged,
      // so this is purely this queue's own local problem (Observable
      // Behavior: still worth surfacing on its own error count).
      events.push(
        createRequestFailedEvent(
          ctx.now,
          this.id,
          this.id,
          event.requestId,
          "no_downstream_connection"
        )
      );
      return events;
    }

    // A fresh, independent request/response chain rooted at this queue —
    // same requestId (so playback shows one continuous packet), but its
    // own path, so downstream's eventual REQUEST_COMPLETED/FAILED comes
    // back here, not to the original producer (see class doc).
    const latency = ctx.latencyTo(target);
    events.push(
      createRequestRoutedEvent(ctx.now + latency, this.id, target, event.requestId, {
        startedAt: ctx.now,
        direction: "request",
        path: [this.id],
        key: pending.key,
      })
    );
    return events;
  }
}
