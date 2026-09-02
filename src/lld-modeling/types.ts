import type { UmlRelationshipKind } from "@/content/shared/lesson";

/**
 * Framework-independent data model for the `/lld/editor` class-diagram
 * canvas — zero React, same role for this domain that
 * `src/simulation/types/index.ts` plays for the discrete-event Workshop:
 * the one shared contract the UI (node/edge components, the Inspector) and,
 * from Phase 2 on, the structural-analysis/linter module both read.
 *
 * Reuses `UmlRelationshipKind` from `src/content/shared/lesson.ts` rather
 * than inventing a parallel enum — that's the exact 6-value vocabulary
 * (association/aggregation/composition/inheritance/realization/dependency)
 * the `/lld` lessons already teach and render with (`UmlDiagram.tsx`), so
 * the editor speaks the same words the reading material does.
 */
export type { UmlRelationshipKind } from "@/content/shared/lesson";

export type Visibility = "public" | "private" | "protected" | "package";

/** Symbol shown before a field/method name — the notation lesson 4 teaches. */
export const VISIBILITY_SYMBOL: Record<Visibility, string> = {
  public: "+",
  private: "-",
  protected: "#",
  package: "~",
};

export interface ClassField {
  id: string;
  name: string;
  type: string;
  visibility: Visibility;
  isStatic?: boolean;
}

export interface ClassMethod {
  id: string;
  name: string;
  /** Raw parameter list as it'd read in the box, e.g. "amount: double" — not modeled as structured params, this is a diagram, not a compiler. */
  params: string;
  returnType: string;
  visibility: Visibility;
  isAbstract?: boolean;
  isStatic?: boolean;
  /**
   * Optional free-text stub for what the method actually does, e.g.
   * "throw new UnsupportedOperationException()" — the diagram has no real
   * method bodies to inspect, so this is the one deliberate signal the
   * Phase 2 linter's LSP rule (`checkLiskovSubstitution` in `linter.ts`)
   * reads to detect an override that breaks substitutability. Optional
   * and otherwise unused — most methods will never set it.
   */
  implementationNote?: string;
}

/**
 * "abstract" here means "an abstract class" (can hold both concrete and
 * abstract members), distinct from "interface" (methods are implicitly
 * abstract, per UML convention rendered with the «interface» stereotype
 * tag and an italicized name).
 */
export type ClassStereotype = "class" | "interface" | "abstract";

export interface ClassNodeData extends Record<string, unknown> {
  name: string;
  stereotype: ClassStereotype;
  fields: ClassField[];
  methods: ClassMethod[];
}

export interface RelationshipEdgeData extends Record<string, unknown> {
  kind: UmlRelationshipKind;
  fromMultiplicity?: string;
  toMultiplicity?: string;
  label?: string;
}

export const RELATIONSHIP_KIND_LABEL: Record<UmlRelationshipKind, string> = {
  association: "Association",
  aggregation: "Aggregation (has-a, independent)",
  composition: "Composition (has-a, dependent)",
  inheritance: "Inheritance (is-a)",
  realization: "Realization (implements)",
  dependency: "Dependency (uses)",
};

let idCounter = 0;

/**
 * Sequential, human-legible ids — same reasoning as `workshopStore.ts`'s
 * `generateNodeId`: readable in devtools, reproducible in tests, no
 * `crypto.randomUUID` noise.
 */
function nextId(prefix: string): string {
  return `${prefix}_${++idCounter}`;
}

export function createField(overrides: Partial<Omit<ClassField, "id">> = {}): ClassField {
  return {
    id: nextId("field"),
    name: "name",
    type: "String",
    visibility: "private",
    ...overrides,
  };
}

export function createMethod(overrides: Partial<Omit<ClassMethod, "id">> = {}): ClassMethod {
  return {
    id: nextId("method"),
    name: "method",
    params: "",
    returnType: "void",
    visibility: "public",
    ...overrides,
  };
}

/**
 * A fresh class/interface's starting shape. An interface's methods default
 * to abstract (no body, per UML) — `addMethod` on the store applies that
 * default per-stereotype rather than baking it in here, since the
 * stereotype can change after creation.
 */
export function createClassNodeData(stereotype: ClassStereotype = "class"): ClassNodeData {
  return {
    name: stereotype === "interface" ? "IUntitled" : "Untitled",
    stereotype,
    fields: [],
    methods: [],
  };
}

export function createRelationshipEdgeData(
  kind: UmlRelationshipKind = "association"
): RelationshipEdgeData {
  return { kind };
}

/**
 * The linter's own input contract — a plain graph shape, deliberately
 * *not* `@xyflow/react`'s `Node`/`Edge` (which `lldStore.ts`'s
 * `ClassDiagramNode`/`RelationshipEdge` are). Same boundary
 * `workshopBridge.ts` draws between the Zustand-facing canvas types and
 * the framework-independent `SimulationConfig` the Simulator actually
 * runs on: `linter.ts` never imports React or XY Flow, so it takes this
 * instead. `lldStore.ts` exposes `toClassDiagram()` to build one from the
 * live canvas state.
 */
export interface DiagramClassRef {
  id: string;
  data: ClassNodeData;
}

export interface DiagramRelationshipRef {
  id: string;
  source: string;
  target: string;
  data: RelationshipEdgeData;
}

export interface ClassDiagram {
  classes: DiagramClassRef[];
  relationships: DiagramRelationshipRef[];
}
