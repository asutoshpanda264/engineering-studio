/**
 * Factory functions for creating simulation events.
 *
 * Centralizing event creation ensures every event has the required fields
 * and makes it easy to add validation or defaults later.
 *
 * All events are immutable by construction.
 */

import type {
  SimulationEvent,
  EventType,
  EntityId,
  RequestId,
  Timestamp,
} from "./types";

let _eventIdCounter = 0;

/**
 * Generates a monotonically increasing event ID.
 * Not random — just ensures uniqueness within a run.
 */
function generateEventId(): string {
  return `evt_${++_eventIdCounter}`;
}

/**
 * Resets the counter (used between simulation runs for determinism).
 */
export function resetEventIds(): void {
  _eventIdCounter = 0;
}

/**
 * Creates a new immutable simulation event.
 */
export function createEvent(
  type: EventType,
  timestamp: Timestamp,
  source: EntityId | null,
  destination: EntityId | null,
  requestId: RequestId | null,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return Object.freeze({
    id: generateEventId(),
    timestamp,
    type,
    source,
    destination,
    requestId,
    metadata,
  });
}

/**
 * Creates a request-started event. Destination defaults to the client
 * itself, since the Client entity is the one that reacts to it (routing
 * the new request downstream) — the simulator dispatches every event by
 * its `destination`.
 */
export function createRequestStartedEvent(
  timestamp: Timestamp,
  clientId: EntityId,
  requestId: RequestId,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent(
    "REQUEST_STARTED",
    timestamp,
    clientId,
    clientId,
    requestId,
    metadata
  );
}

/**
 * Creates a request-routed event — a request or response arriving at the
 * next hop in the architecture. Reused for every hop (request leg and
 * response leg); `metadata.direction` distinguishes the two.
 */
export function createRequestRoutedEvent(
  timestamp: Timestamp,
  source: EntityId,
  destination: EntityId,
  requestId: RequestId,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent(
    "REQUEST_ROUTED",
    timestamp,
    source,
    destination,
    requestId,
    metadata
  );
}

/**
 * Creates a request-completed event, delivered to the client that
 * originated the request.
 */
export function createRequestCompletedEvent(
  timestamp: Timestamp,
  sourceId: EntityId,
  destination: EntityId | null,
  requestId: RequestId,
  duration: number,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent(
    "REQUEST_COMPLETED",
    timestamp,
    sourceId,
    destination,
    requestId,
    { duration, ...metadata }
  );
}

/**
 * Creates a processing-started event — an entity has begun doing bounded
 * capacity work (an API handler running, a database executing a query).
 */
export function createProcessingStartedEvent(
  timestamp: Timestamp,
  entityId: EntityId,
  requestId: RequestId,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent(
    "PROCESSING_STARTED",
    timestamp,
    entityId,
    entityId,
    requestId,
    metadata
  );
}

/**
 * Creates a processing-completed event — an entity finished the work it
 * started with createProcessingStartedEvent. Self-addressed: it's how an
 * entity schedules its own future "I'm done" wake-up in a discrete-event
 * loop that only reacts to delivered events.
 */
export function createProcessingCompletedEvent(
  timestamp: Timestamp,
  entityId: EntityId,
  requestId: RequestId,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent(
    "PROCESSING_COMPLETED",
    timestamp,
    entityId,
    entityId,
    requestId,
    metadata
  );
}

/**
 * Creates a request-queued event — an entity accepted work into its bounded
 * backlog because it was already at capacity. Self-addressed, same as
 * PROCESSING_STARTED, since it's the entity's own admission decision.
 */
export function createRequestQueuedEvent(
  timestamp: Timestamp,
  entityId: EntityId,
  requestId: RequestId,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent(
    "REQUEST_QUEUED",
    timestamp,
    entityId,
    entityId,
    requestId,
    metadata
  );
}

/**
 * Creates a request-dequeued event — a previously queued request left the
 * backlog and began processing. Paired with createRequestQueuedEvent the
 * same way PROCESSING_STARTED/COMPLETED are paired, so queue length can be
 * derived by sweeping start/end markers (see MetricsCollector).
 */
export function createRequestDequeuedEvent(
  timestamp: Timestamp,
  entityId: EntityId,
  requestId: RequestId,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent(
    "REQUEST_DEQUEUED",
    timestamp,
    entityId,
    entityId,
    requestId,
    metadata
  );
}

/**
 * Creates a request-failed event.
 */
export function createRequestFailedEvent(
  timestamp: Timestamp,
  source: EntityId | null,
  destination: EntityId | null,
  requestId: RequestId,
  reason: string,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent(
    "REQUEST_FAILED",
    timestamp,
    source,
    destination,
    requestId,
    { reason, ...metadata }
  );
}

/**
 * Creates a queue-full event — an entity's backlog was already at
 * capacity when a new request arrived, so it was rejected outright.
 */
export function createQueueFullEvent(
  timestamp: Timestamp,
  entityId: EntityId,
  requestId: RequestId,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent("QUEUE_FULL", timestamp, entityId, entityId, requestId, metadata);
}

/**
 * Creates a database-busy event — a database rejected a query because it
 * was already at its connection/queue limit.
 */
export function createDatabaseBusyEvent(
  timestamp: Timestamp,
  databaseId: EntityId,
  requestId: RequestId,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent("DATABASE_BUSY", timestamp, databaseId, databaseId, requestId, metadata);
}

/**
 * Creates a cache hit or miss event.
 */
export function createCacheAccessEvent(
  type: "CACHE_HIT" | "CACHE_MISS",
  timestamp: Timestamp,
  cacheId: EntityId,
  requestId: RequestId,
  key: string,
  hit: boolean,
  metadata: Record<string, unknown> = {}
): SimulationEvent {
  return createEvent(
    type,
    timestamp,
    cacheId,
    null,
    requestId,
    { key, hit, ...metadata }
  );
}
