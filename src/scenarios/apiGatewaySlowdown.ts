/**
 * API Gateway Slowdown — diagnose-the-bottleneck, difficulty 4, "given +
 * budget" model (see docs/scenario-redesign.md; reference implementation
 * is movieTicketBooking.ts). Same "utilization is a symptom, not a
 * diagnosis" lesson as slowSearchEndpoint.ts/warehouseInventorySync.ts
 * (difficulty 3/2), one notch harder — higher traffic, tighter budget.
 *
 * Verified against the real engine (seed 1080, 8s @ 460 req/s,
 * keyPoolSize 900 — large and locked, so a Cache can't cheaply dominate
 * this) via a throwaway tuning script (deleted after use), using the
 * real `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms):
 *     76.0% success, p95 342ms, $746/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   Wrong lever — raise ONLY the API server (maxConcurrent 10->30), DB
 *   left at its default:
 *     75.9% success, p95 344ms → still fails, barely moved despite
 *     costing more ($868 vs $746). Confirms the API's own capacity
 *     wasn't the real ceiling.
 *   Right lever, adequate — raise ONLY the database (15 connections),
 *   API left at its default:
 *     100% success, p95 35ms, $827/mo → gatesPassed=true, composite
 *     0.598, 2★.
 *   Well-optimized — both sized deliberately (API 4/2ms, DB 6conn/5ms):
 *     100% success, p95 24ms, $798/mo → gatesPassed=true, composite
 *     0.634, 2★.
 *   Lazy overprovisioning (a UI-unreachable value):
 *     100% success, p95 35ms, $2,036/mo → wildly over budget.
 *
 * `optimalSolution` is the well-optimized build (composite 0.634, 2★).
 */

import type { Scenario } from "./types";

export const apiGatewaySlowdown: Scenario = {
  id: "api-gateway-slowdown",
  title: "API Gateway Slowdown",
  difficulty: 4,
  topics: ["system-design"],
  story:
    "Every service behind the API gateway has gotten slower, and the on-call dashboard shows " +
    "both the gateway's own API layer and the backing database running hot. The obvious " +
    "instinct is to scale up whichever looks busiest — but at this traffic volume, scaling " +
    "the wrong tier gets expensive fast for no real improvement. Engineering's job is to find " +
    "the actual ceiling before spending real budget on either.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 460, keyPoolSize: 900 },
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

  trafficPattern: { type: "constant", rate: 460 },
  durationMs: 8_000,
  seed: 1080,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.97,
      label: "At least 97% of requests succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 150,
      label: "95% of requests complete within 150ms",
      unit: "ms",
    },
  ],

  hints: [
    "Both the API Server and the Database show high utilization in an unconfigured build. Are they necessarily two independent problems?",
    "Try raising only the API Server's own concurrency, leaving the Database untouched. Does that actually move success rate?",
    "Now try the opposite: raise only the Database, leave the API Server at its default. Compare.",
  ],

  learningGoals: [
    "A saturated-looking component can just be waiting on the real bottleneck downstream — utilization tells you something is busy, not why.",
    "Verify a fix actually helps before spending budget on it — raising the wrong tier's capacity can cost more while barely moving the outcome.",
    "Once the real ceiling is identified, fixing just that one component is often enough.",
  ],

  optimalSolution: {
    summary:
      "The API Server left near its default — the Database, deliberately sized to actually " +
      "clear the traffic, was always the real ceiling.",
    editorial: [
      "An unconfigured build shows both tiers at high utilization — the natural instinct is to " +
        "treat that as two separate shortages. It isn't: the API Server's own concurrent slots " +
        "are occupied waiting on a struggling Database response.",
      "The tell is what happens when you raise only the API Server's concurrency: success rate " +
        "barely moves, and the build costs more for almost the same result.",
      "Raising only the Database fixes the whole picture at once. Utilization is a symptom, not " +
        "a diagnosis; verify a fix actually helps before spending budget chasing the component " +
        "that merely looks busy.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 460, keyPoolSize: 900 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 400, y: 200 },
        config: { maxConcurrent: 4, maxQueueLength: 30, processingTimeMs: 2 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 720, y: 200 },
        config: { maxConnections: 6, maxQueueLength: 40, processingTimeMs: 5 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "db" },
    ],
  },
};
