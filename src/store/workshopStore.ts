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
import type { SimulationEvent } from "@/simulation/events/types";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import type { ComponentPackId } from "@/lib/entityCatalog";
import { baselineRequestRate, buildSimulationConfig } from "@/lib/workshopBridge";
import { getVillainAttack, type VillainAttackId } from "@/content/workshop/villainAttacks";
import { runSimulation as runSimulationEngine } from "@/simulation/engine/Simulator";
import { removeEntityAndReroute } from "@/simulation/engine/compareArchitectures";
import { computeReliabilityScore } from "@/simulation/engine/reliabilityScore";
import type { ReliabilityScoreResult } from "@/simulation/engine/reliabilityScore";
import { computeEdgePacketSamples } from "@/lib/packetSampling";
import { deriveNodeStatus } from "@/lib/nodeStatus";
import { isGivenNode, lockedFieldsForNode } from "@/lib/scenarioLocking";
import { PlaybackController } from "@/simulation/playback/PlaybackController";
import type { PlaybackState } from "@/simulation/playback/PlaybackController";
import { getScenario } from "@/scenarios";
import type { Scenario } from "@/scenarios";
import { recordAttempted } from "@/lib/problemProgress";
import { DEFAULT_CONNECTION_LATENCY_MS } from "@/lib/simulationDefaults";
import { getCurrentUser, refreshUser } from "@/lib/auth/authStore";
import { startAttempt, submitAttempt } from "@/lib/api/attempts";
import { canvasToClientGraph } from "@/lib/workshopSubmission";

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
  // Events up to the current playback time — captured for the Agentic
  // domain's OTel-shaped Trace Panel (docs/Agentic_AI.md §2.4), which
  // needs the actual event log, not just the derived metrics every other
  // panel reads. null under the same conditions playbackMetrics is.
  playbackVisibleEvents: SimulationEvent[] | null;

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

  // True only right after loadOptimalSolution — an informational badge, see
  // that action's own doc for why it isn't precisely tracked past that.
  viewingOptimalSolution: boolean;

  // Timed Challenge mode — the wall-clock timestamp (Date.now()) the
  // current attempt started, or null when not in timed mode. Cleared by
  // reset()/loadScenario() (any fresh scenario load exits timed mode by
  // default — see loadScenario's own comment for the Restart-button
  // exception that re-enters it).
  timedModeStartedAt: number | null;

  // Frontend Integration, Increment 2: engineering-studio-backend's own
  // `Attempt` id for the CURRENT Timed Challenge, once (if) `startTimedChallenge()`'s
  // best-effort `POST /attempts` call resolves — null when signed out, not
  // yet resolved, or the current attempt has already been submitted (so a
  // second passing run in the same challenge doesn't try to re-submit a
  // terminal attempt). Cleared everywhere `timedModeStartedAt` is.
  backendAttemptId: string | null;
  // "idle": no backend attempt for this challenge yet, OR a submit
  // attempt failed and can be retried on the next passing run (a failure
  // here is logged, never surfaced as a distinct UI error state — see
  // submitBackendAttempt). "submitting"/"submitted" only ever apply to
  // the ONE first-passing-run submit per challenge — see
  // `backendAttemptId`'s own doc for why only the first counts.
  backendAttemptStatus: "idle" | "submitting" | "submitted";

  // Frontend Integration, Increment 5: free play's own NO_PRESSURE
  // counterpart to backendAttemptId/backendAttemptStatus above — deliberately
  // separate state, not a shared pair, because the two modes have
  // genuinely different lifecycles. TIMED is bounded (one attempt, one
  // submit, done); free play has no session boundary at all, so
  // "resubmitting a better later attempt" (decisions.md #7) means a
  // successful submit immediately opens a FRESH attempt rather than going
  // terminal — see startFreePlayAttempt/submitBackendAttempt. Only ever
  // set when `timedModeStartedAt` is null; entering Timed Challenge
  // abandons whatever free-play attempt was open (see startTimedChallenge).
  freePlayAttemptId: string | null;
  // "idle": ready to submit on the next genuinely new passing run (an
  // attempt id may or may not be attached yet — the very first
  // `startAttempt` call for this scenario view may still be in flight).
  // "submitting": a submit is in flight; never left set on failure (falls
  // back to "idle" so the SAME open attempt retries on the next pass,
  // same reasoning as backendAttemptStatus).
  freePlayAttemptStatus: "idle" | "submitting";

  // Scenario-level knobs. Traffic rate lives on the Client node's own
  // config instead (ENTITIES.md documents it as Client config) — these
  // two remain global, overridden by loadScenario when a scenario is
  // active (see workshopBridge.ts).
  scenarioDurationMs: number;
  connectionLatencyMs: number;

  // Whether a scenario's budgetUsd factors into scoring at all — see
  // scoreScenario's `ignoreBudget` option (scenarioScoring.ts). Global,
  // like duration/connectionLatencyMs, not per-scenario: a student
  // exploring without cost pressure wants that for whatever they're
  // building right now, not a property baked into the scenario itself.
  // Defaults on (existing behavior, unchanged unless a student opts out).
  budgetCheckingEnabled: boolean;

  // Which of the Workshop's two on-demand Component Library panels
  // (ComponentSidebar) is open — "distributed", "ai-flow", or neither
  // (null). The two packs are mutually exclusive, same shape as
  // `tracePanelOpen`/`reliabilityPanelOpen` below: opening one panel
  // closes the other rather than letting both stack and push the canvas
  // trigger buttons down the screen. Lives here rather than as local
  // component state so the guided tour (TutorialRunner) can force the
  // right pack open for steps that need the real catalog list visible
  // ("Drag or click X to add it") — see tutorialPlanner.ts's
  // `requiresComponentsPanel`. Starts closed (null): the Workshop opens
  // canvas-first by default (see ComponentSidebar.tsx).
  openComponentPack: ComponentPackId | null;

  /**
   * Whether the Trace Panel (the Agentic domain's OTel-shaped playback
   * view — docs/Agentic_AI.md §2.4) is open. Same "lives in the store, not
   * local component state" reasoning as openComponentPack — a toggle,
   * doesn't touch the canvas or a run itself.
   */
  tracePanelOpen: boolean;

  /**
   * `docs/Agentic_AI.md` §2.5's pass^k reliability score — the same
   * "re-run and compare" shape as `cdnComparisons`, but across seeds
   * instead of a spliced entity. null until the first check runs (or
   * after a `reset()`); recomputed fresh on demand, never auto-run on
   * every `runSimulation()` since it's meaningfully more expensive (N
   * full simulation runs, not one).
   */
  reliabilityScoreResult: ReliabilityScoreResult | null;
  isComputingReliability: boolean;
  reliabilityScoreError: string | null;
  reliabilityPanelOpen: boolean;

  /**
   * "Batman Mode" (`night-ops`) villain attack loaded onto the next run,
   * if any — see content/workshop/villainAttacks.ts. Overrides whatever
   * traffic pattern the active scenario (or freeform Client rate) would
   * otherwise produce, scaled off it rather than replacing it with an
   * unrelated number (see workshopBridge.baselineRequestRate). Purely a
   * run-time toggle: doesn't touch the canvas itself, only what
   * `runSimulation` feeds the engine next.
   */
  activeVillainAttackId: VillainAttackId | null;

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
  /**
   * Replaces the canvas with the active scenario's `optimalSolution`
   * (types.ts) — the revealable reference build. No-op if no scenario is
   * active or it has none. Informational only: `viewingOptimalSolution`
   * isn't re-cleared on every subsequent edit (that would need hooking
   * every node/edge-mutating action), only on the next loadScenario/reset
   * — a stale badge after a small tweak is a minor cosmetic gap, not a
   * scoring one, since scoring always reads the live canvas either way.
   */
  loadOptimalSolution: () => void;

  /**
   * Starts (or restarts) a Timed Challenge countdown for the currently
   * active scenario. No-op if no scenario is active. Frontend Integration,
   * Increment 2: also fires a best-effort `POST /attempts` (TIMED mode) if
   * a user is signed in — never blocks or delays the local countdown
   * starting, and a failure here just means this challenge stays
   * local-only (exactly the guest experience), not a broken timer.
   */
  startTimedChallenge: () => void;
  /** Exits Timed Challenge mode without touching the canvas/scenario. Also drops any backendAttemptId — see startTimedChallenge. */
  clearTimedChallenge: () => void;
  /**
   * Frontend Integration, Increment 5: best-effort `POST /attempts`
   * (NO_PRESSURE mode) for the given scenario, if a user is signed in —
   * mirrors `startTimedChallenge`'s fire-and-forget shape, but guarded by
   * `activeScenarioId` (and that Timed Challenge hasn't since started)
   * rather than a timestamp, since free play has no "session start"
   * moment of its own to key a staleness check off. Called from
   * `loadScenario` (a fresh scenario view starts tracking immediately —
   * decisions.md #7's "start on load") and again from
   * `submitBackendAttempt` after each successful free-play submit (a
   * NO_PRESSURE attempt is just as one-shot on the backend as TIMED, so a
   * later, better run needs a genuinely new attempt id to submit into).
   */
  startFreePlayAttempt: (scenarioId: string) => void;
  /**
   * Submits the CURRENT canvas as the backend attempt's real, server-verified
   * answer — called from `ScenarioCompletionToast.tsx` at the exact moment
   * a genuinely new passing run is detected, the same trigger
   * `recordSolved` (local progress) already uses. Branches on
   * `timedModeStartedAt`: inside a Timed Challenge, submits `backendAttemptId`
   * (unchanged since Increment 2 — no-op if there's no active one, or it's
   * already submitted once this challenge); otherwise (free play) submits
   * `freePlayAttemptId` and, on success, immediately opens a fresh one via
   * `startFreePlayAttempt` so a later improved run can submit again. Fire-and-forget
   * from the caller's perspective either way — never throws, never blocks
   * the local toast/celebration.
   */
  submitBackendAttempt: () => void;

  setScenarioDurationMs: (durationMs: number) => void;
  setConnectionLatencyMs: (latencyMs: number) => void;
  setBudgetCheckingEnabled: (enabled: boolean) => void;
  setOpenComponentPack: (pack: ComponentPackId | null) => void;
  setTracePanelOpen: (open: boolean) => void;
  setReliabilityPanelOpen: (open: boolean) => void;
  /** Loads (or clears, via `null`) a villain attack for the next `runSimulation()` call. */
  setVillainAttack: (id: VillainAttackId | null) => void;

  runSimulation: () => void;
  /** Re-runs the current architecture across N seeds and scores the pass^k-style reliability result — see `reliabilityScoreResult`'s own doc. */
  runReliabilityScore: () => void;
  /** Clears the last run's result/error and node statuses — leaves the architecture untouched. */
  resetSimulation: () => void;

  play: () => void;
  pause: () => void;
  seek: (timestamp: number) => void;
  setPlaybackSpeed: (multiplier: number) => void;
}

