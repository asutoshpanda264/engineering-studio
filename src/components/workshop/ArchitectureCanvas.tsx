import { useCallback } from "react";
import type { DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  Panel as FlowPanel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useWorkshopStore } from "@/store/workshopStore";
import { ComponentNode } from "@/components/workshop/nodes/ComponentNode";
import { AnimatedEdge } from "@/components/workshop/edges/AnimatedEdge";
import { ENTITY_DRAG_MIME_TYPE } from "@/components/workshop/ComponentSidebar";
import { StatusLegend } from "@/components/workshop/StatusLegend";
import { SuggestionsPanel } from "@/components/workshop/SuggestionsPanel";
import { CostPanel } from "@/components/workshop/CostPanel";
import { CornerBrackets } from "@/components/workshop/CornerBrackets";
import type { EntityType } from "@/simulation/types";

const nodeTypes = { component: ComponentNode };
const edgeTypes = { animated: AnimatedEdge };
// A static arrowhead so a graph reads as directed at a glance, even before
// any simulation has run — until now the only thing indicating direction
// at all was the animated packet dots, which only exist post-run.
const defaultEdgeOptions = {
  type: "animated",
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--color-border-hover)" },
};

function CanvasInner() {
  const nodes = useWorkshopStore((s) => s.nodes);
  const edges = useWorkshopStore((s) => s.edges);
  const onNodesChange = useWorkshopStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkshopStore((s) => s.onEdgesChange);
  const onConnect = useWorkshopStore((s) => s.onConnect);
  const addNode = useWorkshopStore((s) => s.addNode);
  const setSelectedNode = useWorkshopStore((s) => s.setSelectedNode);
  const { colorMode } = useTheme();

  const { screenToFlowPosition } = useReactFlow();

  // `fitView` used to re-run on every node-*count* change (loading a
  // scenario, revealing the reference solution, adding components one at a
  // time), on the theory that it'd keep new content in view. In practice it
  // re-centered the whole viewport on every single add, which is
  // disorienting mid-build and — combined with the palette panel floating
  // over the canvas's left edge (ComponentSidebar.tsx) — could re-center a
  // freshly-added node directly behind it. `fitView` now only runs once, on
  // mount (the `fitView` prop below); after that the viewport stays put
  // until the user asks for it via Controls' own "fit view" button.
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const entityType = event.dataTransfer.getData(
        ENTITY_DRAG_MIME_TYPE
      ) as EntityType;
      if (!entityType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(entityType, position);
    },
    [addNode, screenToFlowPosition]
  );

  return (
    <div
      className="relative min-h-0 min-w-0 flex-1"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* React Flow's own background layer defaults to transparent (see
          @xyflow/react's style.css), so this radial gradient shows straight
          through the grid pattern rendered on top of it instead of one flat
          `bg` fill. */}
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
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => setSelectedNode(null)}
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode={colorMode}
        connectionRadius={32}
        // ComponentNode now exposes 4 handles per node (top/right/bottom/
        // left) so an edge can take the short way to a node in any
        // direction instead of only ever entering on the left and leaving
        // on the right. "loose" is what makes every one of those handles
        // usable as either end of a drag, regardless of the `type` it was
        // declared with.
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={18}
          size={1}
          lineWidth={0.5}
          color="var(--color-border)"
        />
        {/* A second, coarser dot grid layered on top of the fine line grid
            above — a "major/minor gridline" pairing, same idea a real
            technical drawing or oscilloscope readout uses, instead of one
            uniform pattern at a single scale. */}
        <Background variant={BackgroundVariant.Dots} gap={126} size={2} color="var(--color-border-hover)" />
        <Controls
          className="!border-none !shadow-none [&>button]:!border-border [&>button]:!bg-bg-elevated [&>button]:!text-text-muted [&>button]:hover:!bg-bg-panel"
        />
        <FlowPanel position="top-right">
          <StatusLegend />
        </FlowPanel>
        <FlowPanel position="bottom-right">
          {/* XYFlow's Panel is position:absolute per corner — it won't
              auto-stack two sibling FlowPanels, so both toggles share one
              flex column inside a single FlowPanel instead. */}
          <div className="flex flex-col items-end gap-2">
            <SuggestionsPanel />
            <CostPanel />
          </div>
        </FlowPanel>
      </ReactFlow>

      <CornerBrackets />

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-xs text-center">
            <p className="text-sm font-medium text-text">Start building</p>
            <p className="mt-1 text-xs text-text-subtle">
              Drag a component from the sidebar, or click one to add it to
              the canvas.
            </p>
            {/* LEARNING-PARITY.md: "Below the Simulated Layer" — a
                one-time, non-interactive acknowledgment that Lessons 1–7's
                material (DNS, TCP/TLS handshakes, HTTP) lives below what
                this simulator models, seen once before the first Client
                event exists, not left to assume the tool covers everything. */}
            <p className="mx-auto mt-3 max-w-[15rem] border-t border-border pt-3 text-[11px] text-text-subtle">
              DNS, TCP/TLS, and HTTP happen before any of this — the
              simulation starts once a request reaches your first component.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ArchitectureCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
