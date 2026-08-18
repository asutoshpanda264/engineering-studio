/**
 * Trending Hashtags Feed — cache-required, difficulty 2, "given + budget"
 * model (see docs/scenario-redesign.md; reference implementation is
 * movieTicketBooking.ts).
 *
 * Same caching lesson as movieTicketBooking.ts/urlShortener.ts, a fresh
 * story and numbers — this catalogue's caching mechanism is proven and
 * reused deliberately (see internalAdminDashboard.ts's header for why
 * scaling problem count means new stories/difficulty over the same small
 * set of levers, not a new lever per scenario). The one real difference
 * from the other two caching scenarios: the budget here is tight enough
 * that a properly-sized, uncached build doesn't just score lower than a
 * cached one — it fails outright, making the Cache a required component,
 * not merely the better answer.
 *
 * Verified against the real engine (seed 910, 8s @ 300 req/s, keyPoolSize
 * 40) via a throwaway tuning script (deleted after use), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms, no cache):
 *     100% success, p95 106ms, $611/mo → evaluation.passed=false (p95
 *     constraint, 80ms bar) — a genuine latency failure, not a budget one.
 *   Adequate, no cache (API 15/5ms, DB 20conn/10ms):
 *     100% success, p95 35ms, $642/mo → clears both metric constraints
 *     but $642 > $600 budget — over budget by a modest but real margin.
 *   Cache-fronted, well-sized (API 3/1ms, Cache 40/lru, DB 1conn/1ms):
 *     100% success, p95 16ms, $431/mo → gatesPassed=true, composite
 *     0.694, 2★ — the only build shape that clears success rate,
 *     latency, AND budget at once.
 *   Lazy overprovisioning, no cache (API 150/5ms, DB 150conn/10ms — a
 *   UI-unreachable value, matching movieTicketBooking.ts's own
 *   precedent):
 *     100% success, p95 35ms, $1,820/mo → clears the metric constraints
 *     but wildly over budget.
 *
 * `optimalSolution` is the cache-fronted build (composite 0.694, 2★) —
 * several tighter variants were tried (API/DB processing floors, DB
 * connections down to 1) and plateaued at the same cost, confirming it's
 * a real ceiling (cache base cost + fixed usage cost), not an arbitrary
 * stopping point.
 */

import type { Scenario } from "./types";

export const trendingHashtagsFeed: Scenario = {
  id: "trending-hashtags-feed",
  title: "Trending Hashtags Feed",
  difficulty: 2,
  topics: ["caching"],
  story:
    "A social app shows every user a 'Trending' feed of the day's hottest hashtags. It's the " +
    "single most-viewed screen in the whole app — nearly everyone checks it, but they're all " +
    "looking at the same handful of tags at any given moment. Engineering's job is to keep that " +
    "screen fast for everyone hitting refresh, without paying to re-fetch the same handful of " +
    "trending tags from the database over and over.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 300, keyPoolSize: 40 },
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

  trafficPattern: { type: "constant", rate: 300 },
  durationMs: 8_000,
  seed: 910,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of feed loads succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 80,
      label: "95% of feed loads complete within 80ms",
      unit: "ms",
    },
  ],

  hints: [
    "Nearly everyone is looking at the same handful of trending tags at once. What does that mean for how often the database actually needs to be asked the same question?",
    "A properly-sized API Server and Database, with no cache at all, already clears both the success-rate and latency bars. Look at what it costs.",
    "The full set of trending tags is small enough to hold entirely in a modestly-sized cache. What happens to the database's own workload once that's true?",
  ],

  learningGoals: [
    "A cache absorbs the most benefit exactly when traffic is skewed toward a small set of hot keys — which real 'trending'/'popular' feeds almost always are.",
    "Sizing a backend correctly clears the functional bars, but a budget can still rule it out — a cheaper shape that does less raw work isn't just cleverer, it's often required.",
    "A cache sized to hold the entire hot set turns nearly every request into a hit, collapsing the database's real workload down to almost nothing.",
  ],

  optimalSolution: {
    summary:
      "A cache sized to hold every trending tag at once — so virtually every feed load is " +
      "answered without touching the database — in front of a minimally-sized database.",
    editorial: [
      "The traffic here is about as skewed as it gets: everyone loading the feed is asking for " +
        "the same small set of trending tags. A properly-sized API Server and Database, with no " +
        "cache at all, already handles that traffic just fine functionally — 100% success, " +
        "comfortable latency. The problem is purely cost: doing real database work for the same " +
        "repeated question, over and over, adds up.",
      "A cache sized to hold the entire trending set turns almost every request into a hit. Once " +
        "that's true, the database behind it barely needs to do anything — its own sizing (and " +
        "its cost) collapses along with the volume actually reaching it.",
      "A common near-miss: sizing the cache too small to hold the full set of trending tags. When " +
        "even a few hot tags keep falling out of cache, a meaningful slice of traffic still hits " +
        "the database on every request, and the savings mostly evaporate.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 300, keyPoolSize: 40 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 340, y: 200 },
        config: { maxConcurrent: 3, maxQueueLength: 30, processingTimeMs: 1 },
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
        config: { maxConnections: 1, maxQueueLength: 20, processingTimeMs: 1 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "cache" },
      { source: "cache", target: "db" },
    ],
  },
};
