import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  XYPosition,
} from "@xyflow/react";
import type {
  ArchitectureComparison,
  EntityId,
  EntityType,
  MetricsSnapshot,
  SimulationResult,
} from "@/simulation/types";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { buildSimulationConfig } from "@/lib/workshopBridge";
import { runSimulation as runSimulationEngine } from "@/simulation/engine/Simulator";
import { removeEntityAndReroute } from "@/simulation/engine/compareArchitectures";
import { computeEdgePacketSamples } from "@/lib/packetSampling";
import { PlaybackController } from "@/simulation/playback/PlaybackController";
import type { PlaybackState } from "@/simulation/playback/PlaybackController";
import { getScenario } from "@/scenarios";
import type { Scenario } from "@/scenarios";

/**
 * Visual node state, derived from the last simulation run's metrics —
 * see deriveNodeStatus below. Nodes stay "idle" until a run happens.
 */
export type NodeStatus =
  | "idle"
  | "running"
  | "overloaded"
  | "unavailable"
  | "error"
  | "disabled";

export interface ComponentNodeData extends Record<string, unknown> {
  entityType: EntityType;
  label: string;
  config: Record<string, unknown>;
  status?: NodeStatus;
}

export type ArchitectureNode = Node<ComponentNodeData>;
export type ArchitectureEdge = Edge;

interface WorkshopState {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  selectedNodeId: string | null;

  simulationResult: SimulationResult | null;
  simulationError: string | null;
  isSimulating: boolean;

  // Mirrors of the active PlaybackController's state — kept in the store
  // so components can select them without each subscribing individually.
  // null whenever no simulation has been run yet (see runSimulation).
  playbackController: PlaybackController | null;
  playbackState: PlaybackState | null;
  playbackMetrics: MetricsSnapshot | null;

  // "With vs. without this CDN" — recomputed by re-running the same
  // config with the CDN spliced out (see compareArchitectures.ts), keyed
  // by CDN node id. null for a CDN with no incoming/outgoing connection
  // to compare against, or before any run has happened.
  cdnComparisons: Record<EntityId, ArchitectureComparison> | null;

  // The currently loaded scenario, if any — null means a freeform
  // architecture with no story/constraints. Only the id is stored; the
  // full Scenario (constraints, hints, learning goals) is looked up from
  // src/scenarios/ on demand, so this stays serializable and there's one
  // source of truth for scenario content.
  activeScenarioId: string | null;

  // Scenario-level knobs. Traffic rate lives on the Client node's own
  // config instead (ENTITIES.md documents it as Client config) — these
  // two remain global, overridden by loadScenario when a scenario is
  // active (see workshopBridge.ts).
  scenarioDurationMs: number;
  connectionLatencyMs: number;

