/**
 * Derives a node's visual status dot from the last simulation run's
 * metrics. Shared by workshopStore (the live Workshop) and
 * failureDemoStore (the "Try It" failure-mode demos) — both stores render
 * the same ComponentNode/StatusLegend and should agree on what each color
 * means.
 */

import type { ArchitectureNode, NodeStatus } from "@/store/workshopStore";
import type { SimulationResult } from "@/simulation/types";

/**
 * "unavailable" (rendered as a pulsing red "Crashed") is distinct from
 * "error" (steady red) — it means the entity is rejecting nearly
 * everything, not just some fraction of traffic. See StatusLegend.tsx.
 */
const CRASH_FAILURE_RATE = 0.9;

export function deriveNodeStatus(
  node: ArchitectureNode,
  result: SimulationResult
): NodeStatus {
  if (node.data.entityType === "client") {
    if (result.metrics.totalRequests === 0) return "idle";
    if (result.metrics.successRate === 0) return "unavailable";
    if (result.metrics.successRate >= 0.95) return "running";
    if (result.metrics.successRate >= 0.5) return "overloaded";
    return "error";
  }

  const metrics = result.metrics.entityMetrics[node.id];
  if (!metrics) return "idle";

  const attempts = metrics.requestCount + metrics.errorCount;
  const failureRate = attempts > 0 ? metrics.errorCount / attempts : 0;
  if (attempts > 0 && failureRate >= CRASH_FAILURE_RATE) return "unavailable";
  if (metrics.errorCount > 0) return "error";
  if (metrics.utilization > 0.85) return "overloaded";
  if (metrics.requestCount > 0) return "running";
  return "idle";
}
