/**
 * Pure graph checks over the architecture the user has wired up, before
 * it's ever handed to the simulation engine. Deliberately independent of
 * React Flow's node/edge shapes (a minimal { id }/{ source, target } pair
 * is all either check needs) so this stays trivially unit-testable.
 *
 * From: TECHNICAL-SPECIFICATION.md §"Validation" — "No Cycles (where
 * required)" is an error; an unreachable component is closer to that
 * doc's warning example ("Database has no clients") — the simulator can
 * still run, the node just sits idle.
 */

export interface GraphNode {
  id: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

function buildAdjacency(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }
  return adjacency;
}

/**
 * Finds a directed cycle, if one exists, via DFS with a recursion stack
 * (the standard three-color approach — unvisited / in-progress / done).
 * Returns the cyclic path as a list of node ids (last id repeats the
 * first, so callers can render "A → B → A"), or null if the graph is
 * acyclic.
 *
 * Why this matters here specifically: several entities (Client, the
 * request leg of APIServer/Database/Cache, LoadBalancer) forward every
 * request to a downstream neighbor without tracking which nodes a given
 * request has already visited. A wiring cycle would make such a request
 * loop indefinitely — nothing stops it until the Simulator's maxSteps
 * safety net trips, burning the entire event budget on one stuck request
 * instead of producing a useful run.
 */
export function findCycle(
  nodes: GraphNode[],
  edges: GraphEdge[]
): string[] | null {
  const adjacency = buildAdjacency(nodes, edges);

  const UNVISITED = 0;
  const VISITING = 1;
  const VISITED = 2;
  const state = new Map<string, number>(nodes.map((n) => [n.id, UNVISITED]));
  const stack: string[] = [];

  function dfs(nodeId: string): string[] | null {
    state.set(nodeId, VISITING);
    stack.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      const neighborState = state.get(neighbor);
      if (neighborState === VISITING) {
        const cycleStart = stack.indexOf(neighbor);
        return [...stack.slice(cycleStart), neighbor];
      }
      if (neighborState === UNVISITED) {
        const found = dfs(neighbor);
        if (found) return found;
      }
    }

    stack.pop();
    state.set(nodeId, VISITED);
    return null;
  }

  for (const node of nodes) {
    if (state.get(node.id) === UNVISITED) {
      const found = dfs(node.id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Returns the ids of every node with no directed path from `fromId` —
 * plain BFS over forward edges. `fromId` itself is never included.
 */
export function findUnreachableNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  fromId: string
): string[] {
  const adjacency = buildAdjacency(nodes, edges);
  const reached = new Set<string>([fromId]);
  const queue = [fromId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!reached.has(neighbor)) {
        reached.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return nodes.map((n) => n.id).filter((id) => !reached.has(id));
}