  onNodesChange: (changes: NodeChange<ArchitectureNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ArchitectureEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (entityType: EntityType, position: XYPosition) => void;
  removeNode: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void;
  reset: () => void;

  /** Replaces the canvas with a scenario's starting architecture. No-op if the id is unknown. */
  loadScenario: (id: string) => void;

  setScenarioDurationMs: (durationMs: number) => void;
  setConnectionLatencyMs: (latencyMs: number) => void;

  runSimulation: () => void;
  /** Clears the last run's result/error and node statuses — leaves the architecture untouched. */
  resetSimulation: () => void;

  play: () => void;
  pause: () => void;
  seek: (timestamp: number) => void;
  setPlaybackSpeed: (multiplier: number) => void;
}

export const DEFAULT_SCENARIO_DURATION_MS = 10_000;
export const DEFAULT_CONNECTION_LATENCY_MS = 5;

/**
 * A node's visual status reflects the last simulation run. The Client
 * doesn't get its own entity metrics (it does no bounded-capacity work —
 * see MetricsCollector), so its status is derived from the overall
 * success rate instead of a per-entity utilization/error count.
 *
 * "unavailable" (rendered as a pulsing red "Crashed") is distinct from
 * "error" (steady red) — it means the entity is rejecting nearly
 * everything, not just some fraction of traffic. See StatusLegend.tsx.
 */
const CRASH_FAILURE_RATE = 0.9;

function deriveNodeStatus(
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

let nodeIdCounter = 0;

/**
 * Sequential ids (not crypto.randomUUID) so architecture graphs stay
 * readable in devtools and reproducible in tests/snapshots.
 */
function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

/**
 * Builds canvas nodes/edges from a scenario's starting architecture.
 * Scenario entity/connection ids are used directly as node/edge ids
 * (fixed strings like "client", not generateNodeId's "node_N" format),
 * so they never collide with manually-added nodes.
 */
function scenarioToCanvas(scenario: Scenario): {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
} {
  const nodes: ArchitectureNode[] = scenario.startingEntities.map((entity) => ({
    id: entity.id,
    type: "component",
    position: entity.position,
    data: {
      entityType: entity.type,
      label: entity.label,
      config: entity.config,
    },
  }));

  const edges: ArchitectureEdge[] = scenario.startingConnections.map((connection) => ({
    id: `${connection.source}->${connection.target}`,
    source: connection.source,
    target: connection.target,
  }));

  return { nodes, edges };
}

/**
 * Unsubscribes the store from the currently active PlaybackController.
 * Kept outside the store object (like nodeIdCounter) since it's an
 * implementation detail of wiring, not UI state.
 */
let unsubscribePlayback: (() => void) | null = null;

function attachPlayback(
  controller: PlaybackController,
  set: (partial: Partial<WorkshopState>) => void
): void {
  unsubscribePlayback?.();
  unsubscribePlayback = controller.subscribe((state, metrics) => {
    set({ playbackState: state, playbackMetrics: metrics });
  });
}

function detachPlayback(controller: PlaybackController | null): void {
  unsubscribePlayback?.();
  unsubscribePlayback = null;
  controller?.dispose();
}

export const useWorkshopStore = create<WorkshopState>()((set, get) => ({
  // The Workshop opens as an empty playground, not a pre-loaded scenario —
  // this is a sandbox for free-form learning first (docs/philosophy.md:
  // "Users should feel comfortable asking 'What happens if...'"). Scenarios
  // are opt-in, picked from the Scenarios tab in ComponentSidebar.
  nodes: [],
  edges: [],
  selectedNodeId: null,

  simulationResult: null,
  simulationError: null,
  isSimulating: false,

  playbackController: null,
  playbackState: null,
  playbackMetrics: null,
  cdnComparisons: null,

  activeScenarioId: null,
  scenarioDurationMs: DEFAULT_SCENARIO_DURATION_MS,
  connectionLatencyMs: DEFAULT_CONNECTION_LATENCY_MS,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },

  addNode: (entityType, position) => {
    const catalogItem = getEntityCatalogItem(entityType);
    const node: ArchitectureNode = {
      id: generateNodeId(),
      type: "component",
      position,
      data: {
        entityType,
        label: catalogItem.name,
        config: {},
      },
    };
    set({ nodes: [...get().nodes, node] });
  },

  removeNode: (id) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id });
  },

