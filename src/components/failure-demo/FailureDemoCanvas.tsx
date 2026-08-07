"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFailureDemoStore } from "@/store/failureDemoStore";
import { ComponentNode } from "@/components/workshop/nodes/ComponentNode";
import { AnimatedEdge } from "@/components/workshop/edges/AnimatedEdge";

const nodeTypes = { component: ComponentNode };
const edgeTypes = { animated: AnimatedEdge };
const defaultEdgeOptions = { type: "animated" };

/**
 * The demo's canvas — reuses ComponentNode/AnimatedEdge as-is (they're
 * pure/presentational, driven entirely by props, not the Workshop's
 * store — see their own files) against useFailureDemoStore instead of
 * useWorkshopStore.
 *
 * Deliberately narrower than ArchitectureCanvas: no drop target (there's
 * no Component Library sidebar here — the graph is fixed) and no
 * onConnect (this demo's topology isn't something a student rewires; only
 * config changes). Nodes can still be dragged around for readability and
 * clicked to select. A future demo whose remedy is "add a Load Balancer"
 * would need its own drop-enabled variant — not built here since Cache
 * Stampede doesn't need it (see FailureModeDemo's doc comment).
 */
function CanvasInner() {
  const nodes = useFailureDemoStore((s) => s.nodes);
  const edges = useFailureDemoStore((s) => s.edges);
  const onNodesChange = useFailureDemoStore((s) => s.onNodesChange);
  const onEdgesChange = useFailureDemoStore((s) => s.onEdgesChange);
  const setSelectedNode = useFailureDemoStore((s) => s.setSelectedNode);

  return (
    <div className="relative flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => setSelectedNode(null)}
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
