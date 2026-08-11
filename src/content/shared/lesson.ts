import type { DiagramId } from "@/components/content/diagrams/registry";
import type { BoxTone } from "@/components/content/diagrams/primitives";

/**
 * Lesson content primitives shared by every long-form reading-room module
 * under `src/content/` — `foundations/` (system-design theory) and `lld/`
 * (low-level design) both compose lessons out of the same `LessonBlock`
 * union, `LessonSection`, and `LessonExercise` shapes. Split out here once
 * a second module actually needed them (`lld/`) — one module alone didn't
 * justify a shared file, two does.
 *
 * `LessonBlockRenderer` (`src/components/content/`) renders `LessonBlock`
 * directly, so any module composing lessons from these types gets the same
 * rendered look for free, no per-module renderer needed.
 */

export type LessonBlock =
  | { kind: "paragraph"; text: string }
  /** Monospace ASCII flow/sequence/class diagram — kept for quick tables-of-text
   * (register layouts, tiny inline notations) where a real figure would be
   * overkill. Anything that's actually a hierarchy, a request flow, or a
   * before/after comparison should be a `figure` instead — see `DiagramId`. */
  | { kind: "diagram"; lines: string[] }
  /** A real vector diagram, drawn by a component in `src/components/content/diagrams/`
   * and looked up here by id (see `registry.tsx`) so lesson content stays
   * plain data — no JSX in content files. `caption` renders as a small
   * mono label under the figure, same role as a table's implicit title. */
  | { kind: "figure"; diagram: DiagramId; caption?: string }
  | { kind: "table"; headers: string[]; rows: string[][] }
  /** Code samples, class skeletons — rendered as a plain code block, no syntax highlighting. */
  | { kind: "code"; language?: string; code: string }
  /** A "here's the actual lesson" callout tying a mechanism back to a trade-off or principle. */
  | { kind: "insight"; label?: string; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  /** Interview-perspective Q&A pairs. */
  | { kind: "qa"; question: string; answer: string }
  /** Numbered vertical sequence — "you type X, then Y happens" step-by-step.
   * `animated` plays a request traveling down the rail, pulsing each step
   * as it's reached — reserve it for flows that are literally a single
   * request/response moving through a pipeline (the motion should explain
   * that causality, not just decorate a checklist), and only where the
   * loop makes sense next to prose the reader is meant to actually read. */
  | { kind: "flow"; steps: FlowStep[]; animated?: boolean }
  /** Two/three-party message exchange over time — handshakes, request/response. */
  | { kind: "sequence"; actors: SequenceActor[]; messages: SequenceMessage[] }
  /** Hierarchy or decision tree. */
  | { kind: "tree"; root: TreeNode }
  /** Freeform box-and-arrow topology — fan-out, fan-in, converging edges, static topology. */
  | { kind: "architecture"; nodes: ArchNode[]; edges: ArchEdge[] }
  /** Side-by-side panels — before/after, A-vs-B, a short 2-3 stage journey. */
  | {
      kind: "compare";
      panels: ComparePanel[];
      /** Short text shown in the gap between panel 0 and panel 1 only. */
      transitionLabel?: string[];
    }
  /** LLD only — UML class-relationship notation. */
  | { kind: "uml"; relationships: UmlRelationship[] };

export interface FlowStep {
  title: string;
  detail?: string;
  /** e.g. "critical" on a final crash/failure step. */
  tone?: BoxTone;
}

export interface SequenceActor {
  id: string;
  label: string;
}

export interface SequenceMessage {
  from: string; // actor id
  to: string; // actor id
  label: string;
  /** Conventionally: response/return messages. */
  dashed?: boolean;
  tone?: BoxTone;
}

export interface TreeNode {
  label: string;
  sublabel?: string;
  tone?: BoxTone;
  /** Label on the edge from this node's parent to this node — "YES"/"NO" for decision trees, absent for plain hierarchies. */
  edgeLabel?: string;
  children?: TreeNode[];
}

export interface ArchNode {
  id: string;
  label: string;
  sublabel?: string;
  col: number; // 0-indexed grid column
  row: number; // 0-indexed grid row
  tone?: BoxTone;
  dashed?: boolean;
}

export interface ArchEdge {
  from: string; // ArchNode id
  to: string; // ArchNode id
  label?: string;
  tone?: BoxTone;
  dashed?: boolean;
}

/** A small architecture topology local to one panel of a `compare` block. */
export interface ComparePanel {
  title: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export type UmlRelationshipKind =
  | "association"
  | "aggregation"
  | "composition"
  | "inheritance"
  | "realization"
  | "dependency";

export interface UmlRelationship {
  from: string;
  to: string;
  kind: UmlRelationshipKind;
  fromMultiplicity?: string;
  toMultiplicity?: string;
  /** The verb, e.g. "has", "teaches". */
  label?: string;
}

export interface LessonSection {
  /** Anchor id — used by the table-of-contents rail. */
  id: string;
  heading: string;
  blocks: LessonBlock[];
}

export interface LessonExercise {
  prompt: string;
  /**
   * Optional worked answer, revealed on click rather than shown upfront —
   * same "prediction before observation" instinct as
   * docs/primer-gap.md's capacity-estimate prompts. Same `LessonBlock[]`
   * shape as a section body (not one dense paragraph) so a multi-part
   * answer renders as labeled points/tables/code, not a wall of text.
   */
  guidance?: LessonBlock[];
}
