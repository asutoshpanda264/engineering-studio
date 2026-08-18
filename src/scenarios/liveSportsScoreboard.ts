/**
 * Live Sports Scoreboard — cache-required, difficulty 3, "given +
 * budget" model (see docs/scenario-redesign.md; reference implementation
 * is movieTicketBooking.ts). Same caching lesson as trendingHashtagsFeed.ts
 * (difficulty 2), one notch harder — higher traffic, a tighter latency
 * bar, and this time even a capacity-adequate uncached build fails
 * outright on budget, not just barely misses it.
 *
 * Verified against the real engine (seed 1020, 8s @ 420 req/s,
 * keyPoolSize 50) via a throwaway tuning script (deleted after use),
 * using the real `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms, no cache):
 *     84.2% success, p95 338ms, $703/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   Adequate, no cache (API 20/5ms, DB 25conn/10ms):
 *     100% success, p95 35ms, $871/mo → clears both metric constraints
 *     but wildly over budget — matching the traffic to raw capacity gets
 *     expensive fast at this volume.
 *   Cache-fronted, well-sized (API 5/2ms, Cache 50/lru, DB 2conn/4ms):
 *     100% success, p95 18ms, $530/mo → gatesPassed=true, composite
 *     0.579, 2★ — the only build shape that clears the budget.
 *   Lazy overprovisioning, no cache (API 150/5ms, DB 150conn/10ms — a
 *   UI-unreachable value):
 *     100% success, p95 35ms, $1,968/mo → wildly over budget.
 *
 * `optimalSolution` is the cache-fronted build (composite 0.579, 2★).
 */

import type { Scenario } from "./types";

export const liveSportsScoreboard: Scenario = {
  id: "live-sports-scoreboard",
  title: "Live Sports Scoreboard",
  difficulty: 3,
  topics: ["caching"],
  story:
    "During a major tournament, everyone's refreshing the same handful of live scoreboards at " +
    "once — a huge crowd, an incredibly narrow set of things they're actually looking at. Every " +
    "refresh that reaches the database for a score that hasn't even changed since the last " +
    "refresh is money spent for nothing. Engineering's job is to keep the board feeling live " +
    "for a crowd this size, without paying database rates for traffic that's really just " +
    "re-asking the same handful of questions.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 420, keyPoolSize: 50 },
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
  budgetUsd: 550,

  trafficPattern: { type: "constant", rate: 420 },
  durationMs: 8_000,
  seed: 1020,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.97,
      label: "At least 97% of scoreboard refreshes succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 60,
      label: "95% of refreshes complete within 60ms",
      unit: "ms",
    },
  ],

  hints: [
    "Everyone watching is refreshing one of a small handful of live scoreboards. What does that mean for how often the database actually needs to be asked?",
    "A properly-sized API Server and Database, with no cache at all, already clears both the success-rate and latency bars. Check what it costs.",
    "The full set of active scoreboards is small enough to hold entirely in a modestly-sized cache.",
  ],

  learningGoals: [
    "At high enough volume, even a functionally correct, properly-sized build can be wildly over budget — sizing alone doesn't fix a cost problem caused by repeat work.",
    "A cache absorbs the most benefit exactly when traffic is skewed toward a small set of hot keys, which a live scoreboard during a big event is about as skewed as it gets.",
    "A cache sized to hold the entire hot set turns nearly every request into a hit, collapsing the database's real workload — and its cost — down to almost nothing.",
  ],

  optimalSolution: {
    summary:
      "A cache sized to hold every active scoreboard at once — so virtually every refresh is " +
      "answered without touching the database — in front of a minimally-sized database.",
    editorial: [
      "A properly-sized API Server and Database, with no cache at all, handles this traffic just " +
        "fine functionally. The problem is purely cost, and at this volume it isn't subtle — a " +
        "capacity-adequate build here costs well over the budget, not just a little over it.",
      "A cache sized to hold every active scoreboard turns almost every refresh into a hit. Once " +
        "that's true, the database behind it barely needs to do anything — its own sizing (and " +
        "its cost) collapses along with the volume actually reaching it.",
      "This is a case where sizing alone genuinely cannot solve the problem within budget — the " +
        "cache isn't just the cheaper option here, it's the only one that fits.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 420, keyPoolSize: 50 },
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
        config: { capacity: 50, evictionPolicy: "lru", ttlMs: 0 },
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
