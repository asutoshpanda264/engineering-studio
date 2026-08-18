/**
 * Coupon Code Redemption — cache-required, difficulty 4, "given +
 * budget" model (see docs/scenario-redesign.md; reference implementation
 * is movieTicketBooking.ts). Same caching lesson as liveSportsScoreboard.ts
 * (difficulty 3), one notch harder — higher traffic, a tighter latency
 * bar, and an even wider gap between a capacity-adequate uncached build
 * and the budget.
 *
 * Verified against the real engine (seed 1060, 8s @ 450 req/s,
 * keyPoolSize 40), using the real `scoreScenario` function throughout,
 * never hand math, and — as of the DEFAULT_CONNECTION_LATENCY_MS fix (see
 * simulationDefaults.ts) — the real 5ms-per-hop connection latency every
 * live simulation actually applies, not 0ms:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms, no cache):
 *     76.2% success, p95 343ms, $743/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   Adequate, no cache (API 20/5ms, DB 30conn/10ms):
 *     100% success, p95 35ms, $936/mo → clears both metric constraints
 *     but nearly double the $600 budget.
 *   Cache-fronted, well-sized (API 5/2ms, Cache 40/lru, DB 2conn/4ms):
 *     100% success, p95 24ms, $572/mo → gatesPassed=true, composite
 *     0.482, 1★ — the only build shape that clears the budget. (RETUNED
 *     after the connection-latency fix: p95 was 18ms/composite
 *     0.532/2★ at the old, incorrect 0ms assumption. Unlike
 *     viralVideoComments.ts/trendingProductSearch.ts/
 *     globalLeaderboardUpdates.ts's cache+database-type combos — where
 *     the cache hop's fixed network cost outweighs its own tail-latency
 *     savings once real latency applies, breaking the build outright —
 *     this scenario only ever asked the cache to cut *cost* via fewer
 *     requests reaching a still-SQL database, never to win a latency
 *     fight against a no-cache build. That's a fundamentally cheaper ask
 *     of the cache, and it survives the fix with room to spare.)
 *   Lazy overprovisioning, no cache (API 150/5ms, DB 150conn/10ms — a
 *   UI-unreachable value):
 *     100% success, p95 35ms, $2,032/mo → wildly over budget.
 *
 * `optimalSolution` is the cache-fronted build (composite 0.482, 1★).
 */

import type { Scenario } from "./types";

export const couponCodeRedemption: Scenario = {
  id: "coupon-code-redemption",
  title: "Coupon Code Redemption",
  difficulty: 4,
  topics: ["caching"],
  story:
    "A single viral coupon code is spreading across social media, and everyone's rushing to " +
    "redeem it before it expires — a huge crowd, all checking the validity of the same " +
    "handful of active codes. Every redemption check that reaches the database for a code " +
    "that hasn't changed since the last check is money spent for nothing. Engineering's job " +
    "is to keep checkout feeling instant for a crowd this size, without paying database rates " +
    "for traffic that's really just re-asking the same few questions.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 450, keyPoolSize: 40 },
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
  budgetUsd: 600,

  trafficPattern: { type: "constant", rate: 450 },
  durationMs: 8_000,
  seed: 1060,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.98,
      label: "At least 98% of redemption checks succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 40,
      label: "95% of checks complete within 40ms",
      unit: "ms",
    },
  ],

  hints: [
    "Everyone rushing to redeem is checking one of a small handful of active codes. What does that mean for how often the database actually needs to be asked?",
    "A properly-sized API Server and Database, with no cache at all, already clears both the success-rate and latency bars. Check what it costs.",
    "The full set of currently-active coupon codes is small enough to hold entirely in a modest cache.",
  ],

  learningGoals: [
    "At high enough volume, even a functionally correct, properly-sized build can be nearly double the budget — sizing alone doesn't fix a cost problem caused by repeat work.",
    "A cache absorbs the most benefit exactly when traffic is skewed toward a small set of hot keys — a single viral code, checked by a huge crowd, is about as skewed as it gets.",
    "A cache sized to hold the entire hot set turns nearly every request into a hit, collapsing the database's real workload — and its cost — down to almost nothing.",
  ],

  optimalSolution: {
    summary:
      "A cache sized to hold every currently-active coupon code — so virtually every " +
      "redemption check is answered without touching the database — in front of a " +
      "minimally-sized database.",
    editorial: [
      "A properly-sized API Server and Database, with no cache at all, handles this traffic " +
        "just fine functionally. The problem is purely cost, and at this volume it's dramatic — " +
        "a capacity-adequate build here costs nearly twice the budget.",
      "A cache sized to hold every active code turns almost every check into a hit. Once that's " +
        "true, the database behind it barely needs to do anything — its own sizing (and its " +
        "cost) collapses along with the volume actually reaching it.",
      "Sizing alone genuinely cannot solve this within budget — the cache isn't just the " +
        "cheaper option here, it's the only one that fits.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 450, keyPoolSize: 40 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 340, y: 200 },
        config: { maxConcurrent: 5, maxQueueLength: 40, processingTimeMs: 2 },
      },
      {
        id: "cache",
        type: "cache",
        label: "Cache",
        position: { x: 600, y: 200 },
        config: { capacity: 40, evictionPolicy: "lru", ttlMs: 0 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 860, y: 200 },
        config: { maxConnections: 2, maxQueueLength: 30, processingTimeMs: 4 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "cache" },
      { source: "cache", target: "db" },
    ],
  },
};
