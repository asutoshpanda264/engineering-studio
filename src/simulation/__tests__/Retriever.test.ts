/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

function configWithRetriever(
  retrieverConfig: Record<string, unknown> = {},
  clientConfig: Record<string, unknown> = {},
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      {
        id: "client1",
        type: "client",
        position: { x: 0, y: 0 },
        config: { requestRate: 20, ...clientConfig },
      },
      { id: "ret1", type: "retriever", position: { x: 0, y: 0 }, config: retrieverConfig },
    ],
    connections: [{ source: "client1", target: "ret1", latencyMs: 1 }],
    scenario: {
      id: "retriever-test",
      title: "Retriever Test",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 5000,
    },
    options: { seed: 11 },
    ...overrides,
  };
}

describe("Retriever", () => {
  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithRetriever());
    const b = runSimulation(configWithRetriever());
    expect(a.events).toEqual(b.events);
  });

  it("is safe to end a chain on — no downstream, still completes requests", () => {
    const result = runSimulation(configWithRetriever({ missRate: 0 }));
    expect(result.metrics.totalRequests).toBeGreaterThan(0);
    expect(result.metrics.successRate).toBeGreaterThan(0.9);
  });

  it("poisonedContentRate does NOT fail a resolved retrieval — it completes, compromised, with no downstream to catch it", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
        {
          id: "ret1",
          type: "retriever",
          position: { x: 0, y: 0 },
          config: { missRate: 0, poisonedContentRate: 1 },
        },
        {
          id: "llm1",
          type: "llm_call",
          position: { x: 0, y: 0 },
          config: { hallucinationRate: 0, schemaFailureRate: 0, promptInjectionRate: 0 },
        },
      ],
      connections: [
        { source: "client1", target: "ret1", latencyMs: 1 },
        { source: "ret1", target: "llm1", latencyMs: 1 },
      ],
      scenario: {
        id: "retriever-poisoned-test",
        title: "Retriever Poisoned Content Test",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 3000,
      },
      options: { seed: 11 },
    };
    const result = runSimulation(config);
    expect(result.events.some((e) => e.type === "REQUEST_FAILED")).toBe(false);
    expect(result.metrics.successRate).toBeCloseTo(1, 1);
    const compromisedHop = result.events.find(
      (e) => (e.metadata as { compromised?: boolean }).compromised === true
    );
    expect(compromisedHop).toBeDefined();
    expect((compromisedHop?.metadata as { compromiseReason?: string }).compromiseReason).toBe(
      "indirect_prompt_injection"
    );
  });

  it("missRate produces observable failures with reason 'retrieval_miss' under pipeline", () => {
    const result = runSimulation(configWithRetriever({ mode: "pipeline", missRate: 1 }));
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("retrieval_miss");
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
  });

  it("agentic mode's exhausted budget can produce 'retrieval_hallucination' distinct from a plain miss", () => {
    const result = runSimulation(
      configWithRetriever({
        mode: "agentic",
        missRate: 1,
        maxRetrievalAttempts: 2,
        unresolvedHallucinationRate: 1,
      })
    );
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("retrieval_hallucination");
  });

  it("relationshipPenaltyMultiplier makes pipeline meaningfully worse on relationship-shaped traffic", () => {
    const shared = { mode: "pipeline", missRate: 0.1, relationshipPenaltyMultiplier: 5 };
    const ordinary = runSimulation(configWithRetriever(shared, { relationshipQueryRate: 0 }));
    const relational = runSimulation(configWithRetriever(shared, { relationshipQueryRate: 1 }));
    expect(relational.metrics.successRate).toBeLessThan(ordinary.metrics.successRate);
  });

  it("graphRelationshipBonusMultiplier makes graphrag win specifically on relationship-shaped traffic, unlike pipeline", () => {
    const relationshipTraffic = { relationshipQueryRate: 1 };
    const pipeline = runSimulation(
      configWithRetriever(
        { mode: "pipeline", missRate: 0.1, relationshipPenaltyMultiplier: 8 },
        relationshipTraffic
      )
    );
    const graphrag = runSimulation(
      configWithRetriever(
        { mode: "graphrag", graphMissRateBase: 0.1, graphRelationshipBonusMultiplier: 0.05 },
        relationshipTraffic
      )
    );
    expect(graphrag.metrics.successRate).toBeGreaterThan(pipeline.metrics.successRate);
  });

  it("adaptive delegates to graphrag-shaped behavior on relationship queries and pipeline-shaped behavior otherwise", () => {
    const shared = {
      missRate: 0.1,
      relationshipPenaltyMultiplier: 8,
      graphMissRateBase: 0.1,
      graphRelationshipBonusMultiplier: 0.05,
    };
    const adaptiveOnRelational = runSimulation(
      configWithRetriever({ ...shared, mode: "adaptive" }, { relationshipQueryRate: 1 })
    );
    const pipelineOnRelational = runSimulation(
      configWithRetriever({ ...shared, mode: "pipeline" }, { relationshipQueryRate: 1 })
    );
    // Adaptive should behave like graphrag here, not like pipeline — its
    // success rate should track graphrag's clear advantage on this traffic.
    expect(adaptiveOnRelational.metrics.successRate).toBeGreaterThan(
      pipelineOnRelational.metrics.successRate
    );
  });

  it("agentic mode costs more latency on average than pipeline when queries need multiple attempts", () => {
    const shared = { missRate: 0.6, processingJitterMs: 0 };
    const pipeline = runSimulation(configWithRetriever({ ...shared, mode: "pipeline" }));
    const agentic = runSimulation(
      configWithRetriever({ ...shared, mode: "agentic", maxRetrievalAttempts: 4, critiqueOverheadMs: 30 })
    );
    expect(agentic.metrics.averageLatency).toBeGreaterThan(pipeline.metrics.averageLatency);
  });

  it("queues and eventually rejects once maxConcurrent + maxQueueLength is exceeded under load", () => {
    const result = runSimulation(
      configWithRetriever(
        { maxConcurrent: 1, maxQueueLength: 1, processingTimeMs: 100, processingJitterMs: 0 },
        {},
        {
          scenario: {
            id: "retriever-overload",
            title: "Retriever Overload",
            trafficPattern: { type: "constant", rate: 100 },
            durationMs: 3000,
          },
        }
      )
    );
    expect(result.events.some((e) => e.type === "QUEUE_FULL")).toBe(true);
  });
});
