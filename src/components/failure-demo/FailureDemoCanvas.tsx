"use client";

import { useCallback, useEffect } from "react";
import type { DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useFailureDemoStore } from "@/store/failureDemoStore";
import { ComponentNode } from "@/components/workshop/nodes/ComponentNode";
import { AnimatedEdge } from "@/components/workshop/edges/AnimatedEdge";
import { ENTITY_DRAG_MIME_TYPE } from "@/components/workshop/ComponentSidebar";
import type { EntityType } from "@/simulation/types";

const nodeTypes = { component: ComponentNode };
const edgeTypes = { animated: AnimatedEdge };
const defaultEdgeOptions = { type: "animated" };

/**
 * The demo's canvas — reuses ComponentNode/AnimatedEdge as-is (they're
 * pure/presentational, driven entirely by props, not the Workshop's
 * store — see their own files) against useFailureDemoStore instead of
 * useWorkshopStore.
 *
 * Narrower than ArchitectureCanvas in one respect (no Component Library
 * sidebar — only ArchitectureRemedyPalette's scoped drag payload, see
 * RemediesPanel.tsx), but otherwise wires the same drop/connect/delete
 * mechanics. They're always wired here — `addNode`/`onConnect` and
 * edge-deletion via `onEdgesChange` all no-op in the store unless an
 * architecture remedy is currently active (see
 * failureDemoStore.ts's `activeArchitectureRemedy`), so a config-only
 * demo behaves exactly as before: fixed graph, drag-to-reposition and
 * click-to-select only.
 */
function CanvasInner() {
  const nodes = useFailureDemoStore((s) => s.nodes);
  const edges = useFailureDemoStore((s) => s.edges);
  const onNodesChange = useFailureDemoStore((s) => s.onNodesChange);
  const onEdgesChange = useFailureDemoStore((s) => s.onEdgesChange);
  const onConnect = useFailureDemoStore((s) => s.onConnect);
  const addNode = useFailureDemoStore((s) => s.addNode);
  const setSelectedNode = useFailureDemoStore((s) => s.setSelectedNode);
  const { theme } = useTheme();

  const { screenToFlowPosition, fitView } = useReactFlow();

  // Same fix as ArchitectureCanvas.tsx: the `fitView` prop below only
  // fits once on mount and never again, so bulk node changes afterward
  // (an architecture remedy adding nodes, etc.) left the viewport stale.
  // Re-fit whenever node count changes; a plain drag doesn't change
  // count, so it's left alone.
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
        colorMode={theme}
        connectionRadius={32}
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
      </ReactFlow>
    </div>
  );
}

export function FailureDemoCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
