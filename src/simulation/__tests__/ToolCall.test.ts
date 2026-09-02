/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithToolCall(
  toolConfig: Record<string, unknown> = {},
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      {
        id: "llm1",
        type: "llm_call",
        position: { x: 0, y: 0 },
        config: { hallucinationRate: 0, schemaFailureRate: 0, maxConcurrent: 50 },
      },
      { id: "tool1", type: "tool_call", position: { x: 0, y: 0 }, config: toolConfig },
    ],
    connections: [
      { source: "client1", target: "llm1", latencyMs: 1 },
      { source: "llm1", target: "tool1", latencyMs: 1 },
    ],
    scenario: {
      id: "tool-test",
      title: "ToolCall Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 3000,
    },
    options: { seed: 13 },
    ...overrides,
  };
}

describe("ToolCall", () => {
  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithToolCall());
    const b = runSimulation(configWithToolCall());
    expect(a.events).toEqual(b.events);
  });

  it("completes the round trip back through the calling llm_call to the client", () => {
    const result = runSimulation(configWithToolCall({ failureRate: 0, schemaFailureRate: 0 }));
    expect(result.metrics.successRate).toBeCloseTo(1, 1);
  });

  it("failureRate produces observable failures with reason 'tool_call_failed'", () => {
    const result = runSimulation(configWithToolCall({ failureRate: 1, schemaFailureRate: 0 }));
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("tool_call_failed");
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
  });

  it("schemaFailureRate produces observable failures with reason 'schema_violation'", () => {
    const result = runSimulation(configWithToolCall({ schemaFailureRate: 1, failureRate: 0 }));
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("schema_violation");
  });

  it("hallucinatedInvocationRate produces observable failures with reason 'hallucinated_tool_call'", () => {
    const result = runSimulation(
      configWithToolCall({ hallucinatedInvocationRate: 1, failureRate: 0, schemaFailureRate: 0 })
    );
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("hallucinated_tool_call");
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
  });

  it("silentFailureRate does NOT fail the request — it completes, compromised, unless caught downstream", () => {
    const result = runSimulation(
      configWithToolCall({
        failureRate: 0,
        schemaFailureRate: 0,
        hallucinatedInvocationRate: 0,
        silentFailureRate: 1,
      })
    );
    // No REQUEST_FAILED anywhere — the whole point of a silent failure.
    expect(result.events.some((e) => e.type === "REQUEST_FAILED")).toBe(false);
    expect(result.metrics.successRate).toBeCloseTo(1, 1);
    // But every completed request's journey carries the compromise flag
    // somewhere in its metadata (a REQUEST_ROUTED response-leg hop).
    const compromisedHop = result.events.find(
      (e) => (e.metadata as { compromised?: boolean }).compromised === true
    );
    expect(compromisedHop).toBeDefined();
    expect((compromisedHop?.metadata as { compromiseReason?: string }).compromiseReason).toBe(
      "silent_tool_failure"
    );
  });

  it("is safe to end a chain on — no further downstream, still responds", () => {
    const result = runSimulation(configWithToolCall({ failureRate: 0, schemaFailureRate: 0 }));
    expect(result.metrics.entityMetrics["tool1"].requestCount).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.9);
  });

  it("queues and eventually rejects once maxConcurrent + maxQueueLength is exceeded under load", () => {
    const result = runSimulation(
      configWithToolCall({
        maxConcurrent: 1,
        maxQueueLength: 1,
        processingTimeMs: 100,
        processingJitterMs: 0,
        failureRate: 0,
        schemaFailureRate: 0,
      })
    );
    expect(result.events.some((e) => e.type === "QUEUE_FULL")).toBe(true);
  });
});
