/**
 * Converts a failure-demo's live canvas state (nodes/edges — same shape
 * the Workshop uses) into a SimulationConfig, the same role
 * workshopBridge.ts plays for the real Workshop. Deliberately separate
 * from workshopBridge/buildSimulationConfig rather than reusing it:
 *
 * - A demo's topology is validated by construction (it's authored data,
 *   not something a student wired up from scratch), so the cycle/
 *   unreachable-node checks buildSimulationConfig does for the live
 *   Workshop don't apply.
 * - Connections still need real, individually-tuned latency values (not
 *   workshopBridge's single uniform Connection Latency setting) — see
 *   below for how that's preserved even though edges are now editable.
 *
 * Node config changes via config-toggle remedies; edges change via
 * architecture-change remedies (see failureDemoStore.ts's `addNode`/
 * `onConnect`/`onEdgesChange`) — this rebuilds both the entity list and
 * the connection list from current canvas state every time.
 */

import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import type { ArchitectureRemedy, FailureModeDemo } from "@/lib/entityDeepDive";
import type { ConnectionConfig, SimulationConfig } from "@/simulation/types";
import { ENTITY_CONFIG_SCHEMA } from "@/lib/entityConfigSchema";

const requestRateField = ENTITY_CONFIG_SCHEMA.client?.find((f) => f.key === "requestRate");
const CLIENT_REQUEST_RATE_DEFAULT =
  requestRateField && typeof requestRateField.default === "number" ? requestRateField.default : 20;

/** Latency for a connection a student draws themselves while building an architecture-change remedy — matches the 5ms used for inter-node hops across every existing demo's authored connections. */
const DEFAULT_NEW_CONNECTION_LATENCY_MS = 5;

export function buildDemoSimulationConfig(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  demo: FailureModeDemo
): SimulationConfig {
  const clientNode = nodes.find((n) => n.data.entityType === "client");
  const requestRate =
    typeof clientNode?.data.config.requestRate === "number"
      ? clientNode.data.config.requestRate
      : CLIENT_REQUEST_RATE_DEFAULT;

  // Every existing demo's edges are fixed (never editable — see
  // onEdgesChange) and so always match a startingConnections pair
  // exactly, preserving that connection's real tuned latencyMs here. Only
  // a student-drawn connection (possible once an architecture-change
  // remedy's scoped palette is active) can miss this lookup, falling back
  // to the default above.
  const originalLatencyByPair = new Map(
    demo.startingConnections.map((c) => [`${c.source}->${c.target}`, c.latencyMs])
  );
  const connections: ConnectionConfig[] = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    latencyMs:
      originalLatencyByPair.get(`${edge.source}->${edge.target}`) ??
      DEFAULT_NEW_CONNECTION_LATENCY_MS,
  }));

  return {
    entities: nodes.map((node) => ({
      id: node.id,
      type: node.data.entityType,
      position: node.position,
      config: node.data.config,
    })),
    connections,
    scenario: {
      id: "failure-mode-demo",
      title: "Failure Mode Demo",
      trafficPattern: { type: "constant", rate: requestRate },
      durationMs: demo.durationMs,
    },
    options: { seed: demo.seed },
  };
}

/**
 * Builds a SimulationConfig straight from an architecture remedy's
 * `referenceEntities`/`referenceConnections` — the hand-authored,
 * tuning-verified "what a correct fix looks like" architecture (see
 * `ArchitectureRemedy`'s doc). Used only by Compare, never by the live
 * canvas: no node/edge-shape indirection needed since this is already
 * trusted, fully-specified data, not something derived from student
 * interaction.
 */
export function buildReferenceSimulationConfig(
  remedy: ArchitectureRemedy,
  demo: FailureModeDemo
): SimulationConfig {
  const clientEntity = remedy.referenceEntities.find((e) => e.type === "client");
  const requestRate =
    typeof clientEntity?.config.requestRate === "number"
      ? clientEntity.config.requestRate
      : CLIENT_REQUEST_RATE_DEFAULT;

  return {
    entities: remedy.referenceEntities.map((entity) => ({
      id: entity.id,
      type: entity.type,
      position: entity.position,
      config: entity.config,
    })),
    connections: remedy.referenceConnections,
    scenario: {
      id: "failure-mode-demo-reference",
      title: "Failure Mode Demo — Reference Fix",
      trafficPattern: { type: "constant", rate: requestRate },
      durationMs: demo.durationMs,
    },
    options: { seed: demo.seed },
  };
}
