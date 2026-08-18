/**
 * Fitness Tracker Step Sync — database-type-required, difficulty 4,
 * "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts). Same database-type lesson as
 * rideHailingLocationPings.ts (difficulty 3), one notch harder — higher
 * traffic, a tighter latency bar.
 *
 * Verified against the real engine (seed 1070, 8s @ 470 req/s,
 * keyPoolSize 1200 — large and locked, so a Cache can't cheaply dominate
 * this) via a throwaway tuning script (deleted after use), using the
 * real `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB sql/5conn/15ms):
 *     74.2% success, p95 342ms, $761/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   Adequate, properly-sized SQL (API 15/5ms, DB sql/30conn/10ms):
 *     100% success, p95 35ms, $931/mo → clears both metric constraints
 *     but $931 > $850 budget.
 *   NoSQL, tightened (API 4/1ms, DB nosql/3conn/1ms):
 *     100% success, p95 16ms, $820/mo → gatesPassed=true, composite
 *     0.589, 2★ — NoSQL's multiplier lets a much smaller (cheaper-tier)
 *     pool clear the same ceiling SQL needs a bigger, pricier pool for.
 *   Lazy overprovisioning, SQL (a UI-unreachable value):
 *     100% success, p95 35ms, $2,057/mo → wildly over budget.
 *
 * `optimalSolution` is the NoSQL build (composite 0.589, 2★).
 */

import type { Scenario } from "./types";

export const fitnessTrackerStepSync: Scenario = {
  id: "fitness-tracker-step-sync",
  title: "Fitness Tracker Step Sync",
  difficulty: 4,
  topics: ["system-design"],
  story:
    "Millions of fitness trackers phone home with step counts every few seconds — pure write " +
    "volume, spread across a huge number of independent devices, with nothing here that " +
    "repeats often enough for a cache to help. Engineering's job is to make sure every sync " +
    "actually lands, on a budget that scales sanely with device count instead of linearly " +
    "with however many connections the database happens to have.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 470, keyPoolSize: 1200 },
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
  budgetUsd: 850,

  trafficPattern: { type: "constant", rate: 470 },
  durationMs: 8_000,
  seed: 1070,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.98,
      label: "At least 98% of syncs are written",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 60,
      label: "95% of writes complete within 60ms",
      unit: "ms",
    },
  ],

  hints: [
    "Millions of independent devices, each syncing their own steps — nothing here is a good candidate for a cache. What else determines how much a database can absorb?",
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
      "This traffic doesn't repeat — millions of devices, each writing their own step count, " +
        "means there's no hot key for a cache to exploit.",
      "A properly-sized SQL database clears the success-rate and latency bars just fine " +
        "functionally. The problem is purely cost: reaching that same throughput ceiling with a " +
        "SQL connection pool costs more than the budget allows.",
      "Switching the Database's own `type` to NoSQL applies a real connection-ceiling and " +
        "query-time multiplier — several times the effective throughput of the same pool size, " +
        "at zero extra cost.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 470, keyPoolSize: 1200 },
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
