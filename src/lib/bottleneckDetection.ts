import type { ArchitectureNode } from "@/store/workshopStore";
import type { EntityId, EntityMetrics } from "@/simulation/types";

/**
 * Utilization above this counts as "meaningfully loaded" — below it, no
 * node gets flagged at all, even the busiest one on the canvas, so a
 * comfortably provisioned run never manufactures a bottleneck that isn't
 * really there.
 */
const BOTTLENECK_UTILIZATION_THRESHOLD = 0.75;

/**
 * Picks the single busiest non-Client node from the last run, for
 * ComponentNode's canvas-level "Bottleneck" spotlight — reads the same
 * `utilization` field the Inspector's own "Live Metrics" section already
 * shows per node, just surfaced without clicking through every node on
 * the canvas in turn.
 * Returns null whenever nothing is meaningfully loaded (see the threshold
 * above) or there's no run yet — "no bottleneck" is a real, common answer,
 * not a state to force a result out of.
 */
export function findBottleneckNodeId(
  nodes: ArchitectureNode[],
  entityMetrics: Record<EntityId, EntityMetrics> | undefined
): string | null {
  if (!entityMetrics) return null;

  let worstId: string | null = null;
  let worstUtilization = BOTTLENECK_UTILIZATION_THRESHOLD;

  for (const node of nodes) {
    if (node.data.entityType === "client") continue;
    const utilization = entityMetrics[node.id]?.utilization;
    if (utilization === undefined || utilization < worstUtilization) continue;
    worstUtilization = utilization;
    worstId = node.id;
  }

  return worstId;
}
