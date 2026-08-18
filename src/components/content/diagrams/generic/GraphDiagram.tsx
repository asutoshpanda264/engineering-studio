import { useId } from "react";
import { ArrowMarker, svgResponsiveProps } from "../primitives";
import type { GraphDiagramEdge, GraphDiagramNode } from "@/content/shared/lesson";

/**
 * A real node-and-edge graph — round nodes at hand-placed x/y positions
 * (not `architecture`'s col/row grid, which would misrepresent a graph's
 * organic relationships as a linear pipeline), connected by labeled
 * directed edges. Built for `10-nosql-deep-dive.ts`'s graph-database
 * section, which previously explained "nodes, edges, properties" purely
 * via SQL-vs-Cypher code blocks and text notation like
 * `(Priya:User) —FRIENDS_WITH→ (Rahul:User)` — the one lesson on the site
 * that talks about a graph without ever drawing one.
 */

const NODE_R = 34;
const MARGIN = 16;

// Node positions come from two different sources: small hand-placed lesson
// coordinates (10-nosql-deep-dive.ts's graph figure), or a scenario's
// `optimalSolution` positions carried over 1:1 from its own free-form
// workshop-canvas layout (problems/[id]/solution/page.tsx) — which can span
// far wider than this component's article-width home. Translate to the
// origin and, only ever shrinking, scale to fit a bounded working space so
// a wide scenario layout doesn't blow past `svgResponsiveProps`'s "never
// shrink below native size" floor and overflow its container.
const MAX_CONTENT_W = 540;
const MAX_CONTENT_H = 160;

function boundaryPoint(cx: number, cy: number, tx: number, ty: number, r: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / len) * r, y: cy + (dy / len) * r };
}

export function GraphDiagram({ nodes, edges }: { nodes: GraphDiagramNode[]; edges: GraphDiagramEdge[] }) {
  const arrowId = `graph-arrow-${useId()}`;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minRawX = Math.min(...xs);
  const minRawY = Math.min(...ys);
  const spanX = Math.max(...xs) - minRawX;
  const spanY = Math.max(...ys) - minRawY;
  const scale = Math.min(1, spanX > 0 ? MAX_CONTENT_W / spanX : 1, spanY > 0 ? MAX_CONTENT_H / spanY : 1);
  const byId = new Map(
    nodes.map((n) => [n.id, { ...n, x: (n.x - minRawX) * scale, y: (n.y - minRawY) * scale }])
  );
  const positioned = [...byId.values()];
  const minX = Math.min(...positioned.map((n) => n.x)) - NODE_R - MARGIN;
  const minY = Math.min(...positioned.map((n) => n.y)) - NODE_R - MARGIN;
  const width = Math.max(...positioned.map((n) => n.x)) + NODE_R + MARGIN - minX;
  const height = Math.max(...positioned.map((n) => n.y)) + NODE_R + MARGIN - minY;

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      {...svgResponsiveProps(width, height)}
      className="text-text-muted"
      role="img"
      aria-label={
        edges.some((e) => e.label)
          ? `Graph: ${nodes.map((n) => n.label).join(", ")}, connected by ${edges
              .map((e) => e.label)
              .filter(Boolean)
              .join(", ")}.`
          : `Graph: ${nodes.map((n) => n.label).join(", ")}, connected by arrows.`
      }
    >
      <ArrowMarker id={arrowId} />
      {edges.map((edge, i) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return null;
        const p1 = boundaryPoint(from.x, from.y, to.x, to.y, NODE_R);
        const p2 = boundaryPoint(to.x, to.y, from.x, from.y, NODE_R);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const lines = (edge.propertyLabel ? [edge.label, edge.propertyLabel] : [edge.label]).filter(
          (l) => l.length > 0
        );
        return (
          <g key={i}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} strokeWidth={1} className="stroke-border-hover" markerEnd={`url(#${arrowId})`} />
            {lines.length > 0 && (
              <>
                <rect
                  x={midX - (Math.max(...lines.map((l) => l.length)) * 2.7 + 4)}
                  y={midY - 9 - (lines.length - 1) * 9}
                  width={Math.max(...lines.map((l) => l.length)) * 5.4 + 8}
                  height={12 + (lines.length - 1) * 9}
                  rx={2}
                  className="fill-bg-elevated"
                />
                {lines.map((line, li) => (
                  <text
                    key={li}
                    x={midX}
                    y={midY - (lines.length - 1 - li) * 9}
                    textAnchor="middle"
                    className="fill-text-subtle text-[9px]"
                  >
                    {line}
                  </text>
                ))}
              </>
            )}
          </g>
        );
      })}
      {positioned.map((node) => {
        const toneClass =
          node.tone === "signal"
            ? "fill-bg-elevated stroke-signal"
            : node.tone === "healthy"
              ? "fill-bg-elevated stroke-status-healthy"
              : node.tone === "critical"
                ? "fill-bg-elevated stroke-status-critical"
                : "fill-bg-elevated stroke-border";
        return (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={NODE_R} strokeWidth={1} className={toneClass} />
            <text x={node.x} y={node.typeLabel ? node.y - 2 : node.y + 4} textAnchor="middle" className="fill-text text-[11px] font-medium">
              {node.label}
            </text>
            {node.typeLabel && (
              <text x={node.x} y={node.y + 12} textAnchor="middle" className="fill-text-subtle text-[9px]">
                {node.typeLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
