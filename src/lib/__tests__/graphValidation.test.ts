import { describe, expect, it } from "vitest";
import { findCycle, findUnreachableNodes } from "../graphValidation";
import type { GraphEdge, GraphNode } from "../graphValidation";

function nodes(...ids: string[]): GraphNode[] {
  return ids.map((id) => ({ id }));
}

function edge(source: string, target: string): GraphEdge {
  return { source, target };
}

describe("findCycle", () => {
  it("returns null for an acyclic chain", () => {
    const result = findCycle(nodes("a", "b", "c"), [edge("a", "b"), edge("b", "c")]);
    expect(result).toBeNull();
  });

  it("returns null for a diamond (shared descendant, not a cycle)", () => {
    // a -> b -> d, a -> c -> d
    const result = findCycle(nodes("a", "b", "c", "d"), [
      edge("a", "b"),
      edge("a", "c"),
      edge("b", "d"),
      edge("c", "d"),
    ]);
    expect(result).toBeNull();
  });

  it("detects a direct cycle between two nodes", () => {
    const result = findCycle(nodes("a", "b"), [edge("a", "b"), edge("b", "a")]);
    expect(result).toEqual(["a", "b", "a"]);
  });

  it("detects a longer cycle not involving every node", () => {
    // a -> b -> c -> b (cycle is b -> c -> b; a is just upstream of it)
    const result = findCycle(nodes("a", "b", "c"), [
      edge("a", "b"),
      edge("b", "c"),
      edge("c", "b"),
    ]);
    expect(result).toEqual(["b", "c", "b"]);
  });

  it("detects a self-loop", () => {
    const result = findCycle(nodes("a"), [edge("a", "a")]);
    expect(result).toEqual(["a", "a"]);
  });

  it("handles a load-balancer-style fan-out with no cycle", () => {
    // a -> b, a -> c (round-robin to two targets, neither loops back)
    const result = findCycle(nodes("a", "b", "c"), [edge("a", "b"), edge("a", "c")]);
    expect(result).toBeNull();
  });
});

describe("findUnreachableNodes", () => {
  it("returns an empty list when every node is reachable", () => {
    const result = findUnreachableNodes(
      nodes("client", "api", "db"),
      [edge("client", "api"), edge("api", "db")],
      "client"
    );
    expect(result).toEqual([]);
  });

  it("finds a node with no incoming path from the client", () => {
    const result = findUnreachableNodes(
      nodes("client", "api", "db", "orphan"),
      [edge("client", "api"), edge("api", "db")],
      "client"
    );
    expect(result).toEqual(["orphan"]);
  });

  it("does not count the client itself as unreachable", () => {
    const result = findUnreachableNodes(nodes("client"), [], "client");
    expect(result).toEqual([]);
  });

  it("follows a load balancer's multiple downstream targets", () => {
    const result = findUnreachableNodes(
      nodes("client", "lb", "api1", "api2"),
      [edge("client", "lb"), edge("lb", "api1"), edge("lb", "api2")],
      "client"
    );
    expect(result).toEqual([]);
  });

  it("reports a node that only has an outgoing edge, never an incoming one", () => {
    // db2 points at api, but nothing points at db2 — still unreachable.
    const result = findUnreachableNodes(
      nodes("client", "api", "db2"),
      [edge("client", "api"), edge("db2", "api")],
      "client"
    );
    expect(result).toEqual(["db2"]);
  });
});
