import { describe, expect, it } from "vitest";
import { buildSimulationConfig } from "../workshopBridge";
import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import type { EntityType } from "@/simulation/types";

function node(
  id: string,
  entityType: EntityType,
  label = id,
  config: Record<string, unknown> = {}
): ArchitectureNode {
  return {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: { entityType, label, config },
  };
}

function edge(source: string, target: string): ArchitectureEdge {
  return { id: `${source}->${target}`, source, target };
}

const OPTIONS = { durationMs: 10_000, connectionLatencyMs: 5 };

describe("buildSimulationConfig", () => {
  it("rejects an empty canvas", () => {
    const result = buildSimulationConfig([], [], OPTIONS);
    expect(result.ok).toBe(false);
  });

  it("rejects an architecture with no Client", () => {
    const nodes = [node("api", "api"), node("db", "database")];
    const result = buildSimulationConfig(nodes, [edge("api", "db")], OPTIONS);
    expect(result.ok).toBe(false);
  });

  it("rejects a Client with no outgoing connection", () => {
    const nodes = [node("client", "client"), node("api", "api")];
    const result = buildSimulationConfig(nodes, [], OPTIONS);
    expect(result.ok).toBe(false);
  });

  it("accepts a simple valid chain with no warnings", () => {
    const nodes = [
      node("client", "client"),
      node("api", "api"),
      node("db", "database"),
    ];
    const edges = [edge("client", "api"), edge("api", "db")];
    const result = buildSimulationConfig(nodes, edges, OPTIONS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toEqual([]);
      expect(result.config.entities).toHaveLength(3);
    }
  });

  it("rejects an architecture containing a cycle, naming the components involved", () => {
    const nodes = [
      node("client", "client"),
      node("api", "api", "API Server"),
      node("cache", "cache", "Cache"),
    ];
    // client -> api -> cache -> api (cycle)
    const edges = [
      edge("client", "api"),
      edge("api", "cache"),
      edge("cache", "api"),
    ];
    const result = buildSimulationConfig(nodes, edges, OPTIONS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("cycle");
      expect(result.error).toContain("API Server");
      expect(result.error).toContain("Cache");
    }
  });

  it("does not flag a diamond (shared descendant) as a cycle", () => {
    // client -> lb -> api1 -> db, client -> lb -> api2 -> db
    const nodes = [
      node("client", "client"),
      node("lb", "load_balancer"),
      node("api1", "api"),
      node("api2", "api"),
      node("db", "database"),
    ];
    const edges = [
      edge("client", "lb"),
      edge("lb", "api1"),
      edge("lb", "api2"),
      edge("api1", "db"),
      edge("api2", "db"),
    ];
    const result = buildSimulationConfig(nodes, edges, OPTIONS);
    expect(result.ok).toBe(true);
  });

  it("warns about a component the Client can never reach, but still runs", () => {
    const nodes = [
      node("client", "client"),
      node("api", "api"),
      node("orphanDb", "database", "Orphan Database"),
    ];
    // orphanDb exists but nothing connects the Client's chain to it.
    const edges = [edge("client", "api")];
    const result = buildSimulationConfig(nodes, edges, OPTIONS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Orphan Database");
      expect(result.config.entities).toHaveLength(3);
    }
  });
});
