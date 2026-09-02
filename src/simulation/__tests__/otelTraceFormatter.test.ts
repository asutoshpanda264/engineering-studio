/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import { formatOtelTraces } from "../playback/otelTraceFormatter";
import type { EntityType, SimulationConfig } from "../types";

function toolUseConfig(): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 5 } },
      {
        id: "llm1",
        type: "llm_call",
        position: { x: 0, y: 0 },
        config: { hallucinationRate: 0, schemaFailureRate: 0, promptInjectionRate: 0, tier: "slm", quantization: "int4" },
      },
      {
        id: "tool1",
        type: "tool_call",
        position: { x: 0, y: 0 },
        config: { failureRate: 0, schemaFailureRate: 0, hallucinatedInvocationRate: 0, silentFailureRate: 0 },
      },
    ],
    connections: [
      { source: "client1", target: "llm1", latencyMs: 1 },
      { source: "llm1", target: "tool1", latencyMs: 1 },
    ],
    scenario: {
      id: "otel-tool-use-test",
      title: "OTel Tool Use Test",
      trafficPattern: { type: "constant", rate: 5 },
      durationMs: 1000,
    },
    options: { seed: 7 },
  };
}

function entityLookups(config: SimulationConfig) {
  const entityTypes: Record<string, EntityType> = {};
  const entityLabels: Record<string, string> = {};
  const entityConfigs: Record<string, Record<string, unknown>> = {};
  for (const entity of config.entities) {
    entityTypes[entity.id] = entity.type;
    entityLabels[entity.id] = entity.id;
    entityConfigs[entity.id] = entity.config;
  }
  return { entityTypes, entityLabels, entityConfigs };
}

describe("formatOtelTraces", () => {
  it("nests a chat span and an execute_tool span under a synthesized root for a simple Tool Use chain", () => {
    const config = toolUseConfig();
    const result = runSimulation(config);
    const { entityTypes, entityLabels, entityConfigs } = entityLookups(config);
    const traces = formatOtelTraces(result.events, entityTypes, entityLabels, entityConfigs);

    expect(traces.length).toBeGreaterThan(0);
    const trace = traces[0];
    expect(trace.rootSpan.children.length).toBeGreaterThan(0);

    const names = trace.rootSpan.children.map((s) => s.name);
    expect(names).toContain("chat");
    expect(names).toContain("execute_tool");

    const chatSpan = trace.rootSpan.children.find((s) => s.name === "chat");
    expect(chatSpan?.attributes["gen_ai.operation.name"]).toBe("chat");
    expect(chatSpan?.attributes["gen_ai.request.model"]).toBe("slm-int4");
    expect(chatSpan?.attributes["llm.quantization"]).toBe("int4");
  });

  it("uses a real agent_orchestrator span as the root instead of a synthetic one", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 5 } },
        {
          id: "orch1",
          type: "agent_orchestrator",
          position: { x: 0, y: 0 },
          config: { routingMode: "sequential", maxConcurrent: 20 },
        },
        {
          id: "tool1",
          type: "tool_call",
          position: { x: 0, y: 0 },
          config: { failureRate: 0, schemaFailureRate: 0, hallucinatedInvocationRate: 0, silentFailureRate: 0 },
        },
      ],
      connections: [
        { source: "client1", target: "orch1", latencyMs: 1 },
        { source: "orch1", target: "tool1", latencyMs: 1 },
      ],
      scenario: {
        id: "otel-orchestrator-test",
        title: "OTel Orchestrator Test",
        trafficPattern: { type: "constant", rate: 5 },
        durationMs: 1000,
      },
      options: { seed: 7 },
    };
    const result = runSimulation(config);
    const { entityTypes, entityLabels, entityConfigs } = entityLookups(config);
    const traces = formatOtelTraces(result.events, entityTypes, entityLabels, entityConfigs);

    const trace = traces[0];
    expect(trace.rootSpan.name).toBe("invoke_agent");
    expect(trace.rootSpan.entityId).toBe("orch1");
    expect(trace.rootSpan.attributes["agent.routing_mode"]).toBe("sequential");
    expect(trace.rootSpan.children.some((s) => s.name === "execute_tool")).toBe(true);
  });

  it("flags a trace compromised when a silent tool failure occurred, even though the request completed", () => {
    const config = toolUseConfig();
    config.entities = config.entities.map((e) =>
      e.id === "tool1" ? { ...e, config: { ...e.config, silentFailureRate: 1 } } : e
    );
    const result = runSimulation(config);
    const { entityTypes, entityLabels, entityConfigs } = entityLookups(config);
    const traces = formatOtelTraces(result.events, entityTypes, entityLabels, entityConfigs);

    const trace = traces[0];
    expect(trace.outcome).toBe("completed");
    expect(trace.compromised).toBe(true);
    expect(trace.compromiseReason).toBe("silent_tool_failure");
  });

  it("marks only the span that actually failed as an error, not every span relaying the response", () => {
    const config = toolUseConfig();
    config.entities = config.entities.map((e) =>
      e.id === "tool1" ? { ...e, config: { ...e.config, failureRate: 1 } } : e
    );
    const result = runSimulation(config);
    const { entityTypes, entityLabels, entityConfigs } = entityLookups(config);
    const traces = formatOtelTraces(result.events, entityTypes, entityLabels, entityConfigs);

    const trace = traces[0];
    expect(trace.outcome).toBe("failed");
    const toolSpan = trace.rootSpan.children.find((s) => s.name === "execute_tool");
    expect(toolSpan?.status).toBe("error");
    expect(toolSpan?.errorReason).toBe("tool_call_failed");
    // llm_call is visited twice (the request leg's dispatch, and the
    // response leg relaying tool_call's failure back to the client) —
    // neither of its own spans actually failed, it only forwarded the
    // request and then passed an already-failed response through.
    const chatSpans = trace.rootSpan.children.filter((s) => s.name === "chat");
    expect(chatSpans.length).toBe(2);
    expect(chatSpans.every((s) => s.status === "ok")).toBe(true);
  });
});
