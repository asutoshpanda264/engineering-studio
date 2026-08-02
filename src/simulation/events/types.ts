/**
 * Simulation event types.
 *
 * Events are the smallest observable unit in the simulation.
 * Every event is immutable and append-only — the event log is the
 * single source of truth for all visualization, metrics, and playback.
 *
 * From: TECHNICAL-SPECIFICATION.md §5 — Event
 *
 * Every event must contain:
 *   - Unique ID
 *   - Timestamp
 *   - Type
 *   - Source
 *   - Destination
 *   - Request ID
 *   - Metadata
 */

import type { EntityId, RequestId, Timestamp } from "../types";

export type { EntityId, RequestId, Timestamp };

/**
 * All possible event types, grouped by category.
 * From: TECHNICAL-SPECIFICATION.md §6 — Event Categories
 */
export type EventType =
  // Infrastructure events
  | "REQUEST_STARTED"
  | "REQUEST_ROUTED"
  | "REQUEST_COMPLETED"
  | "REQUEST_FAILED"
  | "TIMEOUT"
  | "RETRY"
  // Entity events
  | "QUEUE_FULL"
  | "CACHE_HIT"
  | "CACHE_MISS"
  | "DATABASE_BUSY"
  | "CONNECTION_REJECTED"
  // Processing lifecycle — any entity that does bounded-capacity work
  // (APIServer, Database, ...) emits these around that work, so utilization
  // metrics can be derived by pairing start/complete per entity.
  | "PROCESSING_STARTED"
  | "PROCESSING_COMPLETED"
  // Backlog lifecycle — brackets time a request spends waiting once
  // capacity is full, as opposed to PROCESSING_STARTED/COMPLETED which
  // bracket active work. Pairing these the same way derives queue length.
  | "REQUEST_QUEUED"
  | "REQUEST_DEQUEUED"
  // System events
  | "SIMULATION_STARTED"
  | "SIMULATION_FINISHED"
  | "SCENARIO_EVENT"
  | "FAILURE_INJECTED"
  | "TRAFFIC_SPIKE"
  | "RECOVERY"
  // Playback events (metadata for the UI)
  | "PLAYBACK_STARTED"
  | "PLAYBACK_PAUSED"
  | "PLAYBACK_RESUMED"
  | "PLAYBACK_SEEKED";

/**
 * The immutable simulation event — the atomic unit of truth.
 */
export interface SimulationEvent {
  readonly id: string;
  readonly timestamp: Timestamp;
  readonly type: EventType;
  readonly source: EntityId | null; // null for system-wide events
  readonly destination: EntityId | null; // null for client-originated requests
  readonly requestId: RequestId | null; // null for system/scenario events
  readonly metadata: Record<string, unknown>;
}

/**
 * Metadata shape for REQUEST_STARTED events.
 */
export interface RequestStartedMetadata {
  requestId: RequestId;
  path?: string;
  priority?: number;
}

/**
 * Metadata shape for REQUEST_COMPLETED events.
 */
export interface RequestCompletedMetadata {
  requestId: RequestId;
  duration: number; // total time from start to completion (ms)
  statusCode?: number;
}

/**
 * Metadata shape for REQUEST_FAILED events.
 */
export interface RequestFailedMetadata {
  requestId: RequestId;
  reason: string;
  statusCode?: number;
}

/**
 * Metadata shape for CACHE_HIT / CACHE_MISS events.
 */
export interface CacheAccessMetadata {
  requestId: RequestId;
  key: string;
  hit: boolean;
  cachedAt?: number; // when the key was cached (ms)
}

/**
 * Carried on every event as a request moves through the architecture.
 * Each hop copies this forward so any entity can compute end-to-end
 * duration or respond to whoever sent it, without a shared registry —
 * every entity only knows what's in the event it received (Local Knowledge).
 */
export interface RequestLifecycleMetadata extends Record<string, unknown> {
  /** Timestamp the request originated at the Client — used to compute duration. */
  startedAt: Timestamp;
  /** Whether this hop is on the way to the database ("request") or back ("response"). */
  direction: "request" | "response";
  /** Entity ids visited so far, in order, starting with the Client. */
  path: EntityId[];
  /**
   * Which resource this request is for — drawn from a skewed distribution
   * over the Client's Key Pool Size, so some keys repeat far more than
   * others (see TrafficGenerator.assignRequestKey). This is what makes a
   * Cache's hit rate meaningful: identical keys can hit, unique ones can't.
   */
  key: string;
}
