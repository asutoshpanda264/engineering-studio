/**
 * Public Transit Tracker API — pure capacity sizing, difficulty 3,
 * "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts). Same lesson as
 * weatherForecastApi.ts (difficulty 2), one notch harder — a fresh
 * story, tighter numbers, no cache/nosql/queue lever needed.
 *
 * Verified against the real engine (seed 1110, 10s @ 430 req/s) via a
 * throwaway tuning script (deleted after use), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms):
 *     82.3% success, p95 340ms, $715/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   Adequate, properly sized (API 15/5ms, DB 22conn/10ms):
 *     100% success, p95 35ms, $852/mo → gatesPassed=true, composite
 *     0.518, 2★.
 *   Tightened (API 6/2ms, DB 7conn/4ms):
 *     100% success, p95 23ms, $771/mo → gatesPassed=true, composite
 *     0.605, 2★.
 *   Lazy overprovisioning (a UI-unreachable value):
 *     100% success, p95 35ms, $1,978/mo → clears the metric constraints
 *     fine but wildly over budget.
 *
 * `optimalSolution` is the tightened build (composite 0.605, 2★).
 */

import type { Scenario } from "./types";

export const publicTransitTrackerApi: Scenario = {
  id: "public-transit-tracker-api",
  title: "Public Transit Tracker API",
  difficulty: 3,
  topics: ["system-design"],
  story:
    "A city's public transit app shows real-time bus and train positions — commuters checking " +
    "constantly whether their ride is on time, all day, every day. There's no obviously hot " +
    "key to cache, no burst pattern to smooth out, no write-heavy volume that favors a " +
    "different database type — just a steady stream of requests that needs to be served " +
    "correctly, calculated for the actual traffic, not guessed at.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 430 },
    },
    {
      id: "api",
      type: "api",
      label: "API Server",
      position: { x: 400, y: 200 },
      config: {},
    },
    {
      id: "db",
      type: "database",
      label: "Database",
      position: { x: 720, y: 200 },
      config: {},
    },
  ],
  startingConnections: [
    { source: "client", target: "api" },
    { source: "api", target: "db" },
  ],
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate"] },
  budgetUsd: 900,

  trafficPattern: { type: "constant", rate: 430 },
  durationMs: 10_000,
  seed: 1110,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.97,
      label: "At least 97% of position checks succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 70,
      label: "95% of checks complete within 70ms",
      unit: "ms",
    },
  ],

  hints: [
    "The Client's request rate is fixed at 430 req/s. What's a default API Server and Database's own raw throughput ceiling, at their default settings?",
    "Most requests eventually succeed even when the ceiling is too low — so if success rate looks acceptable, what's actually failing?",
    "Is there a cheaper way to hit the same latency bar than just cranking every dial as high as it'll go?",
  ],

  learningGoals: [
    "A connection pool's throughput ceiling is connections × (1000 / processing time) — a number you calculate, not one that takes care of itself at default settings.",
    "Success rate alone doesn't tell the whole story — a backend can eventually process almost everything and still fail a real latency bar under queueing delay.",
    "Budget makes 'just add more capacity' a real tradeoff — the same latency bar is reachable at wildly different costs.",
  ],

  optimalSolution: {
    summary:
      "A deliberately, modestly sized API Server and Database — no cache, no special database " +
      "type, no queue. Just enough capacity to clear the latency bar, no more.",
    editorial: [
      "This traffic doesn't have a hidden trick — no hot key, no burst, no write-heavy volume. " +
        "It's the most basic version of the lesson every other scenario in this catalogue " +
        "builds on: calculate the ceiling correctly.",
      "A default API Server and Database's raw throughput ceiling sits right at the edge of " +
        "what 430 req/s demands, so even though most requests eventually get a response, the " +
        "queueing delay is enough to blow a real latency bar.",
      "Fixing it doesn't require anything exotic — raising the Database's connection count and " +
        "the API Server's own concurrency a modest amount clears both constraints comfortably, " +
        "well within budget.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 430 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 400, y: 200 },
        config: { maxConcurrent: 6, maxQueueLength: 50, processingTimeMs: 2 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 720, y: 200 },
        config: { maxConnections: 7, maxQueueLength: 50, processingTimeMs: 4 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "db" },
    ],
  },
};
