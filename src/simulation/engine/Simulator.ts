/**
 * The Simulator orchestrates the discrete-event loop:
 * take the next event, advance virtual time, deliver it, record whatever
 * new events result, repeat. (SIMULATION-ENGINE.md §8 — "The Simulation
 * Loop".) It never contains infrastructure behavior itself — that lives
 * entirely in the entities it delivers events to.
 *
 * Zero React dependencies.
 */

import { Clock } from "./Clock";
import { EventQueue } from "./EventQueue";
import { RNG } from "./RNG";
import { assignRequestKey, generateArrivalTimestamps } from "./TrafficGenerator";
import {
  createEvent,
  createRequestStartedEvent,
  resetEventIds,
} from "../events/EventFactory";
import type { Entity, SimulationContext } from "../entities/Entity";
import { Client } from "../entities/Client";
import { APIServer } from "../entities/APIServer";
import { Database } from "../entities/Database";
import { LoadBalancer } from "../entities/LoadBalancer";
import { Cache } from "../entities/Cache";
import { CDN } from "../entities/CDN";
import { collectMetrics } from "../metrics/MetricsCollector";
import type {
  EntityConfig,
  EntityId,
  SimulationConfig,
  SimulationResult,
} from "../types";
import type { SimulationEvent } from "../events/types";

const DEFAULT_MAX_STEPS = 200_000;
const DEFAULT_KEY_POOL_SIZE = 50;

function createEntity(config: EntityConfig): Entity | null {
  switch (config.type) {
    case "client":
      return new Client(config.id);
    case "api":
      return new APIServer(config.id, config.config);
    case "database":
      return new Database(config.id, config.config);
    case "load_balancer":
      return new LoadBalancer(config.id);
    case "cache":
      return new Cache(config.id, config.config);
    case "cdn":
      return new CDN(config.id, config.config);
    default:
      return null;
  }
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  resetEventIds();
  let requestIdCounter = 0;

  const warnings: string[] = [];
  const errors: string[] = [];

  const entities = new Map<EntityId, Entity>();
  for (const entityConfig of config.entities) {
    const entity = createEntity(entityConfig);
    if (!entity) {
      warnings.push(
        `Entity type "${entityConfig.type}" is not implemented yet and was skipped (id: ${entityConfig.id}).`
      );
      continue;
    }
    entities.set(entity.id, entity);
  }

  // Routing topology is directional (only the connection's source may
  // forward to its target). Latency is a property of the physical link,
  // so it's looked up symmetrically — a response travels the same link
  // back at the same configured delay.
  const downstreamMap = new Map<EntityId, EntityId[]>();
  const latencyMap = new Map<EntityId, Map<EntityId, number>>();

  for (const connection of config.connections) {
    const list = downstreamMap.get(connection.source) ?? [];
    list.push(connection.target);
    downstreamMap.set(connection.source, list);

    const latency = connection.latencyMs ?? 0;
    setLatency(latencyMap, connection.source, connection.target, latency);
    setLatency(latencyMap, connection.target, connection.source, latency);
  }

  const clock = new Clock();
  const queue = new EventQueue();
  const rng = new RNG(config.options.seed);
  const allEvents: SimulationEvent[] = [];
  const maxSteps = config.options.maxSteps ?? DEFAULT_MAX_STEPS;

  queue.enqueue(createEvent("SIMULATION_STARTED", 0, null, null, null));

  const clientEntity = config.entities.find((e) => e.type === "client");
  if (!clientEntity) {
    warnings.push("No client entity found; no requests were generated.");
  } else {
    const keyPoolSize =
      typeof clientEntity.config.keyPoolSize === "number"
        ? clientEntity.config.keyPoolSize
        : DEFAULT_KEY_POOL_SIZE;

    const arrivals = generateArrivalTimestamps(
      config.scenario.trafficPattern,
      config.scenario.durationMs,
      rng
    );
    for (const timestamp of arrivals) {
      queue.enqueue(
        createRequestStartedEvent(
          timestamp,
          clientEntity.id,
          `req_${++requestIdCounter}`,
          { key: assignRequestKey(rng, keyPoolSize) }
        )
      );
    }
  }

  let steps = 0;
  while (queue.hasEvents()) {
    if (++steps > maxSteps) {
      warnings.push(
        `Simulation stopped after reaching the ${maxSteps}-event safety limit.`
      );
      break;
    }

    const event = queue.dequeue();
    clock.advanceTo(event.timestamp);
    allEvents.push(event);

    if (event.type === "SIMULATION_STARTED") continue;

    const entity = event.destination ? entities.get(event.destination) : null;
    if (!entity) continue;

    const ctx: SimulationContext = {
      now: clock.now(),
      rng,
      downstream: downstreamMap.get(entity.id) ?? [],
      latencyTo: (targetId) => latencyMap.get(entity.id)?.get(targetId) ?? 0,
    };

    const newEvents = entity.handleEvent(event, ctx);
    for (const newEvent of newEvents) {
      queue.enqueue(newEvent);
    }
  }

  allEvents.push(
    createEvent("SIMULATION_FINISHED", clock.now(), null, null, null)
  );

  const metrics = collectMetrics(
    allEvents,
    Array.from(entities.keys()),
    config.scenario.durationMs
  );

  return {
    events: allEvents,
    metrics,
    duration: clock.now(),
    warnings,
    errors,
    metadata: {
      seed: config.options.seed,
      version: "0.1.0",
      generatedAt: new Date().toISOString(),
    },
  };
}

function setLatency(
  map: Map<EntityId, Map<EntityId, number>>,
  from: EntityId,
  to: EntityId,
  latency: number
): void {
  const inner = map.get(from) ?? new Map<EntityId, number>();
  inner.set(to, latency);
  map.set(from, inner);
}
