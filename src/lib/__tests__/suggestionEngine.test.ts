/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "@/simulation/engine/Simulator";
import { getSuggestions } from "@/lib/suggestionEngine";
import type { SimulationConfig } from "@/simulation/types";
import type { ArchitectureNode } from "@/store/workshopStore";

function toArchitectureNodes(config: SimulationConfig): ArchitectureNode[] {
  return config.entities.map((entity) => ({
    id: entity.id,
    type: "component",
    position: entity.position,
    data: {
      entityType: entity.type,
      label: entity.type,
      config: entity.config,
    },
  }));
}

function baseConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
      { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "api1", latencyMs: 5 },
      { source: "api1", target: "db1", latencyMs: 2 },
    ],
    scenario: {
      id: "test",
      title: "Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 2000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("getSuggestions", () => {
  it("reports a healthy architecture when nothing is near capacity", () => {
    const config = baseConfig();
    const result = runSimulation(config);
    const suggestions = getSuggestions(result, toArchitectureNodes(config));

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].severity).toBe("info");
    expect(suggestions[0].title).toMatch(/handling the load well/i);
  });

  it("flags a crashed entity as critical, distinct from a merely degraded one", () => {
    const config = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        {
          id: "db1",
          type: "database",
          position: { x: 0, y: 0 },
          config: { maxConnections: 1, maxQueueLength: 0 },
        },
      ],
      scenario: {
        id: "overload",
        title: "Overload",
        trafficPattern: { type: "constant", rate: 1000 },
        durationMs: 2000,
      },
    });
    const result = runSimulation(config);
    const suggestions = getSuggestions(result, toArchitectureNodes(config));

    const dbSuggestion = suggestions.find((s) => s.entityId === "db1");
    expect(dbSuggestion?.severity).toBe("critical");
    expect(dbSuggestion?.title).toMatch(/crashed/i);
    // Critical findings surface first.
    expect(suggestions[0]).toBe(dbSuggestion);
  });

  it("names the specific config field to raise, for entities with one", () => {
    const config = baseConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
        {
          id: "db1",
          type: "database",
          position: { x: 0, y: 0 },
          config: { maxConnections: 1, maxQueueLength: 0 },
        },
      ],
      scenario: {
        id: "overload",
        title: "Overload",
        trafficPattern: { type: "constant", rate: 1000 },
        durationMs: 2000,
      },
    });
    const result = runSimulation(config);
    const suggestions = getSuggestions(result, toArchitectureNodes(config));
    const dbSuggestion = suggestions.find((s) => s.entityId === "db1");

    expect(dbSuggestion?.description).toMatch(/Max Connections/);
  });

  it("returns nothing when the run generated no traffic", () => {
    const config = baseConfig();
    config.entities = config.entities.filter((e) => e.type !== "client");
    const result = runSimulation(config);
    const suggestions = getSuggestions(result, toArchitectureNodes(config));

    expect(suggestions).toEqual([]);
  });
});
