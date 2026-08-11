import { useId } from "react";
import { ArrowMarker, DiagramBox } from "../primitives";
import type { TreeNode } from "@/content/shared/lesson";

/**
 * Generic hierarchy / decision tree. Recursive layout: a node's subtree
 * width is the sum of its children's subtree widths (a leaf is one fixed
 * unit); a parent centers over its children, depth sets the row. Elbow
 * connectors like the DNS pilot's `DnsHierarchyDiagram`, plus an optional
 * `edgeLabel` near the midpoint for decision-tree YES/NO branches.
 */

const BOX_W = 150;
const BOX_H = 44;
const ROW_HEIGHT = 90;
const UNIT = 170;

interface Positioned {
  node: TreeNode;
  x: number;
  y: number;
}

interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}

function subtreeWidth(node: TreeNode): number {
  if (!node.children?.length) return 1;
  return node.children.reduce((sum, child) => sum + subtreeWidth(child), 0);
}

/** Positions `node` and its descendants, recording every box in `out` and every parent→child connector in `edges`. Returns `node`'s own x so a parent can center over its children. */
function assign(node: TreeNode, depth: number, xOffsetUnits: number, out: Positioned[], edges: Edge[]): number {
  const y = depth * ROW_HEIGHT;

  if (!node.children?.length) {
    const x = (xOffsetUnits + 0.5) * UNIT;
    out.push({ node, x, y });
    return x;
  }

  let offset = xOffsetUnits;
  const childXs: number[] = [];
  for (const child of node.children) {
    childXs.push(assign(child, depth + 1, offset, out, edges));
    offset += subtreeWidth(child);
  }
  const x = (childXs[0] + childXs[childXs.length - 1]) / 2;
  out.push({ node, x, y });
  node.children.forEach((child, i) => {
    edges.push({ x1: x, y1: y + BOX_H, x2: childXs[i], y2: (depth + 1) * ROW_HEIGHT, label: child.edgeLabel });
  });
  return x;
}

/** Down to a shared bus row, across, then down into the child's top edge — same shape as the DNS pilot's elbow connector. */
function elbow(x1: number, y1: number, x2: number, y2: number) {
  const busY = y1 + (y2 - y1) / 2;
  return `M${x1} ${y1} V${busY} H${x2} V${y2}`;
}

export function TreeDiagram({ root }: { root: TreeNode }) {
  const arrowId = `tree-arrow-${useId()}`;
  const positions: Positioned[] = [];
  const edges: Edge[] = [];
  assign(root, 0, 0, positions, edges);

  const width = subtreeWidth(root) * UNIT;
  const height = Math.max(...positions.map((p) => p.y)) + BOX_H + 12;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full text-text-muted" role="img" aria-label={`${root.label} hierarchy diagram.`}>
      <ArrowMarker id={arrowId} />

      {edges.map((edge, i) => (
        <g key={i}>
          <path
            d={elbow(edge.x1, edge.y1, edge.x2, edge.y2)}
            fill="none"
            strokeWidth={1}
            className="stroke-border-hover"
            markerEnd={`url(#${arrowId})`}
          />
          {edge.label && (
            <text
              x={(edge.x1 + edge.x2) / 2}
              y={edge.y1 + (edge.y2 - edge.y1) / 2 - 4}
              textAnchor="middle"
              className="fill-text-subtle text-[9px] font-medium"
            >
              {edge.label}
            </text>
          )}
        </g>
      ))}

      {positions.map((p, i) => (
        <DiagramBox
          key={i}
          x={p.x - BOX_W / 2}
          y={p.y}
          width={BOX_W}
          height={BOX_H}
          lines={p.node.sublabel ? [p.node.label, p.node.sublabel] : [p.node.label]}
          tone={p.node.tone}
        />
      ))}
    </svg>
  );
}
