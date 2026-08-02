/**
 * The LoadBalancer spreads incoming requests across multiple downstream
 * servers instead of sending every request to just one.
 *
 * ENTITIES.md doesn't document this entity (only Client is written up);
 * TECHNICAL-SPECIFICATION.md sketches its config as Algorithm / Weights /
 * Health Check Interval. v1 ships round-robin only — deterministic,
 * needs no state beyond a counter. "Least connections" needs to track
 * how many requests are still in flight per target, which means
 * observing responses too — a deliberate follow-up, not this pass.
 *
 * It does forward the response leg back through itself (see
 * responseRouting.ts) even though round-robin doesn't need to observe
 * responses — anything sitting behind the load balancer (a Cache, or
 * whatever "least connections" becomes) does, and skipping that leg
 * here would silently break them.
 *
 * Unlike APIServer/Database, the LoadBalancer has no capacity of its own
 * — it makes an instant routing decision and forwards. Modeling its own
 * backpressure would conflate "which server gets this request" with
 * "is this server too busy", which Client/API/Database already teach.
 *
 * Learning goal: a single server has a capacity ceiling. Load balancing
 * is how you scale horizontally past it — but only if requests actually
 * spread evenly across replicas.
 */

import type { Entity, SimulationContext } from "./Entity";
import type { EntityId } from "../types";
import type {
  RequestLifecycleMetadata,
  SimulationEvent,
} from "../events/types";
import { findResponseTarget } from "./responseRouting";
import {
  createRequestCompletedEvent,
  createRequestFailedEvent,
  createRequestRoutedEvent,
} from "../events/EventFactory";

export class LoadBalancer implements Entity {
  readonly id: EntityId;

  private nextIndex = 0;

  constructor(id: EntityId) {
    this.id = id;
  }

  handleEvent(
    event: SimulationEvent,
    ctx: SimulationContext
  ): SimulationEvent[] {
    if (event.type !== "REQUEST_ROUTED" || event.destination !== this.id) {
      return [];
    }
    if (!event.requestId) return [];

    const meta = event.metadata as RequestLifecycleMetadata;

    if (meta.direction === "response") {
      return this.forwardResponse(meta, ctx, event.requestId);
    }

    if (ctx.downstream.length === 0) {
      return [
        createRequestFailedEvent(
          ctx.now,
          this.id,
          meta.path[0],
          event.requestId,
          "no_downstream_connection",
          { startedAt: meta.startedAt }
        ),
      ];
    }

    const target = ctx.downstream[this.nextIndex % ctx.downstream.length];
    this.nextIndex++;

    const latency = ctx.latencyTo(target);
    return [
      createRequestRoutedEvent(
        ctx.now + latency,
        this.id,
        target,
        event.requestId,
        {
          ...meta,
          direction: "request",
          path: [...meta.path, this.id],
        }
      ),
    ];
  }

  /** Instant pass-through — no capacity check, same reasoning as the class doc. */
  private forwardResponse(
    meta: RequestLifecycleMetadata,
    ctx: SimulationContext,
    requestId: string
  ): SimulationEvent[] {
    const { target, isClient } = findResponseTarget(this.id, meta.path);
    const latency = ctx.latencyTo(target);

    if (isClient) {
      const duration = ctx.now + latency - meta.startedAt;
      return [
        createRequestCompletedEvent(
          ctx.now + latency,
          this.id,
          target,
          requestId,
          duration
        ),
      ];
    }

    return [
      createRequestRoutedEvent(ctx.now + latency, this.id, target, requestId, {
        ...meta,
        direction: "response",
        path: meta.path,
      }),
    ];
  }
}
