/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

/** Client → Model Router → LLM Call (SLM tier, first), LLM Call (LLM tier, second). */
function configWithModelRouter(routerConfig: Record<string, unknown> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      { id: "router1", type: "model_router", position: { x: 0, y: 0 }, config: routerConfig },
      {
        id: "slm1",
        type: "llm_call",
        position: { x: 0, y: 0 },
        config: { tier: "slm", hallucinationRate: 0, schemaFailureRate: 0 },
      },
      {
        id: "llm1",
        type: "llm_call",
        position: { x: 0, y: 0 },
        config: { tier: "llm", hallucinationRate: 0, schemaFailureRate: 0 },
      },
    ],
    connections: [
      { source: "client1", target: "router1", latencyMs: 1 },
      { source: "router1", target: "slm1", latencyMs: 1 },
      { source: "router1", target: "llm1", latencyMs: 1 },
    ],
    scenario: {
      id: "model-router-test",
      title: "ModelRouter Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 5000,
    },
    options: { seed: 11 },
  };
}

function slmShare(result: ReturnType<typeof runSimulation>): number {
  const dist = result.metrics.entityMetrics["router1"].routingDistribution ?? [];
  const total = dist.reduce((sum, t) => sum + t.requests, 0);
  const slm = dist.find((t) => t.targetId === "slm1")?.requests ?? 0;
  return total > 0 ? slm / total : 0;
}

describe("ModelRouter", () => {
  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithModelRouter());
    const b = runSimulation(configWithModelRouter());
    expect(a.events).toEqual(b.events);
  });

  it("always_llm routes every request to the second (LLM) downstream target", () => {
    const result = runSimulation(configWithModelRouter({ mode: "always_llm" }));
    expect(slmShare(result)).toBe(0);
  });

  it("always_slm routes every request to the first (SLM) downstream target", () => {
    const result = runSimulation(configWithModelRouter({ mode: "always_slm" }));
    expect(slmShare(result)).toBe(1);
  });

  it("confidence_cascade escalates more often as slmConfidenceMean drops, all else equal", () => {
    const shared = { mode: "confidence_cascade", slmConfidenceJitter: 0, confidenceThreshold: 0.6 };
    const wellCalibrated = runSimulation(configWithModelRouter({ ...shared, slmConfidenceMean: 0.9 }));
    const poorlyCalibrated = runSimulation(configWithModelRouter({ ...shared, slmConfidenceMean: 0.3 }));
    expect(slmShare(poorlyCalibrated)).toBeLessThan(slmShare(wellCalibrated));
  });

  it("cost_optimized_cascade's budget cap keeps the SLM share higher than confidence_cascade's under identical heavy-escalation traffic", () => {
    const shared = {
      slmConfidenceMean: 0.2,
      slmConfidenceJitter: 0,
      confidenceThreshold: 0.6,
    };
    const confidence = runSimulation(configWithModelRouter({ ...shared, mode: "confidence_cascade" }));
    const costOptimized = runSimulation(
      configWithModelRouter({ ...shared, mode: "cost_optimized_cascade", maxEscalationRate: 0.2 })
    );
    expect(slmShare(costOptimized)).toBeGreaterThan(slmShare(confidence));
  });

  it("cost_optimized_cascade never exceeds its own maxEscalationRate, however much traffic wants to escalate", () => {
    const result = runSimulation(
      configWithModelRouter({
        mode: "cost_optimized_cascade",
        slmConfidenceMean: 0.1,
        slmConfidenceJitter: 0,
        confidenceThreshold: 0.9,
        maxEscalationRate: 0.25,
      })
    );
    const escalatedShare = 1 - slmShare(result);
    expect(escalatedShare).toBeLessThanOrEqual(0.26); // small slack for the last admitted request rounding
  });

  it("degrades gracefully with only one downstream target — everything routes there regardless of mode", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
        { id: "router1", type: "model_router", position: { x: 0, y: 0 }, config: { mode: "confidence_cascade" } },
        { id: "slm1", type: "llm_call", position: { x: 0, y: 0 }, config: { hallucinationRate: 0, schemaFailureRate: 0 } },
      ],
      connections: [
        { source: "client1", target: "router1", latencyMs: 1 },
        { source: "router1", target: "slm1", latencyMs: 1 },
      ],
      scenario: {
        id: "model-router-single-target",
        title: "ModelRouter Single Target",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 3000,
      },
      options: { seed: 11 },
    };
    const result = runSimulation(config);
    expect(result.metrics.successRate).toBeGreaterThan(0.9);
    expect(result.metrics.entityMetrics["slm1"].requestCount).toBeGreaterThan(0);
  });
});
