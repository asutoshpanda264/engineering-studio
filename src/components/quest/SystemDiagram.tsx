import { ConceptObject } from "./ConceptObject";
import type { ConceptObjectKind, ConceptObjectStatus } from "./ConceptObject";

export interface SystemDiagramNode {
  id: string;
  kind: ConceptObjectKind;
  label?: string;
  status?: ConceptObjectStatus;
  /** Percent coordinates (0–100), same scheme `LessonNode`/`MapPath`
      already use on the world map. */
  x: number;
  y: number;
}

export interface SystemDiagramEdge {
  from: string;
  to: string;
  /** "overloaded" renders thicker and coral — a wire visibly under
      strain, not just the node at its end. */
  status?: "normal" | "overloaded";
}

export interface SystemDiagramProps {
  nodes: SystemDiagramNode[];
  edges: SystemDiagramEdge[];
  /** The diagram lays out in percent coordinates, so it needs an
      explicit pixel height to resolve those against — there's no
      intrinsic content size otherwise. */
  height?: number;
  className?: string;
}

/**
 * A scene built from `ConceptObject`s and simple connecting lines — this
 * is what a lesson actually teaches with (e.g. "four users hitting one
 * server" vs. "a load balancer spreading them across three"). Static
 * for now, per docs-game/CLAUDE.md milestone 6 — animating request flow
 * along an edge is a later pass, not this one.
 */
export function SystemDiagram({ nodes, edges, height = 260, className = "" }: SystemDiagramProps) {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {edges.map((edge, i) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          if (!from || !to) return null;
          const overloaded = edge.status === "overloaded";
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={overloaded ? "var(--quest-coral)" : "var(--quest-ink-on-dark-muted)"}
              strokeWidth={overloaded ? 1.8 : 1.2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {nodes.map((node) => (
        <div
          key={node.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
        >
          <ConceptObject kind={node.kind} label={node.label} status={node.status} />
        </div>
      ))}
    </div>
  );
}
