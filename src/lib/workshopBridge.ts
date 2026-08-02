/**
 * Converts the workshop's canvas state (Zustand — nodes/edges) into the
 * simulation engine's input contract (SimulationConfig). This is the one
 * place UI state crosses into the framework-independent simulation layer
 * — everything on the other side of this function has zero React/Zustand
 * imports.
 *
 * Also does minimal pre-flight validation: the engine itself would just
 * silently generate zero requests for an unrunnable graph, but the UI
 * should tell the user why, not just do nothing (WORKSHOP-UI.md §17 —
 * "Errors should educate, not frustrate").
 */

import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import type { SimulationConfig } from "@/simulation/types";
import { ENTITY_CONFIG_SCHEMA } from "@/lib/entityConfigSchema";
import { findCycle, findUnreachableNodes } from "@/lib/graphValidation";

// Used when no scenario is active (a freeform architecture) — an active
// scenario supplies its own seed via ScenarioOptions.seed so runs stay
// reproducible against the numbers it was tuned/tested with (see
// scenarios/movieTicketBooking.ts). Duration and connection latency are
// adjustable from the Inspector's Scenario panel; traffic rate comes from
// the Client node's own config. Only the traffic pattern *shape*
// (constant vs burst/ramp) is still hardcoded.
const DEFAULT_SEED = 42;

const requestRateField = ENTITY_CONFIG_SCHEMA.client?.find(
  (f) => f.key === "requestRate"
);
const CLIENT_REQUEST_RATE_DEFAULT =
  requestRateField && typeof requestRateField.default === "number"
    ? requestRateField.default
    : 20;

export interface ScenarioOptions {
  durationMs: number;
  connectionLatencyMs: number;
  /** Active scenario's seed, if one is loaded — falls back to DEFAULT_SEED otherwise. */
  seed?: number;
}

export type BuildConfigResult =
  | { ok: true; config: SimulationConfig; warnings: string[] }
  | { ok: false; error: string };

export function buildSimulationConfig(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  scenarioOptions: ScenarioOptions
): BuildConfigResult {
  if (nodes.length === 0) {
    return {
      ok: false,
      error:
        "Add at least one component to the canvas before running a simulation.",
    };
  }

  const clientNode = nodes.find((node) => node.data.entityType === "client");
  if (!clientNode) {
    return {
      ok: false,
      error:
        "This architecture has no Client. Every simulation needs at least one Client to generate requests.",
    };
  }

  const clientHasOutgoingConnection = edges.some(
    (edge) => edge.source === clientNode.id
  );
  if (!clientHasOutgoingConnection) {
    return {
      ok: false,
      error:
        "The Client isn't connected to anything. Connect it to a component so requests have somewhere to go.",
    };
  }

  const labelOf = (id: string) =>
    nodes.find((n) => n.id === id)?.data.label ?? id;

  // A wiring cycle would send a request in circles forever — several
  // entities (Client, LoadBalancer, the request leg of API/Database/Cache)
  // forward to a downstream neighbor without tracking where a request has
  // already been, so nothing would stop it short of burning the entire
  // event budget on one stuck request (see graphValidation.ts).
  const cycle = findCycle(
    nodes.map((n) => ({ id: n.id })),
    edges
  );
  if (cycle) {
    return {
      ok: false,
      error: `This architecture has a cycle: ${cycle.map(labelOf).join(" → ")}. Requests would loop forever — remove one of these connections.`,
    };
  }

  const unreachable = findUnreachableNodes(
    nodes.map((n) => ({ id: n.id })),
    edges,
    clientNode.id
  );
  const warnings =
    unreachable.length > 0
      ? [
          `${unreachable.map(labelOf).join(", ")} ${unreachable.length === 1 ? "isn't" : "aren't"} connected to the Client and will never receive traffic.`,
        ]
      : [];

  const requestRate =
    typeof clientNode.data.config.requestRate === "number"
      ? clientNode.data.config.requestRate
      : CLIENT_REQUEST_RATE_DEFAULT;

  const config: SimulationConfig = {
    entities: nodes.map((node) => ({
      id: node.id,
      type: node.data.entityType,
      position: node.position,
      config: node.data.config,
    })),
    connections: edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      latencyMs: scenarioOptions.connectionLatencyMs,
    })),
    scenario: {
      id: "default-constant-load",
      title: "Default Load",
      trafficPattern: { type: "constant", rate: requestRate },
      durationMs: scenarioOptions.durationMs,
    },
    options: { seed: scenarioOptions.seed ?? DEFAULT_SEED },
  };

  return { ok: true, config, warnings };
}
