import { create } from "zustand";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type { Connection, EdgeChange, NodeChange, XYPosition } from "@xyflow/react";
import type { EntityType, MetricsSnapshot, SimulationResult } from "@/simulation/types";
import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import type { FailureModeDemo } from "@/lib/entityDeepDive";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { buildDemoSimulationConfig, buildReferenceSimulationConfig } from "@/lib/failureDemoBridge";
import { runSimulation as runSimulationEngine } from "@/simulation/engine/Simulator";
import { computeEdgePacketSamples } from "@/lib/packetSampling";
import { deriveNodeStatus } from "@/lib/nodeStatus";
import { PlaybackController } from "@/simulation/playback/PlaybackController";
import type { PlaybackState } from "@/simulation/playback/PlaybackController";

/**
 * State for the "Try It" failure-demo pages (`/entities/[slug]/try/...`) —
 * a self-contained sibling to workshopStore, not a reuse of it.
 *
 * Deliberately its own store rather than the Workshop's: useWorkshopStore
 * is a single global singleton, so if a demo page mutated it, navigating
 * here from a real in-progress Workshop session (or back to one afterward)
 * would silently clobber whatever the user was building there — the exact
 * failure WorkshopHeader's "Learn" link already opens in a new tab to
 * avoid. A demo page has no Workshop session to protect, so it gets its
 * own isolated state instead.
 */
export interface RemedyComparison {
  remedyId: string;
  baseline: MetricsSnapshot;
  withRemedy: MetricsSnapshot;
}

interface FailureDemoState {
  demo: FailureModeDemo | null;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  selectedNodeId: string | null;
  /** null = the original, broken starting config — no remedy applied. */
  activeRemedyId: string | null;

  simulationResult: SimulationResult | null;
  simulationError: string | null;
  isSimulating: boolean;

  playbackController: PlaybackController | null;
  playbackState: PlaybackState | null;
  playbackMetrics: MetricsSnapshot | null;

  remedyComparison: RemedyComparison | null;
  isComparing: boolean;

  /** Initializes the store for a given demo. Safe to call once on page mount. */
  loadDemo: (demo: FailureModeDemo) => void;

  onNodesChange: (changes: NodeChange<ArchitectureNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ArchitectureEdge>[]) => void;
  setSelectedNode: (id: string | null) => void;

  /**
   * Adds a node to the canvas — a no-op unless the currently active remedy
   * is architecture-kind and `entityType` is one of its
   * `allowedComponentTypes`. Mirrors `workshopStore.addNode` otherwise.
   */
  addNode: (entityType: EntityType, position: XYPosition) => void;
  /** A no-op unless the currently active remedy is architecture-kind. Mirrors `workshopStore.onConnect` otherwise. */
  onConnect: (connection: Connection) => void;

  /**
   * Applies one remedy: for a config remedy, merges its `configOverride`
   * onto the live canvas; for an architecture remedy, there's no config to
   * merge — it resets the canvas to the demo's baseline and enables the
   * scoped drag-and-drop palette (see `addNode`/`onConnect`/
   * `onEdgesChange`) so the student builds the fix themselves. Either way,
   * clears the last run.
   */
  applyRemedy: (remedyId: string) => void;
  /** Returns the canvas to the demo's original, broken starting config. */
  resetToBaseline: () => void;

  runSimulation: () => void;
  /**
   * Diffs the broken baseline against one remedy and stores the result —
   * doesn't touch the live canvas. Requires `simulationResult` to already
   * be set (the student has pressed Run Simulation at least once for the
   * current config) — see the implementation's own comment for why, and
   * for which side(s) of the diff reuse that real result instead of
   * running a second, hidden simulation.
   */
  compareRemedy: (remedyId: string) => void;

  play: () => void;
  pause: () => void;
  seek: (timestamp: number) => void;
  setPlaybackSpeed: (multiplier: number) => void;
}

/** Builds canvas nodes/edges from a demo's fixed starting architecture — same shape workshopStore's scenarioToCanvas produces. */
function demoToCanvas(demo: FailureModeDemo): {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
} {
  const nodes: ArchitectureNode[] = demo.startingEntities.map((entity) => ({
    id: entity.id,
    type: "component",
    position: entity.position,
    data: { entityType: entity.type, label: entity.label, config: entity.config },
  }));

  const edges: ArchitectureEdge[] = demo.startingConnections.map((connection) => ({
    id: `${connection.source}->${connection.target}`,
    source: connection.source,
    target: connection.target,
  }));

  return { nodes, edges };
}

/**
 * Resolves the currently active remedy, but only if it's architecture-kind
 * — the single source of truth `addNode`/`onConnect`/`onEdgesChange` all
 * check to decide whether the scoped palette / edge deletion should be
 * live right now. Returns `undefined` for a config remedy, no active
 * remedy at all, or a missing demo — every one of those cases means "the
 * canvas is fixed," the same as before architecture remedies existed.
 */