export const DEFAULT_SCENARIO_DURATION_MS = 10_000;
// Re-exported for backward compatibility — the canonical definition (and
// why every scenario/test must be tuned against it) lives in
// simulationDefaults.ts so scoring/test code can import it without
// pulling in this whole store module.
export { DEFAULT_CONNECTION_LATENCY_MS };

let nodeIdCounter = 0;

/**
 * Sequential ids (not crypto.randomUUID) so architecture graphs stay
 * readable in devtools and reproducible in tests/snapshots.
 */
function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

/**
 * The first node of a type keeps the plain catalog name ("API Server");
 * every one after it gets numbered ("API Server 2", "API Server 3", ...).
 * Without this, a Load Balancer fanned out to multiple identical servers
 * — the whole point of load balancing — renders every one of them with
 * the same label, which makes the Inspector's per-target routing
 * distribution (InspectorPanel.tsx, keyed off `node.data.label`) show
 * indistinguishable rows for what's actually the very comparison it
 * exists to surface.
 */
function nextLabelFor(entityType: EntityType, existingNodes: ArchitectureNode[]): string {
  const name = getEntityCatalogItem(entityType).name;
  const existingCount = existingNodes.filter((n) => n.data.entityType === entityType).length;
  return existingCount === 0 ? name : `${name} ${existingCount + 1}`;
}

