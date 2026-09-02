/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithLlmCall(
  llmConfig: Record<string, unknown> = {},
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      { id: "llm1", type: "llm_call", position: { x: 0, y: 0 }, config: llmConfig },
    ],
    connections: [{ source: "client1", target: "llm1", latencyMs: 1 }],
    scenario: {
      id: "llm-test",
      title: "LlmCall Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 3000,
    },
    options: { seed: 11 },
    ...overrides,
  };
}

function configWithLlmCallingTool(
  llmConfig: Record<string, unknown> = {},
  toolConfig: Record<string, unknown> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      { id: "llm1", type: "llm_call", position: { x: 0, y: 0 }, config: llmConfig },
      { id: "tool1", type: "tool_call", position: { x: 0, y: 0 }, config: toolConfig },
    ],
    connections: [
      { source: "client1", target: "llm1", latencyMs: 1 },
      { source: "llm1", target: "tool1", latencyMs: 1 },
    ],
    scenario: {
      id: "llm-tool-test",
      title: "LLM Calls a Tool",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 3000,
    },
    options: { seed: 11 },
  };
}

describe("LlmCall", () => {
  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithLlmCall());
    const b = runSimulation(configWithLlmCall());
    expect(a.events).toEqual(b.events);
  });

  it("is safe to end a chain on — no downstream, still completes requests", () => {
    const result = runSimulation(
      configWithLlmCall({ hallucinationRate: 0, schemaFailureRate: 0 })
    );
    expect(result.metrics.totalRequests).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.9);
  });

  it("forwards to a downstream tool_call and completes the round trip (Tool Use)", () => {
    const result = runSimulation(
      configWithLlmCallingTool(
        { hallucinationRate: 0, schemaFailureRate: 0 },
        { failureRate: 0, schemaFailureRate: 0 }
      )
    );
    expect(result.metrics.successRate).toBeCloseTo(1, 1);
    expect(result.metrics.entityMetrics["tool1"].requestCount).toBeGreaterThan(0);
  });

  it("hallucinationRate produces observable failures with reason 'hallucinated_output'", () => {
    const result = runSimulation(
      configWithLlmCall({ hallucinationRate: 1, schemaFailureRate: 0 })
    );
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("hallucinated_output");
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
  });

  it("schemaFailureRate produces observable failures with reason 'schema_violation'", () => {
    const result = runSimulation(
      configWithLlmCall({ schemaFailureRate: 1, hallucinationRate: 0 })
    );
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("schema_violation");
  });

  it("promptInjectionRate does NOT fail the request — it completes, compromised, with no downstream to catch it", () => {
    const result = runSimulation(
      configWithLlmCall({ hallucinationRate: 0, schemaFailureRate: 0, promptInjectionRate: 1 })
    );
    expect(result.events.some((e) => e.type === "REQUEST_FAILED")).toBe(false);
    expect(result.metrics.successRate).toBeCloseTo(1, 1);
  });

  it("a guardrail_validator downstream can catch what promptInjectionRate compromises", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
        {
          id: "llm1",
          type: "llm_call",
          position: { x: 0, y: 0 },
          config: { hallucinationRate: 0, schemaFailureRate: 0, promptInjectionRate: 1 },
        },
        {
          id: "guard1",
          type: "guardrail_validator",
          position: { x: 0, y: 0 },
          config: { mode: "gate", rejectionRate: 0, compromiseCatchRate: 1 },
        },
      ],
      connections: [
        { source: "client1", target: "llm1", latencyMs: 1 },
        { source: "llm1", target: "guard1", latencyMs: 1 },
      ],
      scenario: {
        id: "llm-injection-caught-test",
        title: "LLM Call Injection Caught",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 3000,
      },
      options: { seed: 11 },
    };
    const result = runSimulation(config);
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("direct_prompt_injection");
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
  });

  it("slm tier completes faster than llm tier at identical config otherwise", () => {
    const shared = { hallucinationRate: 0, schemaFailureRate: 0, processingJitterMs: 0 };
    const slm = runSimulation(configWithLlmCall({ ...shared, tier: "slm" }));
    const llm = runSimulation(configWithLlmCall({ ...shared, tier: "llm" }));
    expect(slm.metrics.averageLatency).toBeLessThan(llm.metrics.averageLatency);
  });

  it("int4 quantization completes faster than unquantized (none) at identical config otherwise", () => {
    const shared = { hallucinationRate: 0, schemaFailureRate: 0, processingJitterMs: 0 };
    const none = runSimulation(configWithLlmCall({ ...shared, quantization: "none" }));
    const int4 = runSimulation(configWithLlmCall({ ...shared, quantization: "int4" }));
    expect(int4.metrics.averageLatency).toBeLessThan(none.metrics.averageLatency);
  });

  it("edge deployment removes network round-trip latency relative to cloud, all else equal", () => {
    const shared = {
      hallucinationRate: 0,
      schemaFailureRate: 0,
      processingJitterMs: 0,
      tier: "slm",
    };
    const cloud = runSimulation(configWithLlmCall({ ...shared, deploymentTarget: "cloud" }));
    const edge = runSimulation(configWithLlmCall({ ...shared, deploymentTarget: "edge" }));
    expect(edge.metrics.averageLatency).toBeLessThan(cloud.metrics.averageLatency);
  });

  it("edge + llm tier is slower than edge + slm tier — the simulated 'bad pairing' penalty", () => {
    const shared = {
      hallucinationRate: 0,
      schemaFailureRate: 0,
      processingJitterMs: 0,
      deploymentTarget: "edge",
    };
    const slm = runSimulation(configWithLlmCall({ ...shared, tier: "slm" }));
    const llm = runSimulation(configWithLlmCall({ ...shared, tier: "llm" }));
    expect(llm.metrics.averageLatency).toBeGreaterThan(slm.metrics.averageLatency);
  });

  it("queues and eventually rejects once maxConcurrent + maxQueueLength is exceeded under load", () => {
    const result = runSimulation(
      configWithLlmCall(
        {
          maxConcurrent: 1,
          maxQueueLength: 1,
          processingTimeMs: 100,
          processingJitterMs: 0,
          hallucinationRate: 0,
          schemaFailureRate: 0,
        },
        {
          scenario: {
            id: "llm-overload",
            title: "LlmCall Overload",
            trafficPattern: { type: "constant", rate: 100 },
            durationMs: 3000,
          },
        }
      )
    );
    expect(result.events.some((e) => e.type === "QUEUE_FULL")).toBe(true);
  });
});
