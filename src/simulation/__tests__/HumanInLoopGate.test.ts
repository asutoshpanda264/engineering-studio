/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithGate(
  gateConfig: Record<string, unknown> = {},
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      {
        id: "gate1",
        type: "human_in_loop_gate",
        position: { x: 0, y: 0 },
        config: { approvalLatencyMs: 10, approvalLatencyJitterMs: 0, ...gateConfig },
      },
    ],
    connections: [{ source: "client1", target: "gate1", latencyMs: 1 }],
    scenario: {
      id: "human-in-loop-gate-test",
      title: "HumanInLoopGate Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 5000,
    },
    options: { seed: 11 },
    ...overrides,
  };
}

describe("HumanInLoopGate", () => {
  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithGate());
    const b = runSimulation(configWithGate());
    expect(a.events).toEqual(b.events);
  });

  it("is safe to end a chain on — no downstream, still completes requests", () => {
    const result = runSimulation(configWithGate({ denialRate: 0 }));
    expect(result.metrics.totalRequests).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.9);
  });

  it("denialRate produces observable failures with reason 'human_denied_approval'", () => {
    const result = runSimulation(configWithGate({ denialRate: 1 }));
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("human_denied_approval");
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
  });

  it("approvalLatencyMs injects real, observable delay even with denialRate at 0", () => {
    const fast = runSimulation(
      configWithGate({ approvalLatencyMs: 5, approvalLatencyJitterMs: 0, denialRate: 0 })
    );
    const slow = runSimulation(
      configWithGate({ approvalLatencyMs: 2000, approvalLatencyJitterMs: 0, denialRate: 0 })
    );
    expect(slow.metrics.averageLatency).toBeGreaterThan(fast.metrics.averageLatency + 1000);
  });

  it("forwards downstream on approval and reaches a wired tool_call", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
        {
          id: "gate1",
          type: "human_in_loop_gate",
          position: { x: 0, y: 0 },
          config: { approvalLatencyMs: 10, approvalLatencyJitterMs: 0, denialRate: 0 },
        },
        {
          id: "tool1",
          type: "tool_call",
          position: { x: 0, y: 0 },
          config: { failureRate: 0, schemaFailureRate: 0, hallucinatedInvocationRate: 0, silentFailureRate: 0 },
        },
      ],
      connections: [
        { source: "client1", target: "gate1", latencyMs: 1 },
        { source: "gate1", target: "tool1", latencyMs: 1 },
      ],
      scenario: {
        id: "human-in-loop-gate-forward-test",
        title: "HumanInLoopGate Forward Test",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 3000,
      },
      options: { seed: 11 },
    };
    const result = runSimulation(config);
    expect(result.metrics.entityMetrics["tool1"].requestCount).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.9);
  });

  it("queues and eventually rejects once maxConcurrent + maxQueueLength is exceeded under load", () => {
    const result = runSimulation(
      configWithGate(
        { maxConcurrent: 1, maxQueueLength: 1, approvalLatencyMs: 200, approvalLatencyJitterMs: 0 },
        {
          scenario: {
            id: "human-in-loop-gate-overload",
            title: "HumanInLoopGate Overload",
            trafficPattern: { type: "constant", rate: 50 },
            durationMs: 3000,
          },
        }
      )
    );
    expect(result.events.some((e) => e.type === "QUEUE_FULL")).toBe(true);
  });
});
