import { describe, expect, it } from "vitest";
import { computeCurrentStep } from "../tutorialPlanner";
import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import type { EntityType } from "@/simulation/types";

function node(id: string, entityType: EntityType, label = ""): ArchitectureNode {
  return {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: { entityType, label, config: {} },
  };
}

function edge(source: string, target: string): ArchitectureEdge {
  return { id: `${source}->${target}`, source, target };
}

const basePlannerInput = {
  selectedNodeId: null,
  simulationHasRun: false,
  acknowledgedIds: new Set<string>(),
};

describe("computeCurrentStep — load balancer fan-out", () => {
  it("asks to add the client, then the load balancer, before ever mentioning a server", () => {
    const emptyStep = computeCurrentStep({
      target: "load_balancer",
      nodes: [],
      edges: [],
      ...basePlannerInput,
    });
    expect(emptyStep.id).toBe("add:client");
  });

  it("does not stop at a single API Server — a load balancer with one target teaches nothing", () => {
    const nodes = [node("n1", "client"), node("n2", "load_balancer"), node("n3", "api")];
    const edges = [edge("n1", "n2"), edge("n2", "n3")];

    const step = computeCurrentStep({
      target: "load_balancer",
      nodes,
      edges,
      ...basePlannerInput,
    });

    expect(step.id).toBe("add-fanout:load_balancer:1");
    expect(step.title).toBe("Add another API Server");
  });

  it("asks to wire up a second server that was added but never connected", () => {
    const nodes = [
      node("n1", "client"),
      node("n2", "load_balancer"),
      node("n3", "api"),
      node("n4", "api"),
    ];
    const edges = [edge("n1", "n2"), edge("n2", "n3")];

    const step = computeCurrentStep({
      target: "load_balancer",
      nodes,
      edges,
      ...basePlannerInput,
    });

    expect(step.id).toBe("connect-fanout:load_balancer->n4");
  });

  it("moves on to selecting the load balancer once both servers are wired up", () => {
    const nodes = [
      node("n1", "client"),
      node("n2", "load_balancer"),
      node("n3", "api"),
      node("n4", "api"),
    ];
    const edges = [edge("n1", "n2"), edge("n2", "n3"), edge("n2", "n4")];

    const step = computeCurrentStep({
      target: "load_balancer",
      nodes,
      edges,
      ...basePlannerInput,
    });

    expect(step.id).toBe("select:load_balancer");
  });

  it("flags a third API Server as an extra to remove, not a third fan-out slot", () => {
    const nodes = [
      node("n1", "client"),
      node("n2", "load_balancer"),
      node("n3", "api"),
      node("n4", "api"),
      node("n5", "api"),
    ];
    const edges = [edge("n1", "n2"), edge("n2", "n3"), edge("n2", "n4"), edge("n2", "n5")];

    const step = computeCurrentStep({
      target: "load_balancer",
      nodes,
      edges,
      ...basePlannerInput,
    });

    expect(step.id).toBe("remove:n5");
  });
});

describe("computeCurrentStep — replica pool fan-out (leader + replica)", () => {
  it("does not stop at a single downstream Database — that's a leader with no replicas", () => {
    const nodes = [node("n1", "client"), node("n2", "api"), node("n3", "replica_pool"), node("n4", "database")];
    const edges = [edge("n1", "n2"), edge("n2", "n3"), edge("n3", "n4")];

    const step = computeCurrentStep({
      target: "replica_pool",
      nodes,
      edges,
      ...basePlannerInput,
    });

    expect(step.id).toBe("add-fanout:replica_pool:1");
    expect(step.title).toBe("Add another Database");
  });

  it("moves on once a leader and a replica are both wired up", () => {
    const nodes = [
      node("n1", "client"),
      node("n2", "api"),
      node("n3", "replica_pool"),
      node("n4", "database"),
      node("n5", "database"),
    ];
    const edges = [edge("n1", "n2"), edge("n2", "n3"), edge("n3", "n4"), edge("n3", "n5")];

    const step = computeCurrentStep({
      target: "replica_pool",
      nodes,
      edges,
      ...basePlannerInput,
    });

    expect(step.id).toBe("select:replica_pool");
  });
});

describe("computeCurrentStep — a single-entity recipe (Client) has nothing to run", () => {
  it("goes straight to complete once its config is read, instead of asking to run", () => {
    const nodes = [node("n1", "client")];
    const step = computeCurrentStep({
      target: "client",
      nodes,
      edges: [],
      selectedNodeId: "n1",
      simulationHasRun: false,
      acknowledgedIds: new Set(["config:client"]),
    });

    expect(step.id).toBe("complete");
    expect(step.body).toContain("nothing downstream yet");
  });

  it("still asks to select and read config first, same as any other entity", () => {
    const nodes = [node("n1", "client")];

    const selectStep = computeCurrentStep({
      target: "client",
      nodes,
      edges: [],
      selectedNodeId: null,
      simulationHasRun: false,
      acknowledgedIds: new Set(),
    });
    expect(selectStep.id).toBe("select:client");

    const configStep = computeCurrentStep({
      target: "client",
      nodes,
      edges: [],
      selectedNodeId: "n1",
      simulationHasRun: false,
      acknowledgedIds: new Set(),
    });
    expect(configStep.id).toBe("config:client");
  });

  it("still completes even if some other tutorial already ran a simulation this session", () => {
    const nodes = [node("n1", "client")];
    const step = computeCurrentStep({
      target: "client",
      nodes,
      edges: [],
      selectedNodeId: "n1",
      simulationHasRun: true,
      acknowledgedIds: new Set(),
    });

    // Never asks about "results" for a target with nothing to run.
    expect(step.id).toBe("complete");
  });

  it("a multi-entity recipe is unaffected — still asks to run and read results", () => {
    const nodes = [node("n1", "client"), node("n2", "api")];
    const edges = [edge("n1", "n2")];

    const runStep = computeCurrentStep({
      target: "api",
      nodes,
      edges,
      selectedNodeId: "n2",
      simulationHasRun: false,
      acknowledgedIds: new Set(["config:api"]),
    });
    expect(runStep.id).toBe("run");

    const resultsStep = computeCurrentStep({
      target: "api",
      nodes,
      edges,
      selectedNodeId: "n2",
      simulationHasRun: true,
      acknowledgedIds: new Set(["config:api"]),
    });
    expect(resultsStep.id).toBe("results");
  });
});

describe("computeCurrentStep — plain chains are unaffected by fan-out", () => {
  it("still builds a single API Server for a target with no fan-out configured", () => {
    const nodes = [node("n1", "client")];
    const step = computeCurrentStep({
      target: "api",
      nodes,
      edges: [],
      ...basePlannerInput,
    });
    expect(step.id).toBe("add:api");
  });

  it("flags a second, unrelated API Server as extra while building Database", () => {
    const nodes = [node("n1", "client"), node("n2", "api"), node("n3", "api")];
    const edges = [edge("n1", "n2")];
    const step = computeCurrentStep({
      target: "database",
      nodes,
      edges,
      ...basePlannerInput,
    });
    expect(step.id).toBe("remove:n3");
  });
});
