/**
 * Warehouse Inventory Sync — diagnose-the-bottleneck, difficulty 2,
 * "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts). Same "utilization is a
 * symptom, not a diagnosis" lesson as slowSearchEndpoint.ts (difficulty
 * 3), one notch gentler — the same backpressure pattern, a looser
 * latency bar.
 *
 * Verified against the real engine (seed 1010, 10s @ 400 req/s,
 * keyPoolSize 600 — large and locked, so a Cache can't cheaply dominate
 * this) via a throwaway tuning script (deleted after use), using the
 * real `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms):
 *     84.2% success, p95 343ms, $700/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   Wrong lever — raise ONLY the API server (maxConcurrent 10->30), DB
 *   left at its default:
 *     85.0% success, p95 339ms → still fails, barely moved despite
 *     costing more ($823 vs $700). Confirms the API's own capacity
 *     wasn't the real ceiling.
 *   Right lever, adequate — raise ONLY the database (14 connections),
 *   API left at its default:
 *     100% success, p95 35ms, $751/mo → gatesPassed=true, composite
 *     0.659, 2★.
 *   Well-optimized — both sized deliberately (API 5/2ms, DB 7conn/5ms):
 *     100% success, p95 24ms, $722/mo → gatesPassed=true, composite
 *     0.685, 2★.
 *   Lazy overprovisioning (API 150/5ms, DB 150conn/10ms — a UI-
 *   unreachable value):
 *     100% success, p95 35ms, $1,959/mo → clears the metric constraints
 *     fine but wildly over budget.
 *
 * `optimalSolution` is the well-optimized build (composite 0.685, 2★).
 */

import type { Scenario } from "./types";

export const warehouseInventorySync: Scenario = {
  id: "warehouse-inventory-sync",
  title: "Warehouse Inventory Sync",
  difficulty: 2,
  topics: ["system-design"],
  story:
    "A logistics company's warehouse-floor app is lagging — every scan of a shelf barcode " +
    "checks and updates inventory counts, and the dashboard shows both the API layer and the " +
    "database running hot. It's tempting to just scale up whichever one looks busier. " +
    "Engineering's job is to find out which tier is actually the ceiling before spending any " +
    "budget on either.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 400, keyPoolSize: 600 },
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

  trafficPattern: { type: "constant", rate: 400 },
  durationMs: 10_000,
  seed: 1010,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of scans sync successfully",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 250,
      label: "95% of syncs complete within 250ms",
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
      "An unconfigured build shows both the API Server and the Database at high utilization — " +
        "the natural instinct is to treat that as two separate shortages. It isn't: the API " +
        "Server's own concurrent slots are occupied waiting on a struggling Database response.",
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
        config: { requestRate: 400, keyPoolSize: 600 },
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
        config: { maxConnections: 7, maxQueueLength: 40, processingTimeMs: 5 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "db" },
    ],
  },
};
