/**
 * Ride-Hailing Location Pings — database-type-required, difficulty 3,
 * "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts). Same database-type lesson as
 * iotSensorIngestion.ts (difficulty 2), one notch harder — higher
 * traffic, tighter latency, and a properly-sized SQL build misses budget
 * by a wider, more decisive margin.
 *
 * Verified against the real engine (seed 1030, 8s @ 430 req/s,
 * keyPoolSize 1000 — large and locked, so a Cache can't cheaply dominate
 * this) via a throwaway tuning script (deleted after use), using the
 * real `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB sql/5conn/15ms):
 *     80.1% success, p95 340ms, $725/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   Adequate, properly-sized SQL (API 15/5ms, DB sql/28conn/10ms):
 *     100% success, p95 35ms, $874/mo → clears both metric constraints
 *     but $874 > $780 budget.
 *   NoSQL, tightened (API 4/1ms, DB nosql/3conn/1ms):
 *     100% success, p95 16ms, $764/mo → gatesPassed=true, composite
 *     0.620, 2★ — NoSQL's multiplier lets a much smaller (cheaper-tier)
 *     pool clear the same ceiling SQL needs a bigger, pricier pool for.
 *   Lazy overprovisioning, SQL (API 150/5ms, DB sql/150conn/10ms — a
 *   UI-unreachable value):
 *     100% success, p95 35ms, $2,000/mo → wildly over budget.
 *
 * `optimalSolution` is the NoSQL build (composite 0.620, 2★).
 */

import type { Scenario } from "./types";

export const rideHailingLocationPings: Scenario = {
  id: "ride-hailing-location-pings",
  title: "Ride-Hailing Location Pings",
  difficulty: 3,
  topics: ["system-design"],
  story:
    "Every active driver's app phones home with a GPS ping every couple of seconds — pure " +
    "write volume, spread across thousands of independent drivers, with nothing here that " +
    "repeats often enough for a cache to help. Engineering's job is to make sure every ping " +
    "actually lands, on a budget that scales sanely with fleet size instead of linearly with " +
    "however many connections the database happens to have.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 430, keyPoolSize: 1000 },
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
  lockedFields: { client: ["requestRate", "keyPoolSize"] },
  budgetUsd: 780,

  trafficPattern: { type: "constant", rate: 430 },
  durationMs: 8_000,
  seed: 1030,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.97,
      label: "At least 97% of location pings are written",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 100,
      label: "95% of writes complete within 100ms",
      unit: "ms",
    },
  ],

  hints: [
    "Thousands of independent drivers, each pinging their own location — nothing here is a good candidate for a cache. What else determines how much a database can absorb?",
    "A properly-sized SQL database can clear both the success-rate and latency bars here. Check what it costs against the budget.",
    "The Database entity has a `type` field. What does switching it actually change, and does it cost anything extra?",
  ],

  learningGoals: [
    "Not every high-volume workload is a caching problem — pure write traffic across a huge key space gives a cache nothing to exploit.",
    "A database's `type` (SQL vs NoSQL) changes its effective connection ceiling and per-query time at no extra cost — picking the right one can be the difference between clearing a budget and blowing it.",
    "Two builds can both be functionally correct — the deciding factor is often which one the budget actually allows.",
  ],

  optimalSolution: {
    summary:
      "A NoSQL-type database, tightly sized — its connection-ceiling and query-time multiplier " +
      "clears the same write volume a much larger SQL pool would need, at a fraction of the " +
      "cost.",
    editorial: [
      "This traffic doesn't repeat — thousands of drivers, each writing their own location, " +
        "means there's no hot key for a cache to exploit.",
      "A properly-sized SQL database clears the success-rate and latency bars just fine " +
        "functionally. The problem is purely cost: reaching that same throughput ceiling with a " +
        "SQL connection pool costs more than the budget allows.",
      "Switching the Database's own `type` to NoSQL applies a real connection-ceiling and " +
        "query-time multiplier — several times the effective throughput of the same pool size, " +
        "at zero extra cost. A much smaller, cheaper NoSQL pool reaches the same ceiling a " +
        "bigger SQL one needs.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 430, keyPoolSize: 1000 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 400, y: 200 },
        config: { maxConcurrent: 4, maxQueueLength: 50, processingTimeMs: 1 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 720, y: 200 },
        config: { type: "nosql", maxConnections: 3, maxQueueLength: 50, processingTimeMs: 1 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "db" },
    ],
  },
};
