/**
 * Derives a MetricsSnapshot from a finished event log.
 *
 * From: SIMULATION-ENGINE.md §10 — "Metrics Are Emergent"
 * Nothing here is incrementally tracked by entities during the run —
 * every number is recomputed from the immutable event array, so it stays
 * reproducible and independently testable.
 *
 * Zero React dependencies.
 */

import type { SimulationEvent } from "../events/types";
import type {
  CDNEdgeMetrics,
  EntityId,
  EntityMetrics,
  MetricsSnapshot,
  RoutingTargetMetrics,
} from "../types";

export function collectMetrics(
  events: SimulationEvent[],
  entityIds: EntityId[],
  totalDurationMs: number,
  /**
   * Ids of entities whose completions/failures represent an actual
   * client-originated request finishing (see Client.ts — "the lifecycle
   * simply ends at the client"). Optional and, when omitted, every
   * REQUEST_COMPLETED/REQUEST_FAILED is counted — the original behavior,
   * which callers that don't yet know their client ids (existing tests)
   * can keep relying on.
   *
   * Needed because MessageQueue acknowledges the client immediately, then
   * separately dispatches to its own downstream consumer under the same
   * requestId. That dispatch is a real, independently-simulated request —
   * it ends the same way any other does, with a REQUEST_COMPLETED/FAILED —
   * except addressed back to the queue, not a client. Without this filter
   * that second completion would double-count against totals that were
   * sized to one event per client-issued request.
   */
  clientIds?: EntityId[]
): MetricsSnapshot {
  const clientIdSet = clientIds ? new Set(clientIds) : null;
  const countsTowardClientOutcome = (destination: EntityId | null): boolean =>
    !clientIdSet || (destination !== null && clientIdSet.has(destination));

  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;
  const latencies: number[] = [];

  const entityMetrics: Record<EntityId, EntityMetrics> = {};
  for (const id of entityIds) {
    entityMetrics[id] = {
      utilization: 0,
      requestCount: 0,
      errorCount: 0,
      queueLength: 0,
    };
  }

  const activityByEntity = new Map<EntityId, { time: number; delta: 1 | -1 }[]>();
  const queueActivityByEntity = new Map<EntityId, { time: number; delta: 1 | -1 }[]>();
  const cacheAccessByEntity = new Map<EntityId, { hits: number; misses: number }>();
  const edgeAccessByEntity = new Map<EntityId, Map<number, { hits: number; misses: number }>>();
  const routingByEntity = new Map<EntityId, Map<EntityId, number>>();

  for (const event of events) {
    switch (event.type) {
      case "REQUEST_STARTED":
        totalRequests++;
        break;
      case "REQUEST_COMPLETED":
        if (countsTowardClientOutcome(event.destination)) {
          successfulRequests++;
          if (typeof event.metadata.duration === "number") {
            latencies.push(event.metadata.duration);
          }
        }
        break;
      case "REQUEST_FAILED":
      case "QUEUE_FULL":
      case "DATABASE_BUSY":
      case "CONNECTION_REJECTED":
        if (event.type === "REQUEST_FAILED" && countsTowardClientOutcome(event.destination)) {
          failedRequests++;
        }
        if (event.source && entityMetrics[event.source]) {
          entityMetrics[event.source].errorCount++;
        }
        break;
      case "PROCESSING_STARTED":
        if (event.source && entityMetrics[event.source]) {
          entityMetrics[event.source].requestCount++;
        }
        recordActivity(activityByEntity, event.source, event.timestamp, 1);
        break;
      case "PROCESSING_COMPLETED":
        recordActivity(activityByEntity, event.source, event.timestamp, -1);
        break;
      case "REQUEST_ROUTED":
        if (event.source && event.destination && event.metadata.direction === "request") {
          const targets = routingByEntity.get(event.source) ?? new Map<EntityId, number>();
          targets.set(event.destination, (targets.get(event.destination) ?? 0) + 1);
          routingByEntity.set(event.source, targets);
        }
        break;
      case "REQUEST_QUEUED":
        recordActivity(queueActivityByEntity, event.source, event.timestamp, 1);
        break;
      case "REQUEST_DEQUEUED":
        recordActivity(queueActivityByEntity, event.source, event.timestamp, -1);
        break;
      case "CACHE_HIT":
      case "CACHE_MISS": {
        if (!event.source) break;
        const counts = cacheAccessByEntity.get(event.source) ?? { hits: 0, misses: 0 };
        if (event.type === "CACHE_HIT") counts.hits++;
        else counts.misses++;
        cacheAccessByEntity.set(event.source, counts);

        if (typeof event.metadata.edgeIndex === "number") {
          const edgeMap = edgeAccessByEntity.get(event.source) ?? new Map();
          const edgeCounts = edgeMap.get(event.metadata.edgeIndex) ?? { hits: 0, misses: 0 };
          if (event.type === "CACHE_HIT") edgeCounts.hits++;
          else edgeCounts.misses++;
          edgeMap.set(event.metadata.edgeIndex, edgeCounts);
          edgeAccessByEntity.set(event.source, edgeMap);
        }
        break;
      }
      default:
        break;
    }
  }

  for (const [entityId, intervals] of activityByEntity) {
    const metrics = entityMetrics[entityId];
    if (!metrics) continue;
    metrics.utilization = computeUtilization(intervals, totalDurationMs);
  }

  for (const [entityId, counts] of cacheAccessByEntity) {
    const metrics = entityMetrics[entityId];
    if (!metrics) continue;
    const attempts = counts.hits + counts.misses;
    metrics.cacheHitRate = attempts > 0 ? counts.hits / attempts : 0;
  }

  for (const [entityId, edgeMap] of edgeAccessByEntity) {
    const metrics = entityMetrics[entityId];
    if (!metrics) continue;
    const cdnEdges: CDNEdgeMetrics[] = [...edgeMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([edgeIndex, counts]) => {
        const requests = counts.hits + counts.misses;
        return {
          edgeIndex,
          requests,
          hitRate: requests > 0 ? counts.hits / requests : 0,
        };
      });
    metrics.cdnEdges = cdnEdges;
  }

  for (const [entityId, targets] of routingByEntity) {
    const metrics = entityMetrics[entityId];
    if (!metrics) continue;
    const routingDistribution: RoutingTargetMetrics[] = [...targets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([targetId, requests]) => ({ targetId, requests }));
    metrics.routingDistribution = routingDistribution;
  }

  for (const [entityId, intervals] of queueActivityByEntity) {
    const metrics = entityMetrics[entityId];
    if (!metrics) continue;
    metrics.queueLength = computeCurrentCount(intervals);
  }

  latencies.sort((a, b) => a - b);

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
    averageLatency: average(latencies),
    p50Latency: percentile(latencies, 0.5),
    p95Latency: percentile(latencies, 0.95),
    p99Latency: percentile(latencies, 0.99),
    throughput:
      totalDurationMs > 0 ? successfulRequests / (totalDurationMs / 1000) : 0,
    entityMetrics,
  };
}

