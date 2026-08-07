/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { runSimulation } from "../engine/Simulator";
import type { RateLimiterAlgorithm } from "../entities/RateLimiter";
import type { SimulationConfig } from "../types";

function configWithRateLimiter(
  algorithm: RateLimiterAlgorithm,
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    entities: [
      { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
      {
        id: "rl1",
        type: "rate_limiter",
        position: { x: 0, y: 0 },
        config: { algorithm, requestsPerSecond: 20, burstCapacity: 20 },
      },
      // Database, not APIServer: APIServer always forwards its "request"
      // leg deeper (to whatever's behind it) and only answers once that
      // comes back — it's never itself a terminal responder. Database is.
      { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
    ],
    connections: [
      { source: "client1", target: "rl1", latencyMs: 1 },
      { source: "rl1", target: "db1", latencyMs: 1 },
    ],
    scenario: {
      id: "rate-limiter-test",
      title: "Rate Limiter Test",
      trafficPattern: { type: "constant", rate: 10 },
      durationMs: 3000,
    },
    options: { seed: 42 },
    ...overrides,
  };
}

describe("RateLimiter", () => {
  it("admits essentially everything under smooth traffic at or under the configured rate", () => {
    for (const algorithm of ["token_bucket", "sliding_window"] as const) {
      const result = runSimulation(configWithRateLimiter(algorithm));
      const rateLimiter = result.metrics.entityMetrics.rl1.rateLimiter!;
      expect(rateLimiter.rejected).toBe(0);
      expect(rateLimiter.admitted).toBeGreaterThan(0);
    }
  });

  it("rejects the excess once sustained traffic exceeds the configured rate, for both algorithms", () => {
    for (const algorithm of ["token_bucket", "sliding_window"] as const) {
      const result = runSimulation(
        configWithRateLimiter(algorithm, {
          scenario: {
            id: "over-rate",
            title: "Over Rate",
            trafficPattern: { type: "constant", rate: 100 },
            durationMs: 3000,
          },
        })
      );
      const rateLimiter = result.metrics.entityMetrics.rl1.rateLimiter!;
      expect(rateLimiter.rejected).toBeGreaterThan(0);
      expect(rateLimiter.admitted).toBeGreaterThan(0);

      const rejectedEvents = result.events.filter((e) => e.type === "RATE_LIMIT_EXCEEDED");
      expect(rejectedEvents.length).toBe(rateLimiter.rejected);
      const failedEvents = result.events.filter((e) => e.type === "REQUEST_FAILED");
      expect(
        failedEvents.some((e) => e.metadata.reason === "rate_limit_exceeded")
      ).toBe(true);

      // Regression: RATE_LIMIT_EXCEEDED and its companion REQUEST_FAILED
      // share the same source (rl1) — errorCount must count each
      // rejection once, not twice.
      expect(result.metrics.entityMetrics.rl1.errorCount).toBe(rateLimiter.rejected);
    }
  });

  it("token bucket admits a burst that sliding window mostly rejects, once idle capacity has accumulated", () => {
    // A single tight burst of 40 requests inside the first 10ms.
    // requestsPerSecond is deliberately low (10) and burstCapacity high
    // (35 — starting full): token bucket can pay for most of the burst
    // up front out of that reserve, while sliding window has no such
    // reserve — it never admits more than requestsPerSecond within any
    // trailing second, no matter how idle it was beforehand.
    function burstConfig(algorithm: RateLimiterAlgorithm): SimulationConfig {
      return {
        entities: [
          { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
          {
            id: "rl1",
            type: "rate_limiter",
            position: { x: 0, y: 0 },
            config: { algorithm, requestsPerSecond: 10, burstCapacity: 35 },
          },
          { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
        ],
        connections: [
          { source: "client1", target: "rl1", latencyMs: 1 },
          { source: "rl1", target: "db1", latencyMs: 1 },
        ],
        scenario: {
          id: "burst",
          title: "Burst",
          trafficPattern: { type: "burst", rate: 40, interval: 3000, duration: 10 },
          durationMs: 3000,
        },
        options: { seed: 42 },
      };
    }

    const tokenBucket = runSimulation(burstConfig("token_bucket"));
    const slidingWindow = runSimulation(burstConfig("sliding_window"));

    const tokenBucketAdmitted = tokenBucket.metrics.entityMetrics.rl1.rateLimiter!.admitted;
    const slidingWindowAdmitted = slidingWindow.metrics.entityMetrics.rl1.rateLimiter!.admitted;

    expect(tokenBucketAdmitted).toBeGreaterThan(slidingWindowAdmitted);
    expect(tokenBucketAdmitted).toBeGreaterThanOrEqual(35); // burstCapacity plus refill during the 10ms window
    expect(slidingWindowAdmitted).toBeLessThanOrEqual(11); // requestsPerSecond, +/-1 for the window boundary
  });

  it("fails gracefully when it has no downstream connection", () => {
    const config = configWithRateLimiter("token_bucket", {
      connections: [{ source: "client1", target: "rl1", latencyMs: 1 }],
    });
    const result = runSimulation(config);

    expect(result.metrics.failedRequests).toBeGreaterThan(0);
    const failedEvents = result.events.filter((e) => e.type === "REQUEST_FAILED");
    expect(
      failedEvents.some((e) => e.metadata.reason === "no_downstream_connection")
    ).toBe(true);
  });

  it("keeps admitted requests succeeding end-to-end through the rate limiter", () => {
    const result = runSimulation(configWithRateLimiter("token_bucket"));
    expect(result.metrics.successRate).toBeGreaterThan(0.95);
  });

  it("is deterministic for a given seed", () => {
    const a = runSimulation(configWithRateLimiter("sliding_window"));
    const b = runSimulation(configWithRateLimiter("sliding_window"));
    expect(a.events).toEqual(b.events);
  });
});