  updateNodeConfig: (id, config) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, config: { ...node.data.config, ...config } } }
          : node
      ),
    });
  },

  setScenarioDurationMs: (durationMs) => set({ scenarioDurationMs: durationMs }),
  setConnectionLatencyMs: (latencyMs) => set({ connectionLatencyMs: latencyMs }),

  reset: () => {
    nodeIdCounter = 0;
    detachPlayback(get().playbackController);
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      simulationResult: null,
      simulationError: null,
      playbackController: null,
      playbackState: null,
      playbackMetrics: null,
      cdnComparisons: null,
      activeScenarioId: null,
    });
  },

  loadScenario: (id) => {
    const scenario = getScenario(id);
    if (!scenario) return;

    detachPlayback(get().playbackController);
    const { nodes, edges } = scenarioToCanvas(scenario);

    set({
      nodes,
      edges,
      selectedNodeId: null,
      simulationResult: null,
      simulationError: null,
      playbackController: null,
      playbackState: null,
      playbackMetrics: null,
      cdnComparisons: null,
      activeScenarioId: scenario.id,
      scenarioDurationMs: scenario.durationMs,
    });
  },

  runSimulation: () => {
    set({ isSimulating: true, simulationError: null });

    const { nodes, edges, scenarioDurationMs, connectionLatencyMs, activeScenarioId } =
      get();
    const activeScenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;
    const built = buildSimulationConfig(nodes, edges, {
      durationMs: scenarioDurationMs,
      connectionLatencyMs,
      seed: activeScenario?.seed,
    });
    if (!built.ok) {
      set({ isSimulating: false, simulationError: built.error });
      return;
    }

    const engineResult = runSimulationEngine(built.config);
    // Pre-flight warnings (e.g. an unreachable node — see workshopBridge.ts)
    // surface through the same warnings list the engine's own use, so
    // there's one place the UI reads "things worth knowing about this run."
    const result: SimulationResult =
      built.warnings.length > 0
        ? { ...engineResult, warnings: [...built.warnings, ...engineResult.warnings] }
        : engineResult;
    const statusedNodes = nodes.map((node) => ({
      ...node,
      data: { ...node.data, status: deriveNodeStatus(node, result) },
    }));

    const packetSamples = computeEdgePacketSamples(edges, result);
    const animatedEdges = edges.map((edge) => ({
      ...edge,
      data: { ...edge.data, packets: packetSamples[edge.id] },
    }));

    // For every CDN on the canvas, re-run the identical config with just
    // that CDN spliced out — same seed, same traffic, same everything
    // else — so its Inspector can show a real, measured "here's what you
    // gained" instead of asserting a CDN helps.
    const cdnComparisons: Record<EntityId, ArchitectureComparison> = {};
    for (const node of nodes) {
      if (node.data.entityType !== "cdn") continue;
      const bypassed = removeEntityAndReroute(built.config, node.id);
      if (!bypassed) continue;
      const withoutResult = runSimulationEngine(bypassed);
      cdnComparisons[node.id] = {
        withAverageLatency: result.metrics.averageLatency,
        withoutAverageLatency: withoutResult.metrics.averageLatency,
        withSuccessRate: result.metrics.successRate,
        withoutSuccessRate: withoutResult.metrics.successRate,
      };
    }

    // Replace any playback from a previous run before wiring up the new
    // one — otherwise its rAF loop keeps ticking against a stale result.
    detachPlayback(get().playbackController);
    const controller = new PlaybackController(result);
    attachPlayback(controller, set);

    set({
      isSimulating: false,
      simulationResult: result,
      nodes: statusedNodes,
      edges: animatedEdges,
      cdnComparisons,
      playbackController: controller,
      playbackState: controller.getState(),
      playbackMetrics: controller.getMetrics(),
    });

    // Simulation is instant; playback is what the user actually watches
    // (ARCHITECTURE.md §3 — Run Simulation starts playback immediately).
    controller.play();
  },

  resetSimulation: () => {
    detachPlayback(get().playbackController);
    set({
      simulationResult: null,
      simulationError: null,
      playbackController: null,
      playbackState: null,
      playbackMetrics: null,
      cdnComparisons: null,
      nodes: get().nodes.map((node) => ({
        ...node,
        data: { ...node.data, status: "idle" as const },
      })),
      edges: get().edges.map((edge) => ({
        ...edge,
        data: { ...edge.data, packets: undefined },
      })),
    });
  },

  play: () => get().playbackController?.play(),
  pause: () => get().playbackController?.pause(),
  seek: (timestamp) => get().playbackController?.seek(timestamp),
  setPlaybackSpeed: (multiplier) => get().playbackController?.setSpeed(multiplier),
}));
