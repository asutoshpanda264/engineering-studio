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
import {
  createClassNodeData,
  createField,
  createMethod,
  createRelationshipEdgeData,
} from "@/lld-modeling/types";
import type {
  ClassDiagram,
  ClassField,
  ClassMethod,
  ClassNodeData,
  ClassStereotype,
  RelationshipEdgeData,
} from "@/lld-modeling/types";

export type ClassDiagramNode = Node<ClassNodeData>;
export type RelationshipEdge = Edge<RelationshipEdgeData>;

/**
 * Converts the live canvas state into `linter.ts`'s framework-independent
 * `ClassDiagram` input — the one place XY Flow's `Node`/`Edge` cross over
 * into the pure `src/lld-modeling/` layer, same boundary role
 * `workshopBridge.ts` plays for the Simulator. A dangling edge (an id the
 * `onEdgesChange`/`removeNode` bookkeeping hasn't caught up with) is
 * skipped rather than passed through — the linter shouldn't have to
 * defend against a state XY Flow itself wouldn't render.
 */
export function toClassDiagram(nodes: ClassDiagramNode[], edges: RelationshipEdge[]): ClassDiagram {
  const nodeIds = new Set(nodes.map((n) => n.id));
  return {
    classes: nodes.map((n) => ({ id: n.id, data: n.data })),
    relationships: edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data ?? createRelationshipEdgeData(),
      })),
  };
}

/**
 * Store for the `/lld/editor` class-diagram canvas. Deliberately much
 * smaller than `workshopStore.ts` — there's no simulation, playback, or
 * metrics concept here at all, only a graph being edited. Same XY Flow
 * wiring pattern (`onNodesChange`/`onEdgesChange`/`onConnect` via the
 * library's own change-applier helpers) so the canvas component reads
 * exactly like `ArchitectureCanvas.tsx` does.
 */
interface LldState {
  nodes: ClassDiagramNode[];
  edges: RelationshipEdge[];
  selectedId: string | null;
  selectedKind: "node" | "edge" | null;

  /** The `/lld/editor?challenge=<slug>` case study currently being built, if any — see `challenges.ts`. Only the slug is stored; the full `ClassDiagramChallenge` (prompt, requirements) is looked up on demand, same "id only" convention `workshopStore.ts`'s `activeScenarioId` uses. */
  activeChallengeId: string | null;
  /** Whether the canvas is currently showing the challenge's read-only reference solution instead of the student's own editable diagram — a same-canvas tab swap (`CanvasViewTabs` in `DiagramCanvas.tsx`), not a separate route or modal, so nothing about the student's own `nodes`/`edges` is touched by toggling this. Only meaningful while `activeChallengeId` is set. */
  viewingReference: boolean;

  onNodesChange: (changes: NodeChange<ClassDiagramNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<RelationshipEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  addClass: (stereotype: ClassStereotype, position: XYPosition) => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;

  updateClassMeta: (id: string, patch: Partial<Pick<ClassNodeData, "name" | "stereotype">>) => void;
  addField: (id: string) => void;
  updateField: (id: string, fieldId: string, patch: Partial<Omit<ClassField, "id">>) => void;
  removeField: (id: string, fieldId: string) => void;
  addMethod: (id: string) => void;
  updateMethod: (id: string, methodId: string, patch: Partial<Omit<ClassMethod, "id">>) => void;
  removeMethod: (id: string, methodId: string) => void;

  updateEdgeData: (id: string, patch: Partial<RelationshipEdgeData>) => void;

  setSelected: (id: string | null, kind: "node" | "edge" | null) => void;
  reset: () => void;

  /** Enters a case-study challenge — always starts from a blank canvas, same "opens blank" philosophy `/workshop` follows for scenarios, so a stale unrelated diagram never confuses that challenge's own requirement checklist. */
  startChallenge: (slug: string) => void;
  /** Leaves challenge mode without touching whatever's currently on the canvas — unlike `startChallenge`, exiting isn't a fresh start. */
  exitChallenge: () => void;
  /** Swaps the canvas between the student's own diagram and the challenge's read-only reference solution. No-op on the diagram itself either way. */
  setViewingReference: (viewing: boolean) => void;
}

let nodeIdCounter = 0;

/** Same "sequential, readable ids" reasoning as `workshopStore.ts`'s `generateNodeId`. */
function generateNodeId(): string {
  return `class_${++nodeIdCounter}`;
}

function mapNode(
  nodes: ClassDiagramNode[],
  id: string,
  fn: (data: ClassNodeData) => ClassNodeData
): ClassDiagramNode[] {
  return nodes.map((node) => (node.id === id ? { ...node, data: fn(node.data) } : node));
}

export const useLldStore = create<LldState>((set) => ({
  nodes: [],
  edges: [],
  selectedId: null,
  selectedKind: null,
  activeChallengeId: null,
  viewingReference: false,

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(
        { ...connection, type: "relationship", data: createRelationshipEdgeData() },
        state.edges
      ) as RelationshipEdge[],
    })),

  addClass: (stereotype, position) =>
    set((state) => {
      const id = generateNodeId();
      const node: ClassDiagramNode = {
        id,
        type: "classNode",
        position,
        data: createClassNodeData(stereotype),
      };
      return { nodes: [...state.nodes, node] };
    }),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
    })),

  removeEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
    })),

  updateClassMeta: (id, patch) =>
    set((state) => ({ nodes: mapNode(state.nodes, id, (data) => ({ ...data, ...patch })) })),

  addField: (id) =>
    set((state) => ({
      nodes: mapNode(state.nodes, id, (data) => ({ ...data, fields: [...data.fields, createField()] })),
    })),

  updateField: (id, fieldId, patch) =>
    set((state) => ({
      nodes: mapNode(state.nodes, id, (data) => ({
        ...data,
        fields: data.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
      })),
    })),

  removeField: (id, fieldId) =>
    set((state) => ({
      nodes: mapNode(state.nodes, id, (data) => ({
        ...data,
        fields: data.fields.filter((f) => f.id !== fieldId),
      })),
    })),

  addMethod: (id) =>
    set((state) => ({
      nodes: mapNode(state.nodes, id, (data) => ({
        ...data,
        // An interface's methods are implicitly abstract per UML — default
        // that here, at creation time, rather than baking it into
        // `createMethod` (which doesn't know the parent's stereotype).
        methods: [...data.methods, createMethod({ isAbstract: data.stereotype === "interface" })],
      })),
    })),

  updateMethod: (id, methodId, patch) =>
    set((state) => ({
      nodes: mapNode(state.nodes, id, (data) => ({
        ...data,
        methods: data.methods.map((m) => (m.id === methodId ? { ...m, ...patch } : m)),
      })),
    })),

  removeMethod: (id, methodId) =>
    set((state) => ({
      nodes: mapNode(state.nodes, id, (data) => ({
        ...data,
        methods: data.methods.filter((m) => m.id !== methodId),
      })),
    })),

  updateEdgeData: (id, patch) =>
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...(edge.data ?? createRelationshipEdgeData()), ...patch } }
          : edge
      ),
    })),

  setSelected: (id, kind) => set({ selectedId: id, selectedKind: kind }),

  reset: () => set({ nodes: [], edges: [], selectedId: null, selectedKind: null }),

  startChallenge: (slug) =>
    set({
      activeChallengeId: slug,
      nodes: [],
      edges: [],
      selectedId: null,
      selectedKind: null,
      viewingReference: false,
    }),

  exitChallenge: () => set({ activeChallengeId: null, viewingReference: false }),

  setViewingReference: (viewing) => set({ viewingReference: viewing }),
}));
