/**
 * Converts a failure-demo's live canvas state (nodes/edges — same shape
 * the Workshop uses) into a SimulationConfig, the same role
 * workshopBridge.ts plays for the real Workshop. Deliberately separate
 * from workshopBridge/buildSimulationConfig rather than reusing it:
 *
 * - A demo's connections are fixed and already fully specified
 *   (FailureModeDemo.startingConnections, each with its own latencyMs) —
 *   there's nothing to derive from editable canvas edges, and
 *   buildSimulationConfig would collapse them to one uniform
 *   Connection Latency value, discarding that.
 * - A demo's topology is validated by construction (it's authored data,
 *   not something a student wired up), so the cycle/unreachable-node
 *   checks buildSimulationConfig does for the live Workshop don't apply.
 *
 * Only node config actually changes here (via remedies) — this rebuilds
 * the entity list from current node state every time, but connections
 * always come straight from the demo definition.
 */

import type { ArchitectureNode } from "@/store/workshopStore";
import type { FailureModeDemo } from "@/lib/entityDeepDive";
import type { SimulationConfig } from "@/simulation/types";
import { ENTITY_CONFIG_SCHEMA } from "@/lib/entityConfigSchema";

const requestRateField = ENTITY_CONFIG_SCHEMA.client?.find((f) => f.key === "requestRate");
const CLIENT_REQUEST_RATE_DEFAULT =
  requestRateField && typeof requestRateField.default === "number" ? requestRateField.default : 20;

export function buildDemoSimulationConfig(
  nodes: ArchitectureNode[],
  demo: FailureModeDemo
): SimulationConfig {
  const clientNode = nodes.find((n) => n.data.entityType === "client");
  const requestRate =
    typeof clientNode?.data.config.requestRate === "number"
      ? clientNode.data.config.requestRate
      : CLIENT_REQUEST_RATE_DEFAULT;

  return {
    entities: nodes.map((node) => ({
      id: node.id,
      type: node.data.entityType,
      position: node.position,
      config: node.data.config,
    })),
    connections: demo.startingConnections,
    scenario: {
      id: "failure-mode-demo",
      title: "Failure Mode Demo",
      trafficPattern: { type: "constant", rate: requestRate },
      durationMs: demo.durationMs,
    },
    options: { seed: demo.seed },
  };
}
