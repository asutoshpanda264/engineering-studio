import { create } from "zustand";
import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type { EdgeChange, NodeChange } from "@xyflow/react";
import type { MetricsSnapshot, SimulationResult } from "@/simulation/types";
import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import type { FailureModeDemo } from "@/lib/entityDeepDive";
import { buildDemoSimulationConfig } from "@/lib/failureDemoBridge";
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

  /** Applies one remedy's config override to the live canvas and clears the last run. */
  applyRemedy: (remedyId: string) => void;
  /** Returns the canvas to the demo's original, broken starting config. */
  resetToBaseline: () => void;

  runSimulation: () => void;
  /** Runs the frozen baseline and baseline+remedy configs and stores the diff — doesn't touch the live canvas. */
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
    const filtered = changes.filter((change) => change.type !== "remove");
    set({ edges: applyEdgeChanges(filtered, get().edges) });
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  applyRemedy: (remedyId) => {
    const { demo, nodes, edges } = get();
    if (!demo) return;
    const remedy = demo.remedies.find((r) => r.id === remedyId);
    if (!remedy) return;

    detachPlayback(get().playbackController);

    // Rebuilds every node's config from the demo's pure baseline, then
    // layers on just this one remedy's override — never merges onto
    // whatever's currently live. Otherwise switching directly between two
    // remedies that touch the same node (Coalesced -> Raise TTL, say)
    // would silently stack the first remedy's leftover fields underneath
    // the second, even though only the second shows as "Applied". Node
    // *positions* come from the live canvas, not the baseline — dragging a
    // node for readability isn't part of what a remedy means.
    const baselineConfigById = new Map(demo.startingEntities.map((e) => [e.id, e.config]));
    const updatedNodes = nodes.map((node) => {
      const baseConfig = baselineConfigById.get(node.id) ?? node.data.config;
      const config =
        node.id === remedy.nodeId ? { ...baseConfig, ...remedy.configOverride } : baseConfig;
      return { ...node, data: { ...node.data, config } };
    });

    set({
      activeRemedyId: remedyId,
      ...clearedRunState(updatedNodes, edges),
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

    const config = buildDemoSimulationConfig(nodes, demo);
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
    const { demo } = get();
    if (!demo) return;
    const remedy = demo.remedies.find((r) => r.id === remedyId);
    if (!remedy) return;

    set({ isComparing: true });

    // Always diffs the frozen original demo, not whatever's currently on
    // the live canvas — a comparison should measure this one remedy's
    // effect, not whatever else a student might have since dragged around
    // or tweaked by hand.
    const { nodes: baselineNodes } = demoToCanvas(demo);
    const baselineResult = runSimulationEngine(buildDemoSimulationConfig(baselineNodes, demo));

    const remedyNodes = baselineNodes.map((node) =>
      node.id === remedy.nodeId
        ? { ...node, data: { ...node.data, config: { ...node.data.config, ...remedy.configOverride } } }
        : node
    );
    const remedyResult = runSimulationEngine(buildDemoSimulationConfig(remedyNodes, demo));

    set({
      isComparing: false,
      remedyComparison: {
        remedyId,
        baseline: baselineResult.metrics,
        withRemedy: remedyResult.metrics,
      },
    });
  },

  play: () => get().playbackController?.play(),
  pause: () => get().playbackController?.pause(),
  seek: (timestamp) => get().playbackController?.seek(timestamp),
  setPlaybackSpeed: (multiplier) => get().playbackController?.setSpeed(multiplier),
}));