function recordActivity(
  map: Map<EntityId, { time: number; delta: 1 | -1 }[]>,
  entityId: EntityId | null,
  time: number,
  delta: 1 | -1
): void {
  if (!entityId) return;
  const list = map.get(entityId) ?? [];
  list.push({ time, delta });
  map.set(entityId, list);
}

/**
 * Sweep-line over start/end markers so overlapping (concurrent) work
 * doesn't double-count busy time — utilization is the fraction of
 * wall-clock time the entity had at least one active request.
 */
function computeUtilization(
  intervals: { time: number; delta: 1 | -1 }[],
  totalDurationMs: number
): number {
  if (totalDurationMs <= 0) return 0;
  const sorted = [...intervals].sort((a, b) => a.time - b.time);

  let concurrency = 0;
  let busyTime = 0;
  let lastTime = sorted.length > 0 ? sorted[0].time : 0;

  for (const point of sorted) {
    if (concurrency > 0) busyTime += point.time - lastTime;
    concurrency += point.delta;
    lastTime = point.time;
  }

  return Math.min(1, busyTime / totalDurationMs);
}

/**
 * Net running sum of start/end markers — unlike computeUtilization this
 * isn't a fraction of a window, it's a point-in-time count (how many
 * requests are sitting in the backlog once every marker in `events` has
 * been applied). Given the caller already scoped `events` to "everything
 * up to now" (see PlaybackController), this is exactly the queue length
 * as of that instant. By the end of a fully-drained simulation it's
 * always 0 — nothing queued is ever left un-dequeued if the discrete-event
 * loop ran to completion.
 */
function computeCurrentCount(intervals: { time: number; delta: 1 | -1 }[]): number {
  const sorted = [...intervals].sort((a, b) => a.time - b.time);
  let count = 0;
  for (const point of sorted) count += point.delta;
  return Math.max(0, count);
}

/** Exported for reuse by MetricsTimeSeries.ts — same definition, one source of truth. */
export function average(sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  return sortedValues.reduce((sum, v) => sum + v, 0) / sortedValues.length;
}

export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil(p * sortedValues.length) - 1
  );
  return sortedValues[Math.max(0, index)];
}
