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

function toArchitectureEdges(config: SimulationConfig) {
  return config.connections.map((c) => ({ id: `${c.source}->${c.target}`, source: c.source, target: c.target }));
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

  describe("root-cause rules", () => {
    // Shared overload config: a struggling SQL database, undersized enough
    // to actually drop requests (errorCount > 0), with no cache/queue in
    // front of it — the shape every root-cause rule below should fire on.
    function overloadedSqlConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
      return baseConfig({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
          { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { maxConnections: 1, maxQueueLength: 0 } },
        ],
        scenario: {
          id: "overload",
          title: "Overload",
          trafficPattern: { type: "constant", rate: 1000 },
          durationMs: 2000,
        },
        ...overrides,
      });
    }

    it("suggests comparing NoSQL for a struggling SQL database", () => {
      const config = overloadedSqlConfig();
      const result = runSimulation(config);
      const suggestions = getSuggestions(result, toArchitectureNodes(config), toArchitectureEdges(config));

      const dbTypeSuggestion = suggestions.find((s) => s.title.match(/SQL database under real load/i));
      expect(dbTypeSuggestion).toBeDefined();
      expect(dbTypeSuggestion?.description).toMatch(/NoSQL/);
    });

    it("does NOT suggest NoSQL when the database is already NoSQL", () => {
      const config = overloadedSqlConfig({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
          { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
          {
            id: "db1",
            type: "database",
            position: { x: 0, y: 0 },
            config: { type: "nosql", maxConnections: 1, maxQueueLength: 0 },
          },
        ],
      });
      const result = runSimulation(config);
      const suggestions = getSuggestions(result, toArchitectureNodes(config), toArchitectureEdges(config));

      expect(suggestions.find((s) => s.title.match(/SQL database under real load/i))).toBeUndefined();
    });

    it("suggests a Cache when a struggling database has none upstream", () => {
      const config = overloadedSqlConfig();
      const result = runSimulation(config);
      const suggestions = getSuggestions(result, toArchitectureNodes(config), toArchitectureEdges(config));

      const cacheSuggestion = suggestions.find((s) => s.title.match(/Nothing is caching/i));
      expect(cacheSuggestion).toBeDefined();
      expect(cacheSuggestion?.description).toMatch(/Cache/);
    });

    it("does NOT suggest a Cache when one already sits directly in front of the database", () => {
      const config = overloadedSqlConfig({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
          { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
          { id: "cache1", type: "cache", position: { x: 0, y: 0 }, config: {} },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { maxConnections: 1, maxQueueLength: 0 } },
        ],
        connections: [
          { source: "client1", target: "api1" },
          { source: "api1", target: "cache1" },
          { source: "cache1", target: "db1" },
        ],
      });
      const result = runSimulation(config);
      const suggestions = getSuggestions(result, toArchitectureNodes(config), toArchitectureEdges(config));

      expect(suggestions.find((s) => s.title.match(/Nothing is caching/i))).toBeUndefined();
    });

    it("suggests a Message Queue when a database is dropping requests with none upstream", () => {
      const config = overloadedSqlConfig();
      const result = runSimulation(config);
      const suggestions = getSuggestions(result, toArchitectureNodes(config), toArchitectureEdges(config));

      const queueSuggestion = suggestions.find((s) => s.title.match(/dropping requests it can't immediately admit/i));
      expect(queueSuggestion).toBeDefined();
      expect(queueSuggestion?.description).toMatch(/Message Queue/);
    });

    it("suggests checking the downstream database first when an API and its database are both struggling at once", () => {
      const config = overloadedSqlConfig();
      const result = runSimulation(config);
      const suggestions = getSuggestions(result, toArchitectureNodes(config), toArchitectureEdges(config));

      const diagnoseSuggestion = suggestions.find((s) => s.entityId === "api1" && s.title.match(/both showing trouble at once/i));
      expect(diagnoseSuggestion).toBeDefined();
      expect(diagnoseSuggestion?.description).toMatch(/db1|database/i);
    });

    it("still names the diagnostic method (isolate the downstream tier first) even when the API is generously sized — its own errorCount still inherits the database's propagated failures, and that advice stays correct either way", () => {
      // A generously-sized API in front of the same undersized database:
      // every request the database rejects still routes its failure back
      // through the API (Local Knowledge — the API "touched" it), so the
      // API's own errorCount is nonzero regardless of the API's own
      // headroom. "Isolate the downstream tier first" is still exactly
      // the right advice here, which is why this rule doesn't try to
      // guess an answer the metrics can't prove — see its own comment.
      const config = overloadedSqlConfig({
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
          { id: "api1", type: "api", position: { x: 0, y: 0 }, config: { maxConcurrent: 200, maxQueueLength: 500 } },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: { maxConnections: 1, maxQueueLength: 0 } },
        ],
      });
      const result = runSimulation(config);
      const suggestions = getSuggestions(result, toArchitectureNodes(config), toArchitectureEdges(config));

      const diagnoseSuggestion = suggestions.find((s) => s.entityId === "api1" && s.title.match(/both showing trouble at once/i));
      expect(diagnoseSuggestion).toBeDefined();
      expect(diagnoseSuggestion?.description).toMatch(/before raising/i);
    });

    it("does not misfire the diagnose-the-bottleneck rule when the API is genuinely healthy (no downstream failure to inherit)", () => {
      const config = baseConfig();
      const result = runSimulation(config);
      const suggestions = getSuggestions(result, toArchitectureNodes(config), toArchitectureEdges(config));

      expect(suggestions.find((s) => s.title.match(/both showing trouble at once/i))).toBeUndefined();
    });

    it("still works with no edges argument supplied (defaults to []) — every root-cause rule treats an empty graph as 'nothing upstream'", () => {
      const config = overloadedSqlConfig();
      const result = runSimulation(config);
      // Deliberately omit the third argument.
      const suggestions = getSuggestions(result, toArchitectureNodes(config));

      expect(suggestions.find((s) => s.title.match(/Nothing is caching/i))).toBeDefined();
    });
  });
});
