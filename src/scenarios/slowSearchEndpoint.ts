/**
 * Slow Search Endpoint — diagnose-the-bottleneck, difficulty 3, "given +
 * budget" model (see docs/scenario-redesign.md; reference implementation
 * is movieTicketBooking.ts).
 *
 * Same "utilization is a symptom, not a diagnosis" lesson as
 * parkingReservationPlatform.ts, a fresh story and numbers: at this
 * traffic level, an unconfigured API Server and Database both show high
 * utilization at once, but they aren't two independent problems — the
 * API Server's slots are stuck waiting on a struggling downstream
 * Database (backpressure), not short on their own raw capacity. Raising
 * the API Server alone barely moves anything; the Database was always
 * the real ceiling.
 *
 * Verified against the real engine (seed 940, 10s @ 420 req/s, keyPoolSize
 * 1000 — large and locked, same "the skew itself is given" reasoning as
 * flashSale.ts/parkingReservationPlatform.ts, so a Cache can't cheaply
 * dominate this) via a throwaway tuning script (deleted after use), using
 * the real `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms):
 *     82.3% success, p95 346ms, both API and DB at 100% utilization →
 *     evaluation.passed=false, a genuine capacity failure.
 *   Wrong lever — raise ONLY the API server (maxConcurrent 10->30), DB
 *   left at its default:
 *     82.7% success, p95 342ms → still fails, barely moved at all despite
 *     costing more ($829 vs $706). Confirms the API's high utilization
 *     was backpressure from the database, not its own limit.
 *   Right lever, adequate — raise ONLY the database (15 connections), API
 *   left at its default:
 *     100% success, p95 35ms, $761/mo → gatesPassed=true, composite
 *     0.625, 2★.
 *   Well-optimized — both sized deliberately (API 5/2ms, DB 8conn/5ms):
 *     100% success, p95 24ms, $731/mo → gatesPassed=true, composite
 *     0.656, 2★.
 *   Lazy overprovisioning (API 150/5ms, DB 150conn/10ms — a UI-
 *   unreachable value, matching movieTicketBooking.ts's own precedent):
 *     100% success, p95 35ms, $1,969/mo → clears the metric constraints
 *     fine but wildly over budget.
 *
 * `optimalSolution` is the well-optimized build (composite 0.656, 2★).
 */

import type { Scenario } from "./types";

export const slowSearchEndpoint: Scenario = {
  id: "slow-search-endpoint",
  title: "Slow Search Endpoint",
  difficulty: 3,
  topics: ["system-design"],
  story:
    "Product search has gotten noticeably slower, and both the API layer and the database " +
    "look completely maxed out in the monitoring dashboard. The obvious instinct is to scale " +
    "up whatever looks busiest — but scaling the wrong tier just means paying more for the " +
    "same slow search. Engineering's job is to find out which one is actually the ceiling " +
    "before spending any budget on either.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 420, keyPoolSize: 1000 },
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
  budgetUsd: 800,

  trafficPattern: { type: "constant", rate: 420 },
  durationMs: 10_000,
  seed: 940,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of searches succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 200,
      label: "95% of searches complete within 200ms",
      unit: "ms",
    },
  ],

  hints: [
    "Both the API Server and the Database show high utilization in an unconfigured build. Are they necessarily two independent problems?",
    "Try raising only the API Server's own concurrency, leaving the Database untouched. Does that actually move success rate — and if not, what does that tell you?",
    "Now try the opposite: raise only the Database, leave the API Server at its default. Compare.",
  ],

  learningGoals: [
    "A saturated-looking component can just be waiting on the real bottleneck downstream — utilization tells you something is busy, not why.",
    "Verify a fix actually helps before spending budget on it — raising the wrong tier's capacity can cost more while barely moving the outcome.",
    "Once the real ceiling is identified, fixing just that one component (not both) is often enough.",
  ],

  optimalSolution: {
    summary:
      "The API Server left near its default — the Database, deliberately sized to actually " +
      "clear the traffic, was always the real ceiling.",
    editorial: [
      "An unconfigured build shows both the API Server and the Database at 100% utilization — " +
        "the natural instinct is to treat that as two separate shortages. It isn't: the API " +
        "Server's own concurrent slots are occupied waiting on a struggling Database response, " +
        "not short on their own raw capacity.",
      "The tell is what happens when you raise only the API Server's concurrency: success rate " +
        "barely moves, and the build costs more for almost the same result. The API was never " +
        "the ceiling — it was just as backed up as everything behind it.",
      "Raising only the Database fixes the whole picture at once — both the Database's own " +
        "utilization and the API Server's, since the API Server was only ever waiting on it. " +
        "Utilization is a symptom, not a diagnosis; verify a fix actually helps before spending " +
        "budget chasing the component that merely looks busy.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 420, keyPoolSize: 1000 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 400, y: 200 },
        config: { maxConcurrent: 5, maxQueueLength: 30, processingTimeMs: 2 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 720, y: 200 },
        config: { maxConnections: 8, maxQueueLength: 40, processingTimeMs: 5 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "db" },
    ],
  },
};
