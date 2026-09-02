/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

const RELIABLE_TOOL = { failureRate: 0, schemaFailureRate: 0, processingTimeMs: 20, processingJitterMs: 0 };

function sequentialConfig(
  orchestratorConfig: Record<string, unknown> = {},
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      {
        id: "orch1",
        type: "agent_orchestrator",
        position: { x: 0, y: 0 },
        config: { routingMode: "sequential", maxConcurrent: 20, ...orchestratorConfig },
      },
      { id: "tool1", type: "tool_call", position: { x: 0, y: 0 }, config: RELIABLE_TOOL },
      { id: "tool2", type: "tool_call", position: { x: 0, y: 0 }, config: RELIABLE_TOOL },
    ],
    connections: [
      { source: "client1", target: "orch1", latencyMs: 1 },
      { source: "orch1", target: "tool1", latencyMs: 1 },
      { source: "orch1", target: "tool2", latencyMs: 1 },
    ],
    scenario: {
      id: "orch-sequential-test",
      title: "Orchestrator Sequential",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 3000,
    },
    options: { seed: 21 },
    ...overrides,
  };
}

function parallelConfig(
  orchestratorConfig: Record<string, unknown> = {},
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
      {
        id: "orch1",
        type: "agent_orchestrator",
        position: { x: 0, y: 0 },
        config: { routingMode: "parallel", maxConcurrent: 20, ...orchestratorConfig },
      },
      { id: "tool1", type: "tool_call", position: { x: 0, y: 0 }, config: RELIABLE_TOOL },
      { id: "tool2", type: "tool_call", position: { x: 0, y: 0 }, config: RELIABLE_TOOL },
    ],
    connections: [
      { source: "client1", target: "orch1", latencyMs: 1 },
      { source: "orch1", target: "tool1", latencyMs: 1 },
      { source: "orch1", target: "tool2", latencyMs: 1 },
    ],
    scenario: {
      id: "orch-parallel-test",
      title: "Orchestrator Parallel",
      trafficPattern: { type: "constant", rate: 20 },
      durationMs: 3000,
    },
    options: { seed: 21 },
    ...overrides,
  };
}

describe("AgentOrchestrator — sequential (Planning)", () => {
  it("is deterministic for a given seed", () => {
    const a = runSimulation(sequentialConfig());
    const b = runSimulation(sequentialConfig());
    expect(a.events).toEqual(b.events);
  });

  it("visits both downstream targets in order and completes successfully", () => {
    const result = runSimulation(sequentialConfig());
    expect(result.metrics.successRate).toBeCloseTo(1, 1);
    expect(result.metrics.entityMetrics["tool1"].requestCount).toBeGreaterThan(0);
    expect(result.metrics.entityMetrics["tool2"].requestCount).toBeGreaterThan(0);
  });

  it("dispatches steps staggered in time, not simultaneously", () => {
    const result = runSimulation(sequentialConfig());
    const tool1Start = result.events.find(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "tool1"
    )?.timestamp;
    const tool2Start = result.events.find(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "tool2"
    )?.timestamp;
    expect(tool1Start).toBeDefined();
    expect(tool2Start).toBeDefined();
    expect(tool2Start!).toBeGreaterThan(tool1Start!);
  });

  it("retries a failed step in place, up to maxIterations, before giving up", () => {
    const result = runSimulation(
      sequentialConfig({ maxIterations: 3 }, {
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
          {
            id: "orch1",
            type: "agent_orchestrator",
            position: { x: 0, y: 0 },
            config: { routingMode: "sequential", maxConcurrent: 20, maxIterations: 3 },
          },
          { id: "tool1", type: "tool_call", position: { x: 0, y: 0 }, config: { ...RELIABLE_TOOL, failureRate: 1 } },
        ],
        connections: [
          { source: "client1", target: "orch1", latencyMs: 1 },
          { source: "orch1", target: "tool1", latencyMs: 1 },
        ],
      })
    );
    // Every logical request retries exactly 3 times against the
    // always-failing tool before the orchestrator gives up — tool1's own
    // requestCount should run roughly 3x totalRequests, not 1x.
    expect(result.metrics.entityMetrics["tool1"].requestCount).toBeGreaterThanOrEqual(
      result.metrics.totalRequests * 2.5
    );
    const failure = result.events.find((e) => e.type === "REQUEST_FAILED");
    expect(failure?.metadata.reason).toBe("iteration_limit_exceeded");
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
  });

  it("is safe to end a chain on — no downstream, still responds", () => {
    const result = runSimulation(
      sequentialConfig(
        {},
        {
          entities: [
            { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
            { id: "orch1", type: "agent_orchestrator", position: { x: 0, y: 0 }, config: {} },
          ],
          connections: [{ source: "client1", target: "orch1", latencyMs: 1 }],
        }
      )
    );
    expect(result.metrics.successRate).toBeCloseTo(1, 1);
  });
});

