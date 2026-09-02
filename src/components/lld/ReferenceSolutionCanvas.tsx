"use client";

import { useMemo } from "react";
import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ClassNode } from "@/components/lld/nodes/ClassNode";
import { RelationshipEdge } from "@/components/lld/edges/RelationshipEdge";
import { getReferenceDiagram, getReferenceSolution } from "@/lld-modeling/referenceSolutions";
import type { ClassDiagramNode, RelationshipEdge as RelationshipEdgeModel } from "@/store/lldStore";

const nodeTypes = { classNode: ClassNode };
const edgeTypes = { relationship: RelationshipEdge };

/**
 * `LayoutedClassDiagram` (id + data + position per class, framework-
 * independent) -> the `Node`/`Edge` shape `ReactFlow` itself renders. Same
 * boundary-crossing role `toClassDiagram`/`referenceSolutions.ts` split
 * plays in reverse, kept here rather than in `lldStore.ts` since this
 * diagram never touches the store — it's a static, read-only preview, not
 * canvas state.
 */
function toFlow(slug: string): { nodes: ClassDiagramNode[]; edges: RelationshipEdgeModel[] } {
  const diagram = getReferenceDiagram(slug);
  if (!diagram) return { nodes: [], edges: [] };

  const nodes: ClassDiagramNode[] = diagram.classes.map((c) => ({
    id: c.id,
    type: "classNode",
    position: c.position,
    data: c.data,
    draggable: false,
    selectable: false,
  }));

  const edges: RelationshipEdgeModel[] = diagram.relationships.map((r) => ({
    id: r.id,
    source: r.source,
    target: r.target,
    type: "relationship",
    data: r.data,
    selectable: false,
  }));

  return { nodes, edges };
}

/**
 * Read-only preview of a case-study's reference solution — the "Reference
 * solution" tab in `DiagramCanvas.tsx`'s `CanvasViewTabs` swaps to this in
 * place of the editable canvas, replacing the old `ReferenceSolutionModal`
 * popup so looking at the reference no longer dims out (and hides) the
 * student's own in-progress diagram. Its own isolated `ReactFlowProvider`/
 * canvas, not the live `/lld/editor` one: nothing here can be dragged onto,
 * or overwrite, whatever the student has actually built, same caution
 * `CompareModal.tsx` states outright for the Workshop's own "reference fix"
 * comparisons.
 */
export function ReferenceSolutionCanvas({ slug }: { slug: string }) {
  const { colorMode } = useTheme();
  const solution = getReferenceSolution(slug);
  const { nodes, edges } = useMemo(() => toFlow(slug), [slug]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {solution && (
        <div className="shrink-0 border-b border-border bg-bg-panel px-4 py-2.5">
          <p className="text-xs leading-relaxed text-text-muted">{solution.note}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-text-subtle">
            One valid design, not the only one — a diagram that models the requirements differently is
            just as correct. Read-only: nothing here can be edited or dragged onto your own diagram.
          </p>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {nodes.length > 0 ? (
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              colorMode={colorMode}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnScroll
              zoomOnScroll
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--color-border)" />
            </ReactFlow>
          </ReactFlowProvider>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-subtle">No reference solution for this challenge yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
