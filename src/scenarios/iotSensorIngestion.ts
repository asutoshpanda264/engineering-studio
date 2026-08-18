/**
 * IoT Sensor Ingestion — database-type-required, difficulty 2, "given +
 * budget" model (see docs/scenario-redesign.md; reference implementation
 * is movieTicketBooking.ts).
 *
 * Same database-type lesson as flashSale.ts (SQL vs NoSQL's connection-
 * ceiling/query-time multiplier — see entityConfigSchema.ts / Database.ts),
 * a fresh story and numbers, and — unlike flashSale.ts, where NoSQL is the
 * *better* answer among several that clear the budget — tuned so a
 * properly-sized SQL build fails the budget outright, making NoSQL a
 * required choice, not just a cheaper one.
 *
 * Verified against the real engine (seed 920, 8s @ 380 req/s, keyPoolSize
 * 800 — large and locked, so a Cache can't cheaply dominate this the way
 * it does the caching-focused scenarios; see flashSale.ts's own header
 * for the identical reasoning) via a throwaway tuning script (deleted
 * after use), using the real `scoreScenario` function throughout, never
 * hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB sql/5conn/15ms):
 *     89.5% success, p95 340ms, $676/mo → evaluation.passed=false, a
 *     genuine capacity failure — the default SQL pool's own ceiling
 *     falls short of 380 req/s.
 *   Adequate, properly-sized SQL (API 15/5ms, DB sql/25conn/10ms):
 *     100% success, p95 35ms, $798/mo → clears both metric constraints
 *     but $798 > $750 budget.
 *   Well-optimized, NoSQL (API 4/1ms, DB nosql/3conn/1ms):
 *     100% success, p95 16ms, $687/mo → gatesPassed=true, composite
 *     0.659, 2★ — NoSQL's multiplier lets a much smaller (cheaper-tier)
 *     pool clear the same ceiling SQL needs a bigger, pricier pool for.
 *   Lazy overprovisioning, SQL (API 150/5ms, DB sql/150conn/10ms — a
 *   UI-unreachable value, matching movieTicketBooking.ts's own
 *   precedent):
 *     100% success, p95 35ms, $1,924/mo → clears the metric constraints
 *     fine but wildly over budget.
 *
 * `optimalSolution` is the NoSQL build (composite 0.659, 2★) — a tighter
 * variant (processing floors both sides, connections down to 3) was
 * tried and plateaued at this cost, a real ceiling from the traffic's
 * own fixed usage-cost volume, not an arbitrary stopping point.
 */

import type { Scenario } from "./types";

export const iotSensorIngestion: Scenario = {
  id: "iot-sensor-ingestion",
  title: "IoT Sensor Ingestion",
  difficulty: 2,
  topics: ["system-design"],
  story:
    "A fleet of thousands of smart thermostats phones home every few seconds with a reading. " +
    "Nobody's reading any single sensor's history over and over — this is almost pure write " +
    "volume, not the kind of repeat-lookup traffic a cache is built for. Engineering's job is " +
    "to make sure every reading actually gets written, on a budget that scales sanely with " +
    "fleet size instead of linearly with however many connections the database happens to have.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 380, keyPoolSize: 800 },
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
  budgetUsd: 750,

  trafficPattern: { type: "constant", rate: 380 },
  durationMs: 8_000,
  seed: 920,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.97,
      label: "At least 97% of sensor readings are written",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 150,
      label: "95% of writes complete within 150ms",
      unit: "ms",
    },
  ],

  hints: [
    "This traffic is almost pure writes, spread across thousands of distinct sensors — nothing here is a good candidate for a cache. What else determines how much a database can absorb?",
    "A properly-sized SQL database can clear both the success-rate and latency bars here. Check what it costs against the budget.",
    "The Database entity has a `type` field. What does switching it actually change, and does it cost anything extra?",
  ],

  learningGoals: [
    "Not every high-volume workload is a caching problem — a cache only pays off when the same keys repeat, and pure write ingestion across a huge key space doesn't.",
    "A database's `type` (SQL vs NoSQL) changes its effective connection ceiling and per-query time at no extra cost — picking the right one for a write-heavy workload can be the difference between clearing a budget and blowing it.",
    "Two builds can both be functionally correct — the deciding factor is often which one the budget actually allows.",
  ],

  optimalSolution: {
    summary:
      "A NoSQL-type database, modestly sized — its connection-ceiling and query-time " +
      "multiplier clears the same write volume a much larger SQL pool would need, at a " +
      "fraction of the cost.",
    editorial: [
      "This traffic doesn't repeat — thousands of sensors, each writing its own reading, means " +
        "there's no hot key for a cache to exploit. A cache genuinely doesn't help here, unlike " +
        "this catalogue's caching-focused scenarios.",
      "A properly-sized SQL database clears the success-rate and latency bars just fine " +
        "functionally. The problem is purely cost: reaching that same throughput ceiling with a " +
        "SQL connection pool costs more than the budget allows.",
      "Switching the Database's own `type` to NoSQL applies a real connection-ceiling and " +
        "query-time multiplier — several times the effective throughput of the same pool size, " +
        "at zero extra cost. A much smaller, cheaper NoSQL pool reaches the same ceiling a " +
        "bigger SQL one needs.",
      "A common near-miss: switching to NoSQL but leaving the pool sized as if it still needed " +
        "SQL-level capacity. The whole point of the multiplier is that a smaller pool now does " +
        "the same job — leaving it oversized just pays for headroom nothing here needs.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 380, keyPoolSize: 800 },
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
