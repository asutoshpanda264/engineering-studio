/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithGuardrail(
  guardrailConfig: Record<string, unknown> = {},
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      {
        id: "guard1",
        type: "guardrail_validator",
        position: { x: 0, y: 0 },
        config: guardrailConfig,
      },
    ],
    connections: [{ source: "client1", target: "guard1", latencyMs: 1 }],
    scenario: {
      id: "guardrail-test",
      title: "GuardrailValidator Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 5000,
    },
    options: { seed: 11 },
    ...overrides,
  };
}

/** Reflection's real topology: Agent Orchestrator (Sequential) → LLM Call → Guardrail Validator (Gate). */
function configWithReflectionLoop(
  guardrailConfig: Record<string, unknown>,
  orchestratorConfig: Record<string, unknown> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      {
        id: "orch1",
        type: "agent_orchestrator",
        position: { x: 0, y: 0 },
        config: { routingMode: "sequential", ...orchestratorConfig },
      },
      {
        id: "llm1",
        type: "llm_call",
        position: { x: 0, y: 0 },
        config: {
          hallucinationRate: 0,
          schemaFailureRate: 0,
          processingJitterMs: 0,
          promptInjectionRate: 0,
        },
      },
      { id: "guard1", type: "guardrail_validator", position: { x: 0, y: 0 }, config: guardrailConfig },
    ],
    connections: [
      { source: "client1", target: "orch1", latencyMs: 1 },
      { source: "orch1", target: "llm1", latencyMs: 1 },
      { source: "llm1", target: "guard1", latencyMs: 1 },
    ],
    scenario: {
      id: "reflection-loop-test",
      title: "Reflection Loop Test",
      trafficPattern: { type: "constant", rate: 10 },
      durationMs: 3000,
    },
    options: { seed: 11 },
  };
}

describe("GuardrailValidator", () => {
  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithGuardrail());
    const b = runSimulation(configWithGuardrail());
    expect(a.events).toEqual(b.events);
  });

  it("is safe to end a chain on — no downstream, still completes requests", () => {
    const result = runSimulation(configWithGuardrail({ mode: "gate", rejectionRate: 0 }));
    expect(result.metrics.totalRequests).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.9);
  });

  it("gate mode's rejectionRate produces observable failures with reason 'guardrail_rejected'", () => {
    const result = runSimulation(configWithGuardrail({ mode: "gate", rejectionRate: 1 }));
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("guardrail_rejected");
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
  });

  it("scorer mode fails with a distinct reason 'guardrail_score_below_threshold'", () => {
    const result = runSimulation(
      configWithGuardrail({
        mode: "scorer",
        scoreMean: 0.1,
        scoreJitter: 0,
        scoreThreshold: 0.9,
        verificationMethod: "execution",
      })
    );
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("guardrail_score_below_threshold");
  });

  it("Reflection composes for free: a Sequential Agent Orchestrator retries llm_call → guardrail_validator on rejection, up to Max Iterations", () => {
    const result = runSimulation(
      configWithReflectionLoop(
        { mode: "gate", rejectionRate: 1 }, // never passes
        { maxIterations: 5 }
      )
    );
    // Every session exhausts its retry budget and fails with the
    // orchestrator's own iteration-limit reason — the loop entirely
    // emerged from AgentOrchestrator's existing retry, not new code here.
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("iteration_limit_exceeded");
    // The llm_call was retried roughly Max Iterations times per logical
    // request — the same signature AgentOrchestrator's own infinite-loop
    // failure mode test checks for.
    const totalRequests = result.metrics.totalRequests;
    const llmRequestCount = result.metrics.entityMetrics["llm1"].requestCount;
    expect(llmRequestCount).toBeGreaterThan(totalRequests * 3);
  });

  it("Reflection eventually succeeds once the guardrail stops rejecting", () => {
    const result = runSimulation(
      configWithReflectionLoop({ mode: "gate", rejectionRate: 0 }, { maxIterations: 5 })
    );
    expect(result.metrics.successRate).toBeGreaterThan(0.9);
  });

  it("judge-based verification drifts scores upward on retries; execution-based does not, identical traffic otherwise", () => {
    const shared = {
      mode: "scorer",
      scoreMean: 0.4,
      scoreJitter: 0,
      scoreThreshold: 0.6,
      judgeDriftPerAttempt: 0.15,
    };
    const judge = runSimulation(
      configWithReflectionLoop({ ...shared, verificationMethod: "judge" }, { maxIterations: 5 })
    );
    const execution = runSimulation(
      configWithReflectionLoop({ ...shared, verificationMethod: "execution" }, { maxIterations: 5 })
    );
    // scoreMean (0.4) never clears threshold (0.6) on its own — execution
    // should never pass; judge's drift (0.15/attempt) clears it by the
    // 2nd retry, so judge's success rate should be measurably higher.
    expect(execution.metrics.successRate).toBeCloseTo(0, 1);
    expect(judge.metrics.successRate).toBeGreaterThan(execution.metrics.successRate);
  });

  it("compromiseCatchRate catches an already-compromised request and fails it with the specific compromise reason", () => {
    // Standalone LLM Call → Guardrail Validator, no orchestrator — an
    // orchestrator's own retry logic relabels an exhausted retry loop's
    // final failure reason as "iteration_limit_exceeded" (see "Reflection
    // composes for free" above), which would mask the specific reason this
    // test is about.
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
        id: "guardrail-catches-compromise-test",
        title: "Guardrail Catches Compromise",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 3000,
      },
      options: { seed: 11 },
    };
    const result = runSimulation(config);
    // rejectionRate is 0, so any REQUEST_FAILED here can only have come
    // from compromiseCatchRate catching llm1's (guaranteed) injection.
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("direct_prompt_injection");
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
  });

  it("compromiseCatchRate at 0 lets a compromised request pass through unchanged", () => {
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
          config: { mode: "gate", rejectionRate: 0, compromiseCatchRate: 0 },
        },
      ],
      connections: [
        { source: "client1", target: "llm1", latencyMs: 1 },
        { source: "llm1", target: "guard1", latencyMs: 1 },
      ],
      scenario: {
        id: "guardrail-misses-compromise-test",
        title: "Guardrail Misses Compromise",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 3000,
      },
      options: { seed: 11 },
    };
    const result = runSimulation(config);
    expect(result.events.some((e) => e.type === "REQUEST_FAILED")).toBe(false);
  });

  it("queues and eventually rejects once maxConcurrent + maxQueueLength is exceeded under load", () => {
    const result = runSimulation(
      configWithGuardrail(
        { maxConcurrent: 1, maxQueueLength: 1, processingTimeMs: 100, processingJitterMs: 0 },
        {
          scenario: {
            id: "guardrail-overload",
            title: "GuardrailValidator Overload",
            trafficPattern: { type: "constant", rate: 100 },
            durationMs: 3000,
          },
        }
      )
    );
    expect(result.events.some((e) => e.type === "QUEUE_FULL")).toBe(true);
  });
});
