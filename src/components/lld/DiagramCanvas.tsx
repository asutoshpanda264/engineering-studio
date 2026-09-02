import { useCallback, useEffect } from "react";
import type { DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLldStore } from "@/store/lldStore";
import { ClassNode } from "@/components/lld/nodes/ClassNode";
import { RelationshipEdge } from "@/components/lld/edges/RelationshipEdge";
import { LLD_DRAG_MIME_TYPE, PaletteSidebar } from "@/components/lld/PaletteSidebar";
import { LintPanel } from "@/components/lld/LintPanel";
import { CornerBrackets } from "@/components/workshop/CornerBrackets";
import type { ClassStereotype } from "@/lld-modeling/types";

const nodeTypes = { classNode: ClassNode };
const edgeTypes = { relationship: RelationshipEdge };
const defaultEdgeOptions = { type: "relationship" };

/**
 * The `/lld/editor` canvas — same XY Flow shell shape as
 * `ArchitectureCanvas.tsx` (background grid layering, fitView-on-count-
 * change, drag-drop from the palette, click-to-select into the store),
 * minus everything that only makes sense with a running simulation
 * (`StatusLegend`, `SuggestionsPanel`, `CostPanel`).
 */
function CanvasInner() {
  const nodes = useLldStore((s) => s.nodes);
  const edges = useLldStore((s) => s.edges);
  const onNodesChange = useLldStore((s) => s.onNodesChange);
  const onEdgesChange = useLldStore((s) => s.onEdgesChange);
  const onConnect = useLldStore((s) => s.onConnect);
  const addClass = useLldStore((s) => s.addClass);
  const setSelected = useLldStore((s) => s.setSelected);
  const { colorMode } = useTheme();

  const { screenToFlowPosition, fitView } = useReactFlow();

  useEffect(() => {
    if (nodes.length === 0) return;
    fitView({ padding: 0.2, duration: 300 });
  }, [nodes.length, fitView]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const stereotype = event.dataTransfer.getData(LLD_DRAG_MIME_TYPE) as ClassStereotype;
      if (!stereotype) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addClass(stereotype, position);
    },
    [addClass, screenToFlowPosition]
  );

  return (
    <div
      className="relative min-h-0 min-w-0 flex-1"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at 50% 42%, var(--color-bg) 0%, var(--color-bg-panel) 100%)",
        }}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodeClick={(_, node) => setSelected(node.id, "node")}
        onEdgeClick={(_, edge) => setSelected(edge.id, "edge")}
        onPaneClick={() => setSelected(null, null)}
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode={colorMode}
        connectionRadius={32}
        fitView
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={18}
          size={1}
          lineWidth={0.5}
          color="var(--color-border)"
        />
        <Background variant={BackgroundVariant.Dots} gap={126} size={2} color="var(--color-border-hover)" />
      </ReactFlow>

      <PaletteSidebar />
      <LintPanel />
      <CornerBrackets />

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-xs text-center">
            <p className="text-sm font-medium text-text">Start modeling</p>
            <p className="mt-1 text-xs text-text-subtle">
              Drag a Class or Interface from the panel, or click one to add it
              to the canvas. Drag between two boxes&rsquo; edges to connect them.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
