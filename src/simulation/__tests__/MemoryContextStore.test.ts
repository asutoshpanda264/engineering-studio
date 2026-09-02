/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithMemoryStore(
  memoryConfig: Record<string, unknown> = {},
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      { id: "mem1", type: "memory_context_store", position: { x: 0, y: 0 }, config: memoryConfig },
    ],
    connections: [{ source: "client1", target: "mem1", latencyMs: 1 }],
    scenario: {
      id: "memory-test",
      title: "MemoryContextStore Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 5000,
    },
    options: { seed: 11 },
    ...overrides,
  };
}

describe("MemoryContextStore", () => {
  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithMemoryStore());
    const b = runSimulation(configWithMemoryStore());
    expect(a.events).toEqual(b.events);
  });

  it("is safe to end a chain on — no downstream, still completes requests", () => {
    const result = runSimulation(
      configWithMemoryStore({ driftFailureRate: 0 })
    );
    expect(result.metrics.totalRequests).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.9);
  });

  it("never compacts when capacity is never reached", () => {
    const result = runSimulation(
      configWithMemoryStore({ capacityTokens: 1_000_000, tokensPerTurn: 1 })
    );
    expect(result.events.some((e) => e.type === "CONTEXT_COMPACTED")).toBe(false);
    expect(result.metrics.entityMetrics["mem1"].memoryContext).toBeUndefined();
  });

  it("'none' policy compacts and permanently loses critical info on first overflow", () => {
    const result = runSimulation(
      configWithMemoryStore({
        compactionPolicy: "none",
        capacityTokens: 1000,
        tokensPerTurn: 500,
        driftFailureRate: 0,
      })
    );
    const compactions = result.events.filter((e) => e.type === "CONTEXT_COMPACTED");
    expect(compactions.length).toBeGreaterThan(0);
    expect(compactions[0].metadata.criticalInfoIntact).toBe(false);
    const memoryMetrics = result.metrics.entityMetrics["mem1"].memoryContext;
    expect(memoryMetrics?.criticalInfoIntact).toBe(false);
    expect(memoryMetrics?.policy).toBe("none");
  });

  it("driftFailureRate produces observable failures with reason 'context_truncation' once critical info is lost", () => {
    const result = runSimulation(
      configWithMemoryStore({
        compactionPolicy: "none",
        capacityTokens: 1000,
        tokensPerTurn: 500,
        driftFailureRate: 1,
      })
    );
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("context_truncation");
  });

  it("scratchpad preserves critical info far more reliably than none, same seed and traffic otherwise", () => {
    const shared = { capacityTokens: 1000, tokensPerTurn: 500, driftFailureRate: 0 };
    const none = runSimulation(
      configWithMemoryStore({ ...shared, compactionPolicy: "none" })
    );
    const scratchpad = runSimulation(
      configWithMemoryStore({ ...shared, compactionPolicy: "scratchpad", scratchpadInfoLossRate: 0 })
    );
    expect(none.metrics.entityMetrics["mem1"].memoryContext?.criticalInfoIntact).toBe(false);
    expect(scratchpad.metrics.entityMetrics["mem1"].memoryContext?.criticalInfoIntact).toBe(true);
  });

  it("scratchpad's sustained read cost makes it slower than none once its file exists, all else equal", () => {
    const shared = {
      capacityTokens: 1000,
      tokensPerTurn: 500,
      driftFailureRate: 0,
      processingJitterMs: 0,
      scratchpadReadLatencyMs: 200,
    };
    const none = runSimulation(configWithMemoryStore({ ...shared, compactionPolicy: "none" }));
    const scratchpad = runSimulation(
      configWithMemoryStore({ ...shared, compactionPolicy: "scratchpad", scratchpadInfoLossRate: 0 })
    );
    expect(scratchpad.metrics.averageLatency).toBeGreaterThan(none.metrics.averageLatency);
  });

  it("queues and eventually rejects once maxConcurrent + maxQueueLength is exceeded under load", () => {
    const result = runSimulation(
      configWithMemoryStore(
        { maxConcurrent: 1, maxQueueLength: 1, processingTimeMs: 100, processingJitterMs: 0 },
        {
          scenario: {
            id: "memory-overload",
            title: "MemoryContextStore Overload",
            trafficPattern: { type: "constant", rate: 100 },
            durationMs: 3000,
          },
        }
      )
    );
    expect(result.events.some((e) => e.type === "QUEUE_FULL")).toBe(true);
  });
});
