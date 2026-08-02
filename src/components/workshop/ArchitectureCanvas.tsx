import { useCallback } from "react";
import type { DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel as FlowPanel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkshopStore } from "@/store/workshopStore";
import { ComponentNode } from "@/components/workshop/nodes/ComponentNode";
import { AnimatedEdge } from "@/components/workshop/edges/AnimatedEdge";
import { ENTITY_DRAG_MIME_TYPE } from "@/components/workshop/ComponentSidebar";
import { StatusLegend } from "@/components/workshop/StatusLegend";
import { SuggestionsPanel } from "@/components/workshop/SuggestionsPanel";
import type { EntityType } from "@/simulation/types";

const nodeTypes = { component: ComponentNode };
const edgeTypes = { animated: AnimatedEdge };
const defaultEdgeOptions = { type: "animated" };

function CanvasInner() {
  const nodes = useWorkshopStore((s) => s.nodes);
  const edges = useWorkshopStore((s) => s.edges);
  const onNodesChange = useWorkshopStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkshopStore((s) => s.onEdgesChange);
  const onConnect = useWorkshopStore((s) => s.onConnect);
  const addNode = useWorkshopStore((s) => s.addNode);
  const setSelectedNode = useWorkshopStore((s) => s.setSelectedNode);

  const { screenToFlowPosition } = useReactFlow();

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
      className="relative flex-1"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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
        colorMode="dark"
        fitView
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--color-border-hover)"
          className="!bg-bg"
        />
        <Controls
          className="!border-none !shadow-none [&>button]:!border-border [&>button]:!bg-bg-elevated [&>button]:!text-text-muted [&>button]:hover:!bg-bg-panel"
        />
        <FlowPanel position="top-right">
          <StatusLegend />
        </FlowPanel>
        <FlowPanel position="bottom-right">
          <SuggestionsPanel />
        </FlowPanel>
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-xs text-center">
            <p className="text-sm font-medium text-text">Start building</p>
            <p className="mt-1 text-xs text-text-subtle">
              Drag a component from the sidebar, or click one to add it to
              the canvas.
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