/**
 * Builds canvas nodes/edges from any ScenarioEntity[]/ConnectionConfig[]
 * pair — a scenario's `startingEntities`/`startingConnections`, or its
 * `optimalSolution`'s, same shape either way. Entity/connection ids are
 * used directly as node/edge ids (fixed strings like "client", not
 * generateNodeId's "node_N" format), so they never collide with
 * manually-added nodes.
 */
function entitiesToCanvas(
  entities: Scenario["startingEntities"],
  connections: Scenario["startingConnections"]
): {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
} {
  const nodes: ArchitectureNode[] = entities.map((entity) => ({
    id: entity.id,
    type: "component",
    position: entity.position,
    data: {
      entityType: entity.type,
      label: entity.label,
      config: entity.config,
    },
  }));

  const edges: ArchitectureEdge[] = connections.map((connection) => ({
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
  unsubscribePlayback = controller.subscribe((state, metrics, visibleEvents) => {
    set({ playbackState: state, playbackMetrics: metrics, playbackVisibleEvents: visibleEvents });
  });
}

function detachPlayback(controller: PlaybackController | null): void {
  unsubscribePlayback?.();
  unsubscribePlayback = null;
  controller?.dispose();
}

/**
 * Builds the SimulationConfig the current canvas + scenario/villain-attack
 * state would produce — the exact logic `runSimulation()` already used
 * inline, factored out so `runReliabilityScore()` can build the identical
 * config to re-run across seeds without duplicating the villain-attack
 * traffic-pattern-override reasoning.
 */
function buildCurrentSimulationConfig(
  state: Pick<
    WorkshopState,
    | "nodes"
    | "edges"
    | "scenarioDurationMs"
    | "connectionLatencyMs"
    | "activeScenarioId"
    | "activeVillainAttackId"
  >
): ReturnType<typeof buildSimulationConfig> {
  const { nodes, edges, scenarioDurationMs, connectionLatencyMs, activeScenarioId, activeVillainAttackId } =
    state;
  const activeScenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;
  // A loaded villain attack overrides the scenario's (or freeform
  // Client's) traffic pattern outright, scaled off it rather than
  // replaced with an unrelated number — see baselineRequestRate.
  const trafficPattern = activeVillainAttackId
    ? getVillainAttack(activeVillainAttackId).buildPattern(
        baselineRequestRate(
          activeScenario?.trafficPattern,
          nodes.find((n) => n.data.entityType === "client")?.data.config.requestRate
        ),
        scenarioDurationMs
      )
    : activeScenario?.trafficPattern;
  return buildSimulationConfig(nodes, edges, {
    durationMs: scenarioDurationMs,
    connectionLatencyMs,
    seed: activeScenario?.seed,
    trafficPattern,
  });
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
  playbackVisibleEvents: null,
  cdnComparisons: null,
  reliabilityScoreResult: null,
  isComputingReliability: false,
  reliabilityScoreError: null,

  activeScenarioId: null,
  viewingOptimalSolution: false,
  timedModeStartedAt: null,
  backendAttemptId: null,
  backendAttemptStatus: "idle",
  freePlayAttemptId: null,
  freePlayAttemptStatus: "idle",
  scenarioDurationMs: DEFAULT_SCENARIO_DURATION_MS,
  connectionLatencyMs: DEFAULT_CONNECTION_LATENCY_MS,
  budgetCheckingEnabled: true,
  openComponentPack: null,
  activeVillainAttackId: null,
  tracePanelOpen: false,
  reliabilityPanelOpen: false,

  onNodesChange: (changes) => {
    // React Flow's own Backspace/Delete handling (deleteKeyCode on
    // <ReactFlow>) calls this directly with a "remove" change — it never
    // goes through removeNode below. A given node (Scenario.givenNodeIds)
    // is the "fact" a scenario's problem is built on; deleting it and
    // dropping in a fresh, unlocked replacement would be a straightforward
    // loophole around lockedFields, so the filter has to sit here, at the
    // one place both the keyboard shortcut and any future delete UI funnel
    // through — same principle as the "Try It" demo canvas, where a given
    // node simply doesn't respond to Delete at all (FailureDemoCanvas.tsx).
    const scenario = get().activeScenarioId ? getScenario(get().activeScenarioId!) : undefined;
    const filtered = changes.filter(
      (change) => !(change.type === "remove" && isGivenNode(scenario, change.id))
    );
    set({ nodes: applyNodeChanges(filtered, get().nodes) });
    // A node deletion (keyboard Delete — see the comment above) changes the
    // architecture, not just its layout; a "position"/"select"/"dimensions"
    // change doesn't. Stale results left on screen after a structural edit
    // read as if they belonged to the architecture currently on the canvas,
    // which they no longer do — see docs/Agentic_AI.md's "To check" list.
    if (changes.some((change) => change.type === "remove") && get().simulationResult) {
      get().resetSimulation();
    }
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    if (changes.some((change) => change.type === "remove") && get().simulationResult) {
      get().resetSimulation();
    }
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
    if (get().simulationResult) get().resetSimulation();
  },

  addNode: (entityType, position) => {
    const node: ArchitectureNode = {
      id: generateNodeId(),
      type: "component",
      position,
      data: {
        entityType,
        label: nextLabelFor(entityType, get().nodes),
        config: {},
      },
    };
    set({ nodes: [...get().nodes, node] });
    if (get().simulationResult) get().resetSimulation();
  },

  removeNode: (id) => {
    // Defense in depth alongside onNodesChange's own filter above — this
    // action isn't currently called from anywhere but a Delete keypress,
    // but a locked node shouldn't become deletable just because a future
    // UI element (a right-click menu, say) calls this directly instead.
    const scenario = get().activeScenarioId ? getScenario(get().activeScenarioId!) : undefined;
    if (isGivenNode(scenario, id)) return;

    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
    if (get().simulationResult) get().resetSimulation();
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id });
  },

  updateNodeConfig: (id, config) => {
    // Drop any key the active scenario locked on this node before merging
    // — the Inspector already renders locked fields as disabled, but that's
    // a UI courtesy, not the enforcement boundary; this is (same principle
    // as onNodesChange's given-node filter above, one level down: whole
    // node vs. individual field).
    const scenario = get().activeScenarioId ? getScenario(get().activeScenarioId!) : undefined;
    const locked = new Set(lockedFieldsForNode(scenario, id));
    const allowedConfig = locked.size
      ? Object.fromEntries(Object.entries(config).filter(([key]) => !locked.has(key)))
      : config;
    if (Object.keys(allowedConfig).length === 0) return;

    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, config: { ...node.data.config, ...allowedConfig } } }
          : node
      ),
    });
  },

  setScenarioDurationMs: (durationMs) => set({ scenarioDurationMs: durationMs }),
  setConnectionLatencyMs: (latencyMs) => set({ connectionLatencyMs: latencyMs }),
  setBudgetCheckingEnabled: (enabled) => set({ budgetCheckingEnabled: enabled }),
  setOpenComponentPack: (pack) => set({ openComponentPack: pack }),
  // Both drawers share the identical fixed bottom-bar position (see
  // TracePanel.tsx/ReliabilityPanel.tsx) — mutually exclusive, same
  // "opening one closes the other" shape a tab strip would give for free,
  // rather than letting them silently render on top of each other.
  setTracePanelOpen: (open) => set({ tracePanelOpen: open, reliabilityPanelOpen: open ? false : get().reliabilityPanelOpen }),
  setReliabilityPanelOpen: (open) => set({ reliabilityPanelOpen: open, tracePanelOpen: open ? false : get().tracePanelOpen }),
  setVillainAttack: (id) => set({ activeVillainAttackId: id }),

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
      playbackVisibleEvents: null,
      cdnComparisons: null,
      reliabilityScoreResult: null,
      isComputingReliability: false,
      reliabilityScoreError: null,
      activeScenarioId: null,
      viewingOptimalSolution: false,
      timedModeStartedAt: null,
      backendAttemptId: null,
      backendAttemptStatus: "idle",
      freePlayAttemptId: null,
      freePlayAttemptStatus: "idle",
      activeVillainAttackId: null,
    });
  },

  loadScenario: (id) => {
    const scenario = getScenario(id);
    if (!scenario) return;

    detachPlayback(get().playbackController);
    const { nodes, edges } = entitiesToCanvas(scenario.startingEntities, scenario.startingConnections);

    set({
      nodes,
      edges,
      selectedNodeId: null,
      simulationResult: null,
      simulationError: null,
      playbackController: null,
      playbackState: null,
      playbackMetrics: null,
      playbackVisibleEvents: null,
      cdnComparisons: null,
      reliabilityScoreResult: null,
      isComputingReliability: false,
      reliabilityScoreError: null,
      activeScenarioId: scenario.id,
      viewingOptimalSolution: false,
      // Any fresh scenario load exits timed mode by default — this is the
      // one place a scenario-switch or a plain Restart both funnel
      // through, and a switch to a *different* scenario must not leave a
      // stale countdown running against the new one. The Restart path
      // specifically (InspectorPanel.tsx's ScenarioBriefing) re-enters it
      // immediately via startTimedChallenge() when the prior attempt was
      // timed, so "Restart" mid-challenge reads as "fresh clock," not
      // "silently exit timed mode."
      timedModeStartedAt: null,
      backendAttemptId: null,
      backendAttemptStatus: "idle",
      freePlayAttemptId: null,
      freePlayAttemptStatus: "idle",
      scenarioDurationMs: scenario.durationMs,
      activeVillainAttackId: null,
    });
    recordAttempted(scenario.id);
    // Frontend Integration, Increment 5: start tracking this scenario view
    // as a free-play attempt right away (decisions.md #7's "start on
    // load") — a no-op for guests. If this load is immediately followed
    // by startTimedChallenge() (the Restart-while-timed path below), that
    // call clears this again; harmless either way since nothing has been
    // submitted yet.
    get().startFreePlayAttempt(scenario.id);
  },

  loadOptimalSolution: () => {
    const { activeScenarioId } = get();
    const scenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;
    if (!scenario?.optimalSolution) return;

    detachPlayback(get().playbackController);
    const { nodes, edges } = entitiesToCanvas(
      scenario.optimalSolution.entities,
      scenario.optimalSolution.connections
    );

    set({
      nodes,
      edges,
      selectedNodeId: null,
      simulationResult: null,
      simulationError: null,
      playbackController: null,
      playbackState: null,
      playbackMetrics: null,
      playbackVisibleEvents: null,
      cdnComparisons: null,
      reliabilityScoreResult: null,
      isComputingReliability: false,
      reliabilityScoreError: null,
      viewingOptimalSolution: true,
    });
  },

  startTimedChallenge: () => {
    const { activeScenarioId } = get();
    if (!activeScenarioId) return;

    const startedAt = Date.now();
    // Entering Timed Challenge abandons whatever free-play (NO_PRESSURE)
    // attempt was open for this scenario view — the two modes are
    // mutually exclusive at any given moment, and submitBackendAttempt
    // branches on timedModeStartedAt alone, so leaving a stale
    // freePlayAttemptId set here would just be dead state, never acted on
    // while timed mode is active.
    set({
      timedModeStartedAt: startedAt,
      backendAttemptId: null,
      backendAttemptStatus: "idle",
      freePlayAttemptId: null,
      freePlayAttemptStatus: "idle",
    });

    const user = getCurrentUser();
    if (!user) return; // guest — exactly today's local-only experience, no backend call at all

    startAttempt(activeScenarioId, "TIMED")
      .then((attempt) => {
        // Guard against a stale response: the student may have exited or
        // restarted the challenge (a fresh `startedAt`) before this
        // resolved. Only attach the id if this is still THAT session.
        if (get().timedModeStartedAt === startedAt) {
          set({ backendAttemptId: attempt.id });
        }
      })
      .catch((error: unknown) => {
        // Best-effort, same as every other failure path here — this
        // challenge just stays local-only, exactly the guest experience,
        // not a broken timer.
        console.error("Failed to start a backend attempt for this Timed Challenge", error);
      });
  },

  clearTimedChallenge: () => {
    set({ timedModeStartedAt: null, backendAttemptId: null, backendAttemptStatus: "idle" });
    // Not currently reachable from any UI (see this action's own history —
    // nothing calls it today), but if it ever is, exiting back to free
    // play should resume free-play tracking rather than leaving the
    // scenario untracked until the next full loadScenario.
    const { activeScenarioId } = get();
    if (activeScenarioId) get().startFreePlayAttempt(activeScenarioId);
  },

  startFreePlayAttempt: (scenarioId) => {
    const user = getCurrentUser();
    if (!user) return; // guest — free play stays exactly local-only, as always

    startAttempt(scenarioId, "NO_PRESSURE")
      .then((attempt) => {
        // Guard against a stale response: the student may have navigated
        // to a different scenario, or entered a Timed Challenge (which
        // clears freePlayAttemptId itself — see startTimedChallenge), by
        // the time this resolves. Only attach the id if this is still
        // that same free-play view.
        if (get().activeScenarioId === scenarioId && get().timedModeStartedAt === null) {
          set({ freePlayAttemptId: attempt.id, freePlayAttemptStatus: "idle" });
        }
      })
      .catch((error: unknown) => {
        // Best-effort, same as startTimedChallenge's failure path — this
        // scenario view just stays local-only, exactly the guest
        // experience, not a broken canvas.
        console.error("Failed to start a backend attempt for free play", error);
      });
  },

  submitBackendAttempt: () => {
    const { timedModeStartedAt, activeScenarioId, nodes, edges } = get();
    const graph = canvasToClientGraph(nodes, edges);

    if (timedModeStartedAt !== null) {
      const { backendAttemptId, backendAttemptStatus } = get();
      if (!backendAttemptId || backendAttemptStatus !== "idle") return;

      set({ backendAttemptStatus: "submitting" });
      submitAttempt(backendAttemptId, graph)
        .then(() => {
          // Terminal on the backend (Attempt.status = SUBMITTED) — clearing
          // the id here is what stops a LATER, even-better passing run in
          // the same challenge from trying to submit again (that would just
          // 409 "already submitted"). A genuinely new attempt only starts
          // by starting a new Timed Challenge.
          set({ backendAttemptStatus: "submitted", backendAttemptId: null });
          void refreshUser(); // best-effort — updates AuthStatus's streak/points badge
        })
        .catch((error: unknown) => {
          // Back to "idle", not a distinct error state — the SAME
          // backendAttemptId is still open (IN_PROGRESS) on the backend, so
          // the next genuinely new passing run in this challenge retries it.
          set({ backendAttemptStatus: "idle" });
          console.error("Failed to submit this Timed Challenge attempt to the backend", error);
        });
      return;
    }

    // Free play (NO_PRESSURE) — Frontend Integration, Increment 5.
    const { freePlayAttemptId, freePlayAttemptStatus } = get();
    if (!freePlayAttemptId || freePlayAttemptStatus !== "idle") return;

    set({ freePlayAttemptStatus: "submitting" });
    submitAttempt(freePlayAttemptId, graph)
      .then(() => {
        // Unlike Timed Challenge, free play has no session boundary to
        // wait for before tracking resumes — a NO_PRESSURE attempt is just
        // as one-shot as TIMED once submitted, so a later, better run
        // needs a genuinely new attempt id. Open one immediately rather
        // than leaving free play untracked until the next scenario load —
        // this IS decisions.md #7's "allow re-submitting a better later
        // attempt."
        set({ freePlayAttemptStatus: "idle", freePlayAttemptId: null });
        void refreshUser(); // best-effort — updates AuthStatus's streak/points badge
        if (activeScenarioId) get().startFreePlayAttempt(activeScenarioId);
      })
      .catch((error: unknown) => {
        // Back to "idle", not a distinct error state — the SAME
        // freePlayAttemptId is still open (IN_PROGRESS or VERIFY_FAILED)
        // on the backend, so the next genuinely new passing run retries it.
        set({ freePlayAttemptStatus: "idle" });
        console.error("Failed to submit this free-play attempt to the backend", error);
      });
  },

  runSimulation: () => {
    set({ isSimulating: true, simulationError: null });

    const state = get();
    const { nodes, edges } = state;
    const built = buildCurrentSimulationConfig(state);
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
    const animatedEdges = edges.map((edge) => {
      const sample = packetSamples[edge.id];
      return {
        ...edge,
        data: { ...edge.data, packets: sample },
      };
    });

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
      playbackVisibleEvents: controller.getVisibleEvents(),
    });

    // Simulation is instant; playback is what the user actually watches
    // (ARCHITECTURE.md §3 — Run Simulation starts playback immediately).
    controller.play();
  },

  runReliabilityScore: () => {
    set({ isComputingReliability: true, reliabilityScoreError: null });

    const built = buildCurrentSimulationConfig(get());
    if (!built.ok) {
      set({ isComputingReliability: false, reliabilityScoreError: built.error });
      return;
    }

    // N full re-runs, not one — still comfortably instant at this app's
    // scale (each run is well under 100ms), so no need to defer this off
    // the main thread the way a much larger simulation might require.
    const result = computeReliabilityScore(built.config);
    set({ isComputingReliability: false, reliabilityScoreResult: result });
  },

  resetSimulation: () => {
    detachPlayback(get().playbackController);
    set({
      simulationResult: null,
      simulationError: null,
      playbackController: null,
      playbackState: null,
      playbackMetrics: null,
      playbackVisibleEvents: null,
      cdnComparisons: null,
      reliabilityScoreResult: null,
      isComputingReliability: false,
      reliabilityScoreError: null,
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