function activeArchitectureRemedy(
  demo: FailureModeDemo | null,
  activeRemedyId: string | null
): Extract<FailureModeDemo["remedies"][number], { kind: "architecture" }> | undefined {
  if (!demo || activeRemedyId === null) return undefined;
  const remedy = demo.remedies.find((r) => r.id === activeRemedyId);
  return remedy?.kind === "architecture" ? remedy : undefined;
}

let architectureNodeIdCounter = 0;

/**
 * Ids for nodes a student drags in while building an architecture remedy.
 * `demo_node_`-prefixed so they can never collide with a demo's own
 * authored ids (short, bare words like "client"/"api1"/"lb") — mirrors
 * workshopStore's `generateNodeId`, sequential rather than random for the
 * same devtools/test readability reasons.
 */
function generateArchitectureNodeId(): string {
  return `demo_node_${++architectureNodeIdCounter}`;
}

let unsubscribePlayback: (() => void) | null = null;

function attachPlayback(
  controller: PlaybackController,
  set: (partial: Partial<FailureDemoState>) => void
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

/** Clears everything derived from the last run — shared by applyRemedy/resetToBaseline, since both invalidate the current result the same way. */
function clearedRunState(nodes: ArchitectureNode[], edges: ArchitectureEdge[]) {
  return {
    nodes: nodes.map((node) => ({ ...node, data: { ...node.data, status: undefined } })),
    edges: edges.map((edge) => ({ ...edge, data: { ...edge.data, packets: undefined } })),
    simulationResult: null,
    simulationError: null,
    playbackController: null,
    playbackState: null,
    playbackMetrics: null,
    remedyComparison: null,
  };
}

export const useFailureDemoStore = create<FailureDemoState>()((set, get) => ({
  demo: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  activeRemedyId: null,

  simulationResult: null,
  simulationError: null,
  isSimulating: false,

  playbackController: null,
  playbackState: null,
  playbackMetrics: null,

  remedyComparison: null,
  isComparing: false,

  loadDemo: (demo) => {
    architectureNodeIdCounter = 0;
    detachPlayback(get().playbackController);
    const { nodes, edges } = demoToCanvas(demo);
    set({
      demo,
      nodes,
      edges,
      selectedNodeId: null,
      activeRemedyId: null,
      simulationResult: null,
      simulationError: null,
      isSimulating: false,
      playbackController: null,
      playbackState: null,
      playbackMetrics: null,
      remedyComparison: null,
      isComparing: false,
    });
  },

  onNodesChange: (changes) => {
    // No deletion here — the graph is a fixed, curated demo, not something
    // a student is meant to be able to take nodes out of. Repositioning
    // and selection still go through normally.
    const filtered = changes.filter((change) => change.type !== "remove");
    set({ nodes: applyNodeChanges(filtered, get().nodes) });
  },

  onEdgesChange: (changes) => {
    // Edge deletion is only meaningful while building an architecture
    // remedy (the student needs to remove the old direct connection) —
    // otherwise the graph is fixed, same reasoning as onNodesChange.
    const architectureRemedyActive = Boolean(
      activeArchitectureRemedy(get().demo, get().activeRemedyId)
    );
    const filtered = architectureRemedyActive
      ? changes
      : changes.filter((change) => change.type !== "remove");
    set({ edges: applyEdgeChanges(filtered, get().edges) });
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  addNode: (entityType, position) => {
    const remedy = activeArchitectureRemedy(get().demo, get().activeRemedyId);
    if (!remedy || !remedy.allowedComponentTypes.includes(entityType)) return;

    const node: ArchitectureNode = {
      id: generateArchitectureNodeId(),
      type: "component",
      position,
      data: { entityType, label: getEntityCatalogItem(entityType).name, config: {} },
    };
    set({ nodes: [...get().nodes, node] });
  },

  onConnect: (connection) => {
    if (!activeArchitectureRemedy(get().demo, get().activeRemedyId)) return;
    set({ edges: addEdge(connection, get().edges) });
  },

  applyRemedy: (remedyId) => {
    const { demo } = get();
    if (!demo) return;
    const remedy = demo.remedies.find((r) => r.id === remedyId);
    if (!remedy) return;

    detachPlayback(get().playbackController);

    if (remedy.kind === "architecture") {
      // No config to merge — the student builds this one by hand (drag +
      // connect, see addNode/onConnect above). Always starts from a clean
      // baseline, same "never layer onto whatever's live" rule
      // resetToBaseline already follows, so switching here from a
      // half-built attempt at a different remedy doesn't leave stray
      // nodes/edges behind.
      const { nodes: baselineNodes, edges: baselineEdges } = demoToCanvas(demo);
      set({
        activeRemedyId: remedyId,
        ...clearedRunState(baselineNodes, baselineEdges),
      });
      return;
    }

    // Rebuilds every node's *config* from the demo's pure baseline, then
    // layers on just this one remedy's override — never merges onto
    // whatever's currently live. Otherwise switching directly between two
    // remedies that touch the same node (Coalesced -> Raise TTL, say)
    // would silently stack the first remedy's leftover fields underneath
    // the second, even though only the second shows as "Applied". Edges
    // reset to baseline too, and only the demo's own node ids survive —
    // both matter now that a half-built architecture-remedy attempt could
    // otherwise leave stray dragged-in nodes/edges as orphans behind.
    // *Positions* still come from the live canvas where a node still
    // exists there (dragging a node for readability isn't part of what a
    // remedy means), falling back to the authored default otherwise.
    const { nodes: baselineNodes, edges: baselineEdges } = demoToCanvas(demo);
    const livePositionById = new Map(get().nodes.map((n) => [n.id, n.position]));
    const updatedNodes = baselineNodes.map((node) => ({
      ...node,
      position: livePositionById.get(node.id) ?? node.position,
      data: {
        ...node.data,
        config:
          node.id === remedy.nodeId
            ? { ...node.data.config, ...remedy.configOverride }
            : node.data.config,
      },
    }));

    set({
      activeRemedyId: remedyId,
      ...clearedRunState(updatedNodes, baselineEdges),
    });
  },

  resetToBaseline: () => {
    const { demo } = get();
    if (!demo) return;
    detachPlayback(get().playbackController);
    const { nodes, edges } = demoToCanvas(demo);
    set({
      activeRemedyId: null,
      ...clearedRunState(nodes, edges),
    });
  },

  runSimulation: () => {
    const { demo, nodes, edges } = get();
    if (!demo) return;
    set({ isSimulating: true, simulationError: null });

    const config = buildDemoSimulationConfig(nodes, edges, demo);
    const result = runSimulationEngine(config);

    const statusedNodes = nodes.map((node) => ({
      ...node,
      data: { ...node.data, status: deriveNodeStatus(node, result) },
    }));

    const packetSamples = computeEdgePacketSamples(edges, result);
    const animatedEdges = edges.map((edge) => ({
      ...edge,
      data: { ...edge.data, packets: packetSamples[edge.id] },
    }));

    detachPlayback(get().playbackController);
    const controller = new PlaybackController(result);
    attachPlayback(controller, set);

    set({
      isSimulating: false,
      simulationResult: result,
      nodes: statusedNodes,
      edges: animatedEdges,
      playbackController: controller,
      playbackState: controller.getState(),
      playbackMetrics: controller.getMetrics(),
    });

    controller.play();
  },

  compareRemedy: (remedyId) => {
    const { demo, simulationResult, activeRemedyId } = get();
    if (!demo) return;
    // Gated on a real Run having already happened: Compare shouldn't be
    // the first simulation a student ever sees on this page, and — the
    // other half of this same requirement — whichever side of the diff
    // that Run's result already represents gets reused verbatim below
    // instead of silently recomputing a second, hidden simulation of the
    // same config. Only the side the student hasn't actually run yet gets
    // a fresh one.
    if (!simulationResult) return;
    const remedy = demo.remedies.find((r) => r.id === remedyId);
    if (!remedy) return;

    set({ isComparing: true });

    // The frozen original demo config, not whatever's currently on the
    // live canvas — a comparison should measure this one remedy's effect
    // against the documented starting point, same as `applyRemedy` always
    // rebuilds from this baseline rather than stacking onto live state.
    const { nodes: baselineNodes, edges: baselineEdges } = demoToCanvas(demo);

    const baselineMetrics =
      activeRemedyId === null
        ? simulationResult.metrics
        : runSimulationEngine(buildDemoSimulationConfig(baselineNodes, baselineEdges, demo)).metrics;

    let withRemedyMetrics: MetricsSnapshot;
    if (remedy.kind === "architecture") {
      // Always the hand-authored, tuning-verified reference architecture
      // — never the live canvas, which may be empty, mid-build, or built
      // for a different remedy entirely. See ArchitectureRemedy's doc.
      withRemedyMetrics = runSimulationEngine(
        buildReferenceSimulationConfig(remedy, demo)
      ).metrics;
    } else {
      const remedyNodes = baselineNodes.map((node) =>
        node.id === remedy.nodeId
          ? { ...node, data: { ...node.data, config: { ...node.data.config, ...remedy.configOverride } } }
          : node
      );
      withRemedyMetrics =
        activeRemedyId === remedyId
          ? simulationResult.metrics
          : runSimulationEngine(
              buildDemoSimulationConfig(remedyNodes, baselineEdges, demo)
            ).metrics;
    }

    set({
      isComparing: false,
      remedyComparison: { remedyId, baseline: baselineMetrics, withRemedy: withRemedyMetrics },
    });
  },

  play: () => get().playbackController?.play(),
  pause: () => get().playbackController?.pause(),
  seek: (timestamp) => get().playbackController?.seek(timestamp),
  setPlaybackSpeed: (multiplier) => get().playbackController?.setSpeed(multiplier),
}));
