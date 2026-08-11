/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { hasUnguardedBackendAccess } from "../architectureValidation";
import type { ArchitectureNode } from "@/store/workshopStore";
import type { EntityType } from "@/simulation/types";

function fakeNode(id: string, type: EntityType): ArchitectureNode {
  return {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: { entityType: type, label: id, config: {} },
  } as unknown as ArchitectureNode;
}

describe("hasUnguardedBackendAccess", () => {
  it("is false for Client -> API -> Database, the ordinary shape", () => {
    const nodes = [fakeNode("client", "client"), fakeNode("api", "api"), fakeNode("database", "database")];
    const connections = [
      { source: "client", target: "api" },
      { source: "api", target: "database" },
    ];
    expect(hasUnguardedBackendAccess(nodes, connections)).toBe(false);
  });

  it("is true for Client -> Database directly, skipping the API entirely", () => {
    const nodes = [fakeNode("client", "client"), fakeNode("database", "database")];
    const connections = [{ source: "client", target: "database" }];
    expect(hasUnguardedBackendAccess(nodes, connections)).toBe(true);
  });

  it("is true for Client -> Cache -> Database, still no API in the path", () => {
    const nodes = [fakeNode("client", "client"), fakeNode("cache", "cache"), fakeNode("database", "database")];
    const connections = [
      { source: "client", target: "cache" },
      { source: "cache", target: "database" },
    ];
    expect(hasUnguardedBackendAccess(nodes, connections)).toBe(true);
  });

  it("is false for Client -> API -> Cache -> Database, once an API guards the path", () => {
    const nodes = [
      fakeNode("client", "client"),
      fakeNode("api", "api"),
      fakeNode("cache", "cache"),
      fakeNode("database", "database"),
    ];
    const connections = [
      { source: "client", target: "api" },
      { source: "api", target: "cache" },
      { source: "cache", target: "database" },
    ];
    expect(hasUnguardedBackendAccess(nodes, connections)).toBe(false);
  });

  it("is true for Client -> Load Balancer -> Database — a front-line entity is not itself a barrier", () => {
    const nodes = [
      fakeNode("client", "client"),
      fakeNode("lb", "load_balancer"),
      fakeNode("database", "database"),
    ];
    const connections = [
      { source: "client", target: "lb" },
      { source: "lb", target: "database" },
    ];
    expect(hasUnguardedBackendAccess(nodes, connections)).toBe(true);
  });

  it("is false for Client -> Load Balancer -> API -> Database — front-line entities may legitimately sit ahead of the API", () => {
    const nodes = [
      fakeNode("client", "client"),
      fakeNode("lb", "load_balancer"),
      fakeNode("api", "api"),
      fakeNode("database", "database"),
    ];
    const connections = [
      { source: "client", target: "lb" },
      { source: "lb", target: "api" },
      { source: "api", target: "database" },
    ];
    expect(hasUnguardedBackendAccess(nodes, connections)).toBe(false);
  });

  it("is true when only one of two Client edges bypasses the API", () => {
    const nodes = [
      fakeNode("client", "client"),
      fakeNode("api", "api"),
      fakeNode("database", "database"),
      fakeNode("cache", "cache"),
    ];
    const connections = [
      { source: "client", target: "api" },
      { source: "api", target: "database" },
      { source: "client", target: "cache" }, // the shortcut
    ];
    expect(hasUnguardedBackendAccess(nodes, connections)).toBe(true);
  });

  it("is false for a graph with no Client at all (nothing to guard)", () => {
    const nodes = [fakeNode("api", "api"), fakeNode("database", "database")];
    const connections = [{ source: "api", target: "database" }];
    expect(hasUnguardedBackendAccess(nodes, connections)).toBe(false);
  });

  it("is false for an empty canvas", () => {
    expect(hasUnguardedBackendAccess([], [])).toBe(false);
  });
});
