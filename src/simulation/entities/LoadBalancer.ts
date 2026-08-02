/**
 * The LoadBalancer spreads incoming requests across multiple downstream
 * servers instead of sending every request to just one, using whichever
 * routing algorithm it's configured with.
 *
 * ENTITIES.md doesn't document this entity (only Client is written up);
 * TECHNICAL-SPECIFICATION.md sketches its config as Algorithm / Weights /
 * Health Check Interval. Two algorithms ship: round-robin (deterministic,
 * needs no state beyond a counter) and least-connections (routes to
 * whichever downstream target currently has the fewest in-flight
 * requests). The whole point of offering both is comparison — round-robin
 * and least-connections behave identically when every target is equally
 * fast, and only diverge once one target is slower or overloaded. That
 * divergence, visible in the per-target request distribution (see
 * MetricsCollector's routingDistribution), is the actual lesson; a
 * load balancer with a single hardcoded algorithm can't teach it.
 *
 * Least-connections tracks in-flight count per target itself (incremented
 * on dispatch, decremented when that target's response passes back
 * through here) rather than asking each target — Local Knowledge, same
 * as every other entity. One known gap: a REQUEST_FAILED reply bypasses
 * intermediate hops entirely (routed straight to the client, see
 * responseRouting.ts / Simulator.ts), so a request that fails downstream
 * never decrements this counter. Documented simplification, not a bug:
 * modeling it correctly would mean rerouting failure events through every
 * hop, which no entity does today.
 *
 * It does forward the response leg back through itself (see
 * responseRouting.ts) even though round-robin doesn't need to observe
 * responses — least-connections does, and so does anything sitting
 * behind the load balancer (a Cache), and skipping that leg here would
 * silently break them.
 *
 * Unlike APIServer/Database, the LoadBalancer has no capacity of its own
 * — it makes an instant routing decision and forwards. Modeling its own
 * backpressure would conflate "which server gets this request" with
 * "is this server too busy", which Client/API/Database already teach.
 *
 * Learning goal: a single server has a capacity ceiling. Load balancing
 * is how you scale horizontally past it — but only if requests actually
 * spread evenly across replicas, and different algorithms achieve that
 * differently once replicas aren't identical.
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

export type LoadBalancerAlgorithm = "round_robin" | "least_connections";

export interface LoadBalancerConfig {
  algorithm?: LoadBalancerAlgorithm;
}

const DEFAULTS: Required<LoadBalancerConfig> = {
  algorithm: "round_robin",
};

export class LoadBalancer implements Entity {
  readonly id: EntityId;

  private readonly config: Required<LoadBalancerConfig>;
  private nextIndex = 0;
  /** Only meaningful (and only populated) under least_connections. */
  private readonly inFlightByTarget = new Map<EntityId, number>();

  constructor(id: EntityId, config: LoadBalancerConfig = {}) {
    this.id = id;
    this.config = { ...DEFAULTS, ...config };
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
      this.recordCompletion(event.source);
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

    const target = this.selectTarget(ctx.downstream);
    this.recordDispatch(target);

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

  private selectTarget(downstream: EntityId[]): EntityId {
    if (this.config.algorithm === "least_connections") {
      // Break ties with the same round-robin cursor used below, not
      // "always the first tied target" — otherwise a fleet of equally
      // fast servers (every request finds all loads tied at 0) would
      // pile onto downstream[0] instead of splitting evenly, which
      // would defeat the point of comparing this against round_robin
      // under identical conditions.
      const minLoad = Math.min(
        ...downstream.map((target) => this.inFlightByTarget.get(target) ?? 0)
      );
      const tied = downstream.filter(
        (target) => (this.inFlightByTarget.get(target) ?? 0) === minLoad
      );
      const target = tied[this.nextIndex % tied.length];
      this.nextIndex++;
      return target;
    }

    const target = downstream[this.nextIndex % downstream.length];
    this.nextIndex++;
    return target;
  }

  private recordDispatch(target: EntityId): void {
    this.inFlightByTarget.set(target, (this.inFlightByTarget.get(target) ?? 0) + 1);
  }

  private recordCompletion(target: EntityId | null): void {
    if (!target) return;
    const current = this.inFlightByTarget.get(target);
    if (current === undefined) return;
    this.inFlightByTarget.set(target, Math.max(0, current - 1));
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
