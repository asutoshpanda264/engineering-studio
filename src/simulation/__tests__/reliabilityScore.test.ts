/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { computeReliabilityScore } from "../engine/reliabilityScore";
import type { SimulationConfig } from "../types";

function reliableConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      {
        id: "llm1",
        type: "llm_call",
        position: { x: 0, y: 0 },
        config: { hallucinationRate: 0, schemaFailureRate: 0, promptInjectionRate: 0 },
      },
    ],
    connections: [{ source: "client1", target: "llm1", latencyMs: 1 }],
    scenario: {
      id: "reliability-test",
      title: "Reliability Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 3000,
    },
    options: { seed: 11 },
    ...overrides,
  };
}

describe("computeReliabilityScore", () => {
  it("every seed passes a reliable architecture at the default threshold", () => {
    const result = computeReliabilityScore(reliableConfig());
    expect(result.seeds).toBe(10);
    expect(result.passingSeeds).toBe(10);
    expect(result.passRate).toBe(1);
    expect(result.perSeedSuccessRates).toHaveLength(10);
    expect(result.perSeedSuccessRates.every((rate) => rate >= 0.95)).toBe(true);
  });

  it("no seed passes an unreliable architecture", () => {
    const flaky = reliableConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
        {
          id: "llm1",
          type: "llm_call",
          position: { x: 0, y: 0 },
          config: { hallucinationRate: 0.5, schemaFailureRate: 0 },
        },
      ],
    });
    const result = computeReliabilityScore(flaky);
    expect(result.passingSeeds).toBe(0);
    expect(result.passRate).toBe(0);
  });

  it("is deterministic — calling it twice on the same config yields the identical score", () => {
    const config = reliableConfig();
    const a = computeReliabilityScore(config);
    const b = computeReliabilityScore(config);
    expect(a).toEqual(b);
  });

  it("samples seeds starting from the config's own seed, consecutively", () => {
    const config = reliableConfig({ options: { seed: 100 } });
    const three = computeReliabilityScore(config, { seeds: 3 });
    expect(three.seeds).toBe(3);
    expect(three.perSeedSuccessRates).toHaveLength(3);
  });

  it("respects a custom successRateThreshold", () => {
    const config = reliableConfig({
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
        {
          id: "llm1",
          type: "llm_call",
          position: { x: 0, y: 0 },
          config: { hallucinationRate: 0.1, schemaFailureRate: 0 },
        },
      ],
    });
    const strict = computeReliabilityScore(config, { successRateThreshold: 0.99 });
    const lenient = computeReliabilityScore(config, { successRateThreshold: 0.5 });
    expect(lenient.passingSeeds).toBeGreaterThanOrEqual(strict.passingSeeds);
  });

  it("respects a custom seeds count", () => {
    const result = computeReliabilityScore(reliableConfig(), { seeds: 25 });
    expect(result.seeds).toBe(25);
    expect(result.perSeedSuccessRates).toHaveLength(25);
  });
});
