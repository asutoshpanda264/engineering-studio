/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithDatabase(
  databaseConfig: Record<string, unknown> = {},
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 200 } },
      { id: "api1", type: "api", position: { x: 0, y: 0 }, config: { maxConcurrent: 50, maxQueueLength: 200 } },
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: databaseConfig },
    ],
    connections: [
      { source: "client1", target: "api1", latencyMs: 1 },
      { source: "api1", target: "db1", latencyMs: 1 },
    ],
    scenario: {
      id: "db-test",
      title: "Database Test",
      trafficPattern: { type: "constant", rate: 200 },
      durationMs: 4000,
    },
    options: { seed: 7 },
    ...overrides,
  };
}

describe("Database", () => {
  it("defaults to sql, matching pre-`type` behavior exactly", () => {
    const withoutType = runSimulation(configWithDatabase({}));
    const explicitSql = runSimulation(configWithDatabase({ type: "sql" }));
    expect(withoutType.events).toEqual(explicitSql.events);
  });

  it("nosql tolerates more concurrent load than sql at identical configured Max Connections", () => {
    const sharedConfig = { maxConnections: 5, maxQueueLength: 5, processingTimeMs: 20, processingJitterMs: 0 };
    const sql = runSimulation(configWithDatabase({ ...sharedConfig, type: "sql" }));
    const nosql = runSimulation(configWithDatabase({ ...sharedConfig, type: "nosql" }));

    expect(nosql.metrics.successRate).toBeGreaterThan(sql.metrics.successRate);
  });

  it("nosql completes requests faster than sql at identical configured Processing Time", () => {
    const sharedConfig = { maxConnections: 50, maxQueueLength: 200, processingTimeMs: 20, processingJitterMs: 0 };
    const sql = runSimulation(configWithDatabase({ ...sharedConfig, type: "sql" }));
    const nosql = runSimulation(configWithDatabase({ ...sharedConfig, type: "nosql" }));

    expect(nosql.metrics.averageLatency).toBeLessThan(sql.metrics.averageLatency);
  });

  it("is deterministic for a given seed regardless of type", () => {
    const a = runSimulation(configWithDatabase({ type: "nosql" }));
    const b = runSimulation(configWithDatabase({ type: "nosql" }));
    expect(a.events).toEqual(b.events);
  });
});
