/**
 * Recipe of the Day — cache-required, difficulty 1, "given + budget"
 * model (see docs/scenario-redesign.md; reference implementation is
 * movieTicketBooking.ts). The gentlest cache scenario in the catalogue —
 * unlike trendingHashtagsFeed.ts (which fails on latency at defaults),
 * an unconfigured build already clears success rate and latency here;
 * the only thing standing between it and passing is cost, which a cache
 * fixes directly.
 *
 * Verified against the real engine (seed 980, 8s @ 220 req/s, keyPoolSize
 * 30) via a throwaway tuning script (deleted after use), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms, no cache):
 *     100% success, p95 44ms, $460/mo → clears both metric constraints
 *     but $460 > $450 budget.
 *   Adequate, no cache (API 12/5ms, DB 15conn/10ms):
 *     100% success, p95 35ms, $491/mo → still over budget — sizing more
 *     carefully doesn't help, since usage cost (billed per request
 *     reaching the database) is what's driving the bill.
 *   Cache-fronted, well-sized (API 4/2ms, Cache 30/lru, DB 2conn/3ms) —
 *   this is `optimalSolution`, whose connections omit an explicit
 *   `latencyMs` (matching this catalogue's convention), so its real
 *   numbers run a little faster than the tuning script above:
 *     100% success, p95 9ms, $329/mo → gatesPassed=true, composite
 *     0.726, 2★ — the only build shape that clears the budget.
 *   Lazy overprovisioning, no cache (API 150/5ms, DB 150conn/10ms — a
 *   UI-unreachable value):
 *     100% success, p95 35ms, $1,669/mo → wildly over budget.
 *
 * `optimalSolution` is the cache-fronted build (composite 0.726, 2★).
 */

import type { Scenario } from "./types";

export const recipeOfTheDay: Scenario = {
  id: "recipe-of-the-day",
  title: "Recipe of the Day",
  difficulty: 1,
  topics: ["caching"],
  story:
    "A cooking app features one 'Recipe of the Day' on its home screen — the same recipe, " +
    "shown to every single user who opens the app. It's popular precisely because it's the " +
    "same page for everyone, which means the database is answering the exact same question, " +
    "over and over, for every user who checks the app that day. Engineering's job is to serve " +
    "that one busy page without paying to re-fetch it from the database every single time.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 220, keyPoolSize: 30 },
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
  budgetUsd: 450,

  trafficPattern: { type: "constant", rate: 220 },
  durationMs: 8_000,
  seed: 980,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of page loads succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 100,
      label: "95% of page loads complete within 100ms",
      unit: "ms",
    },
  ],

  hints: [
    "A properly-sized API Server and Database, with no cache at all, already clears both the success-rate and latency bars. Check what it costs against the budget.",
    "Nearly every request is asking for the exact same recipe. What does that mean for how often the database actually needs to answer it?",
    "The full set of recipes this app could show is small enough to hold entirely in a modest cache.",
  ],

  learningGoals: [
    "A cache absorbs the most benefit when traffic is skewed toward a small set of hot keys — a single 'featured' item, viewed by everyone, is the most skewed case there is.",
    "A functionally correct, properly-sized build can still fail a budget — a cheaper shape that does less repeat work isn't just cleverer, it can be required.",
    "A cache sized to hold the full hot set turns nearly every request into a hit, collapsing the database's real workload down to almost nothing.",
  ],

  optimalSolution: {
    summary:
      "A modest cache holding the small set of possible daily recipes — so virtually every " +
      "page load is answered without touching the database — in front of a minimally-sized " +
      "database.",
    editorial: [
      "A properly-sized API Server and Database, with no cache at all, already handles this " +
        "traffic just fine functionally — the problem here is purely cost. Doing real database " +
        "work for the same repeated question, over and over, adds up fast.",
      "A cache sized to hold the small set of possible daily recipes turns almost every request " +
        "into a hit. Once that's true, the database behind it barely needs to do anything — its " +
        "own sizing (and its cost) collapses along with the volume actually reaching it.",
      "This is about as skewed as traffic ever gets — a single featured item, shown to " +
        "everyone — which is exactly the shape a cache is built for.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 220, keyPoolSize: 30 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 340, y: 200 },
        config: { maxConcurrent: 4, maxQueueLength: 30, processingTimeMs: 2 },
      },
      {
        id: "cache",
        type: "cache",
        label: "Cache",
        position: { x: 600, y: 200 },
        config: { capacity: 30, evictionPolicy: "lru", ttlMs: 0 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 860, y: 200 },
        config: { maxConnections: 2, maxQueueLength: 20, processingTimeMs: 3 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "cache" },
      { source: "cache", target: "db" },
    ],
  },
};
