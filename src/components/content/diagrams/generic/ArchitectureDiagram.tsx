import { useId } from "react";
import { ArrowMarker, DiagramArrow, DiagramBox } from "../primitives";
import type { ArchEdge, ArchNode } from "@/content/shared/lesson";

/**
 * Generic freeform box-and-arrow topology — the workhorse for anything
 * `flow`/`tree`/`sequence` don't fit (fan-out, fan-in, converging edges,
 * static topology). Content authors place nodes by hand on a `col`/`row`
 * grid, same as the ascii diagrams they replace were already
 * hand-positioned.
 *
 * `ArchitectureLayer` is split out so `CompareDiagram` can host several of
 * these side by side under one shared `<svg>`/marker, instead of nesting
 * `<svg>` elements.
 */

export const ARCH_COL_WIDTH = 190;
export const ARCH_ROW_HEIGHT = 100;
export const ARCH_BOX_W = 150;
export const ARCH_BOX_H = 48;

/** Where a straight line from `(cx,cy)` toward `(tx,ty)` crosses the boundary of a `halfW`×`halfH` box centered at `(cx,cy)` — keeps arrowheads visible at the box edge instead of buried under it. */
function boundaryPoint(cx: number, cy: number, tx: number, ty: number, halfW: number, halfH: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scale = Math.min(dx !== 0 ? halfW / Math.abs(dx) : Infinity, dy !== 0 ? halfH / Math.abs(dy) : Infinity);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export function archNodeExtent(nodes: ArchNode[]) {
  const maxCol = Math.max(...nodes.map((n) => n.col));
  const maxRow = Math.max(...nodes.map((n) => n.row));
  return { width: (maxCol + 1) * ARCH_COL_WIDTH, height: (maxRow + 1) * ARCH_ROW_HEIGHT };
}

export function ArchitectureLayer({
  nodes,
  edges,
  arrowId,
  originX = 0,
  originY = 0,
}: {
  nodes: ArchNode[];
  edges: ArchEdge[];
  arrowId: string;
  originX?: number;
  originY?: number;
}) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const centerOf = (node: ArchNode) => ({
    x: originX + node.col * ARCH_COL_WIDTH + ARCH_BOX_W / 2,
    y: originY + node.row * ARCH_ROW_HEIGHT + ARCH_BOX_H / 2,
  });

  return (
    <>
      {edges.map((edge, i) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return null;
        const a = centerOf(from);
        const b = centerOf(to);
        const p1 = boundaryPoint(a.x, a.y, b.x, b.y, ARCH_BOX_W / 2, ARCH_BOX_H / 2);
        const p2 = boundaryPoint(b.x, b.y, a.x, a.y, ARCH_BOX_W / 2, ARCH_BOX_H / 2);
        return (
          <DiagramArrow key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} markerId={arrowId} label={edge.label} dashed={edge.dashed} tone={edge.tone} />
        );
      })}
      {nodes.map((node) => (
        <DiagramBox
          key={node.id}
          x={originX + node.col * ARCH_COL_WIDTH}
          y={originY + node.row * ARCH_ROW_HEIGHT}
          width={ARCH_BOX_W}
          height={ARCH_BOX_H}
          lines={node.sublabel ? [node.label, node.sublabel] : [node.label]}
          tone={node.tone}
          dashed={node.dashed}
        />
      ))}
    </>
  );
}

export function ArchitectureDiagram({ nodes, edges }: { nodes: ArchNode[]; edges: ArchEdge[] }) {
  const arrowId = `arch-arrow-${useId()}`;
  const { width, height } = archNodeExtent(nodes);
  const pad = 16;

  return (
    <svg
      viewBox={`0 0 ${width + pad * 2} ${height + pad * 2}`}
      className="h-auto w-full text-text-muted"
      role="img"
      aria-label={`Architecture diagram: ${nodes.map((n) => n.label).join(", ")}.`}
    >
      <ArrowMarker id={arrowId} />
      <ArchitectureLayer nodes={nodes} edges={edges} arrowId={arrowId} originX={pad} originY={pad} />
    </svg>
  );
}
