/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import { CATCH_ALL_ROUTE } from "../entities/ReverseProxy";
import { ROUTE_LABELS } from "../engine/TrafficGenerator";
import type { SimulationConfig } from "../types";

function configWithProxy(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    entities: [
      {
        id: "client1",
        type: "client",
        position: { x: 0, y: 0 },
        config: { requestRate: 50, routePoolSize: 2 },
      },
      {
        id: "proxy1",
        type: "reverse_proxy",
        position: { x: 0, y: 0 },
        config: {
          routes: { orders1: ROUTE_LABELS[0], users1: ROUTE_LABELS[1] },
        },
      },
      { id: "orders1", type: "api", position: { x: 0, y: 0 }, config: {} },
      { id: "users1", type: "api", position: { x: 0, y: 0 }, config: {} },
      { id: "ordersDb1", type: "database", position: { x: 0, y: 0 }, config: {} },
      { id: "usersDb1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "proxy1", latencyMs: 2 },
      { source: "proxy1", target: "orders1", latencyMs: 1 },
      { source: "proxy1", target: "users1", latencyMs: 1 },
      { source: "orders1", target: "ordersDb1", latencyMs: 1 },
      { source: "users1", target: "usersDb1", latencyMs: 1 },
    ],
    scenario: {
      id: "proxy-test",
      title: "Reverse Proxy Test",
      trafficPattern: { type: "constant", rate: 50 },
      durationMs: 4000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("ReverseProxy (through the full Simulator)", () => {
  it("routes each request to the target that owns its route, never the other target", () => {
    const result = runSimulation(configWithProxy());
    const ordersStarts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "orders1"
    ).length;
    const usersStarts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "users1"
    ).length;

    expect(ordersStarts).toBeGreaterThan(0);
    expect(usersStarts).toBeGreaterThan(0);

    // With only these two routes configured and Route Pool Size 2, every
    // dispatch from the proxy should land on exactly one of them.
    const dispatched = result.events.filter(
      (e) =>
        e.type === "REQUEST_ROUTED" && e.source === "proxy1" && e.metadata.direction === "request"
    ).length;
    const ordersDispatched = result.events.filter(
      (e) => e.type === "REQUEST_ROUTED" && e.source === "proxy1" && e.destination === "orders1"
    ).length;
    const usersDispatched = result.events.filter(
      (e) => e.type === "REQUEST_ROUTED" && e.source === "proxy1" && e.destination === "users1"
    ).length;
    expect(dispatched).toBe(ordersDispatched + usersDispatched);
  });

  it("keeps requests succeeding end-to-end through the proxy", () => {
    const result = runSimulation(configWithProxy());
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
  });

  it("exposes a per-target routing distribution, same shape as Load Balancer's", () => {
    const result = runSimulation(configWithProxy());
    const distribution = result.metrics.entityMetrics.proxy1.routingDistribution;
    expect(distribution).toBeDefined();
    expect(distribution!.map((d) => d.targetId).sort()).toEqual(["orders1", "users1"]);
  });

  it("fails a request whose route matches nothing, with no client-facing collateral damage", () => {
    const result = runSimulation(
      configWithProxy({
        entities: [
          {
            id: "client1",
            type: "client",
            position: { x: 0, y: 0 },
            config: { requestRate: 50, routePoolSize: 3 },
          },
          {
            id: "proxy1",
            type: "reverse_proxy",
            position: { x: 0, y: 0 },
            // Only the first route is claimed; routePoolSize 3 also
            // generates the second and third labels.
            config: { routes: { orders1: ROUTE_LABELS[0] } },
          },
          { id: "orders1", type: "api", position: { x: 0, y: 0 }, config: {} },
          { id: "ordersDb1", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
        connections: [
          { source: "client1", target: "proxy1", latencyMs: 2 },
          { source: "proxy1", target: "orders1", latencyMs: 1 },
          { source: "orders1", target: "ordersDb1", latencyMs: 1 },
        ],
      })
    );

    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const reasons = result.events
      .filter((e) => e.type === "REQUEST_FAILED")
      .map((e) => e.metadata.reason);
    expect(reasons).toContain("no_matching_route");

    // The claimed route still completes successfully — a missing route
    // elsewhere doesn't take down traffic for a route that IS configured.
    const ordersCompletions = result.events.filter(
      (e) => e.type === "REQUEST_COMPLETED" && e.destination === "client1"
    ).length;
    expect(ordersCompletions).toBeGreaterThan(0);
  });

  it("sends every unmatched route to the catch-all target once one is configured", () => {
    const result = runSimulation(
      configWithProxy({
        entities: [
          {
            id: "client1",
            type: "client",
            position: { x: 0, y: 0 },
            config: { requestRate: 50, routePoolSize: 3 },
          },
          {
            id: "proxy1",
            type: "reverse_proxy",
            position: { x: 0, y: 0 },
            config: { routes: { orders1: ROUTE_LABELS[0], fallback1: CATCH_ALL_ROUTE } },
          },
          { id: "orders1", type: "api", position: { x: 0, y: 0 }, config: {} },
          { id: "fallback1", type: "api", position: { x: 0, y: 0 }, config: {} },
          { id: "ordersDb1", type: "database", position: { x: 0, y: 0 }, config: {} },
          { id: "fallbackDb1", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
        connections: [
          { source: "client1", target: "proxy1", latencyMs: 2 },
          { source: "proxy1", target: "orders1", latencyMs: 1 },
          { source: "proxy1", target: "fallback1", latencyMs: 1 },
          { source: "orders1", target: "ordersDb1", latencyMs: 1 },
          { source: "fallback1", target: "fallbackDb1", latencyMs: 1 },
        ],
      })
    );

    expect(result.metrics.failedRequests).toBe(0);
    const fallbackStarts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "fallback1"
    ).length;
    const ordersStarts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "orders1"
    ).length;
    // routePoolSize 3 generates two routes orders1 doesn't own — all of
    // that traffic should land on the catch-all instead of failing.
    expect(fallbackStarts).toBeGreaterThan(0);
    expect(ordersStarts).toBeGreaterThan(0);
  });

  it("fails gracefully when it has no downstream connection at all", () => {
    const config: SimulationConfig = {
      entities: [
        { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
        { id: "proxy1", type: "reverse_proxy", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [{ source: "client1", target: "proxy1", latencyMs: 1 }],
      scenario: {
        id: "no-downstream",
        title: "No Downstream",
        trafficPattern: { type: "constant", rate: 20 },
        durationMs: 1000,
      },
      options: { seed: 1 },
    };

    const result = runSimulation(config);
    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const reasons = result.events
      .filter((e) => e.type === "REQUEST_FAILED")
      .map((e) => e.metadata.reason);
    expect(reasons).toContain("no_downstream_connection");
  });

  it("a misconfigured target (route outside the client's actual pool) receives zero traffic, not an error", () => {
    const result = runSimulation(
      configWithProxy({
        entities: [
          {
            id: "client1",
            type: "client",
            position: { x: 0, y: 0 },
            // Only ever generates ROUTE_LABELS[0] and [1].
            config: { requestRate: 50, routePoolSize: 2 },
          },
          {
            id: "proxy1",
            type: "reverse_proxy",
            position: { x: 0, y: 0 },
            config: {
              routes: { orders1: ROUTE_LABELS[0], ghost1: ROUTE_LABELS[5] },
            },
          },
          { id: "orders1", type: "api", position: { x: 0, y: 0 }, config: {} },
          { id: "ghost1", type: "api", position: { x: 0, y: 0 }, config: {} },
        ],
        connections: [
          { source: "client1", target: "proxy1", latencyMs: 2 },
          { source: "proxy1", target: "orders1", latencyMs: 1 },
          { source: "proxy1", target: "ghost1", latencyMs: 1 },
        ],
      })
    );

    const ghostStarts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "ghost1"
    ).length;
    expect(ghostStarts).toBe(0);
    expect(result.metrics.entityMetrics.ghost1.errorCount).toBe(0);
  });

  it("when two targets claim the same route, connection order decides deterministically", () => {
    const config: SimulationConfig = configWithProxy({
      entities: [
        {
          id: "client1",
          type: "client",
          position: { x: 0, y: 0 },
          config: { requestRate: 50, routePoolSize: 1 },
        },
        {
          id: "proxy1",
          type: "reverse_proxy",
          position: { x: 0, y: 0 },
          config: { routes: { first1: ROUTE_LABELS[0], second1: ROUTE_LABELS[0] } },
        },
        { id: "first1", type: "api", position: { x: 0, y: 0 }, config: {} },
        { id: "second1", type: "api", position: { x: 0, y: 0 }, config: {} },
      ],
      connections: [
        { source: "client1", target: "proxy1", latencyMs: 2 },
        { source: "proxy1", target: "first1", latencyMs: 1 },
        { source: "proxy1", target: "second1", latencyMs: 1 },
      ],
    });

    const result = runSimulation(config);
    const firstStarts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "first1"
    ).length;
    const secondStarts = result.events.filter(
      (e) => e.type === "PROCESSING_STARTED" && e.source === "second1"
    ).length;

    expect(firstStarts).toBeGreaterThan(0);
    expect(secondStarts).toBe(0);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithProxy());
    const b = runSimulation(configWithProxy());
    expect(a.events).toEqual(b.events);
  });
});
