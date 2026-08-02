/**
 * URL Shortener — SCENARIOS.md's Level 2 "Performance" scenario.
 *
 * The starting architecture sends every read straight to the database,
 * even though traffic is deliberately skewed toward a small set of hot
 * keys (Client.keyPoolSize=30, and assignRequestKey's squared draw
 * concentrates most requests on the lowest few of those — see
 * TrafficGenerator.ts). That skew is exactly what a cache needs to be
 * useful; without one, the database repeatedly answers the same lookups
 * and can't keep up (fails at ~68.6% success, verified against the real
 * engine at this seed). The fix isn't a config tweak like Movie Ticket
 * Booking — it's adding a Cache node between API and Database, which is
 * the point: this scenario teaches *when* to reach for the Cache in the
 * Component Library, not just how to tune one that's already there.
 */

import type { Scenario } from "./types";

export const urlShortener: Scenario = {
  id: "url-shortener",
  title: "URL Shortener",
  difficulty: 1,
  story:
    "A link-shortening service is popular because of a handful of viral posts — the same " +
    "few short links get clicked millions of times, while the long tail barely gets touched " +
    "at all. Every click today resolves straight through to the database, and the database " +
    "is starting to buckle under lookups it has already answered a thousand times over.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 160 },
      config: { requestRate: 150, keyPoolSize: 30 },
    },
    {
      id: "api",
      type: "api",
      label: "API Server",
      position: { x: 360, y: 160 },
      config: { maxConcurrent: 20, maxQueueLength: 50, processingTimeMs: 5 },
    },
    {
      id: "database",
      type: "database",
      label: "Database",
      position: { x: 640, y: 160 },
      config: {
        maxConnections: 4,
        maxQueueLength: 10,
        processingTimeMs: 40,
        failureProbability: 0,
      },
    },
  ],
  startingConnections: [
    { source: "client", target: "api", latencyMs: 5 },
    { source: "api", target: "database", latencyMs: 5 },
  ],
  trafficPattern: { type: "constant", rate: 150 },
  durationMs: 8_000,
  seed: 200,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of lookups succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 100,
      label: "95% of requests complete within 100ms",
      unit: "ms",
    },
  ],

  hints: [
    "Look at which entity's utilization is pegged near 100% — is it doing new work, or answering the same question over and over?",
    "How many distinct keys are actually being requested? Check the Client's Key Pool Size in the Inspector.",
    "Is there a component in the library whose entire job is to remember an answer instead of recomputing it?",
  ],

  learningGoals: [
    "A small, skewed set of hot keys is exactly what a cache is for — most 'repeated work' is really the same few keys, over and over.",
    "Caching moves load off a bottleneck without touching its capacity at all.",
    "A cache's hit rate depends on the traffic actually being repetitive, not just on the cache existing.",
  ],
};
