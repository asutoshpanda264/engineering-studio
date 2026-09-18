import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import type { ClientGraph } from "@/lib/api/types";

/**
 * The exact inverse of `workshopStore.ts`'s internal `entitiesToCanvas` —
 * turns live canvas state back into the `{nodes, connections}` shape
 * `engineering-studio-backend/verify/src/graphAdapter.ts`'s `ClientGraph`
 * expects, field-for-field. Kept as its own small module (not inlined
 * into workshopStore.ts) since it's purely a shape conversion with zero
 * store/React dependency — same "one small pure function, not folded
 * into the store" shape `workshopBridge.ts` already establishes for
 * canvas → SimulationConfig.
 */
export function canvasToClientGraph(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): ClientGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.entityType,
      position: node.position,
      config: node.data.config,
    })),
    connections: edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    })),
  };
}