describe("AgentOrchestrator — parallel (Orchestrator-Worker)", () => {
  it("is deterministic for a given seed", () => {
    const a = runSimulation(parallelConfig());
    const b = runSimulation(parallelConfig());
    expect(a.events).toEqual(b.events);
  });

  it("dispatches to both downstream targets at the identical timestamp", () => {
    const result = runSimulation(parallelConfig());
    const tool1Start = result.events.find(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "tool1"
    )?.timestamp;
    const tool2Start = result.events.find(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "tool2"
    )?.timestamp;
    expect(tool1Start).toBeDefined();
    expect(tool1Start).toBe(tool2Start);
  });

  it("waits for every worker and completes successfully once all report back", () => {
    const result = runSimulation(parallelConfig());
    expect(result.metrics.successRate).toBeCloseTo(1, 1);
    expect(result.metrics.entityMetrics["tool1"].requestCount).toBeGreaterThan(0);
    expect(result.metrics.entityMetrics["tool2"].requestCount).toBeGreaterThan(0);
  });

  it("fails the whole session when one worker's retries are exhausted, even if the other succeeded", () => {
    const result = runSimulation(
      parallelConfig(
        { maxIterations: 1 },
        {
          entities: [
            { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
            {
              id: "orch1",
              type: "agent_orchestrator",
              position: { x: 0, y: 0 },
              config: { routingMode: "parallel", maxConcurrent: 20, maxIterations: 1 },
            },
            { id: "tool1", type: "tool_call", position: { x: 0, y: 0 }, config: RELIABLE_TOOL },
            { id: "tool2", type: "tool_call", position: { x: 0, y: 0 }, config: { ...RELIABLE_TOOL, failureRate: 1 } },
          ],
          connections: [
            { source: "client1", target: "orch1", latencyMs: 1 },
            { source: "orch1", target: "tool1", latencyMs: 1 },
            { source: "orch1", target: "tool2", latencyMs: 1 },
          ],
        }
      )
    );
    expect(result.metrics.successRate).toBeCloseTo(0, 1);
    // tool1 (the reliable one) still ran exactly once per request — its
    // own success isn't what determined the outcome.
    expect(result.metrics.entityMetrics["tool1"].requestCount).toBeCloseTo(
      result.metrics.totalRequests,
      -1
    );
  });

  it("queues and eventually rejects once maxConcurrent + maxQueueLength is exceeded under load", () => {
    const result = runSimulation(
      parallelConfig({ maxConcurrent: 1, maxQueueLength: 1 }, {
        scenario: {
          id: "orch-overload",
          title: "Orchestrator Overload",
          trafficPattern: { type: "constant", rate: 100 },
          durationMs: 2000,
        },
      })
    );
    expect(result.events.some((e) => e.type === "QUEUE_FULL")).toBe(true);
  });
});

describe("AgentOrchestrator — Multi-Agent Collaboration (2 peers)", () => {
  function twoOrchestratorConfig(): SimulationConfig {
    return {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 20 } },
        {
          id: "orchA",
          type: "agent_orchestrator",
          position: { x: 0, y: 0 },
          config: { routingMode: "sequential", maxConcurrent: 20 },
        },
        {
          id: "orchB",
          type: "agent_orchestrator",
          position: { x: 0, y: 0 },
          config: { routingMode: "parallel", maxConcurrent: 20 },
        },
        { id: "tool1", type: "tool_call", position: { x: 0, y: 0 }, config: RELIABLE_TOOL },
        { id: "tool2", type: "tool_call", position: { x: 0, y: 0 }, config: RELIABLE_TOOL },
      ],
      connections: [
        { source: "client1", target: "orchA", latencyMs: 1 },
        { source: "orchA", target: "orchB", latencyMs: 1 },
        { source: "orchB", target: "tool1", latencyMs: 1 },
        { source: "orchB", target: "tool2", latencyMs: 1 },
      ],
      scenario: {
        id: "multi-agent-test",
        title: "Multi-Agent Collaboration",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 3000,
      },
      options: { seed: 33 },
    };
  }

  it("hands a task from one orchestrator to another as a peer and completes the full round trip", () => {
    const result = runSimulation(twoOrchestratorConfig());
    expect(result.metrics.successRate).toBeCloseTo(1, 1);
    expect(result.metrics.entityMetrics["orchA"].requestCount).toBeGreaterThan(0);
    expect(result.metrics.entityMetrics["orchB"].requestCount).toBeGreaterThan(0);
    expect(result.metrics.entityMetrics["tool1"].requestCount).toBeGreaterThan(0);
    expect(result.metrics.entityMetrics["tool2"].requestCount).toBeGreaterThan(0);
  });

  it("records the full path through both orchestrators on the hop into the workers", () => {
    const result = runSimulation(twoOrchestratorConfig());
    const dispatchToWorker = result.events.find(
      (e) => e.type === "REQUEST_ROUTED" && e.destination === "tool1" && e.metadata.direction === "request"
    );
    expect(dispatchToWorker?.metadata.path).toEqual(["client1", "orchA", "orchB"]);
  });
});
