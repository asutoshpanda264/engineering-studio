/**
 * Flash Sale — SCENARIOS.md's Level 3 "Scalability" scenario.
 *
 * The starting architecture has exactly one API server standing between
 * the client and a database that's comfortably provisioned — the API
 * server is the deliberate bottleneck (fails at ~88.5% success, verified
 * against the real engine at this seed), and the database sits well
 * under capacity the whole time. The lesson only lands if the student
 * notices *which* component is actually maxed out before reaching for a
 * fix: adding a LoadBalancer plus a second API server (both wired to the
 * same downstream Database) is what horizontal scaling looks like on the
 * canvas.
 */

import type { Scenario } from "./types";

export const flashSale: Scenario = {
  id: "flash-sale",
  title: "Flash Sale",
  difficulty: 3,
  story:
    "An e-commerce site is running a flash sale on a single hero product. The API server " +
    "handling checkout requests was sized for an ordinary weekday — today it's the only " +
    "thing standing between the storefront and the database, and it's the first thing to " +
    "buckle once the sale goes live.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 160 },
      config: { requestRate: 220, keyPoolSize: 50 },
    },
    {
      id: "api",
      type: "api",
      label: "API Server",
      position: { x: 360, y: 160 },
      config: { maxConcurrent: 5, maxQueueLength: 10, processingTimeMs: 12 },
    },
    {
      id: "database",
      type: "database",
      label: "Database",
      position: { x: 640, y: 160 },
      config: {
        maxConnections: 20,
        maxQueueLength: 100,
        processingTimeMs: 8,
        failureProbability: 0,
      },
    },
  ],
  startingConnections: [
    { source: "client", target: "api", latencyMs: 5 },
    { source: "api", target: "database", latencyMs: 5 },
  ],
  trafficPattern: { type: "constant", rate: 220 },
  durationMs: 8_000,
  seed: 300,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of checkout requests succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 80,
      label: "95% of requests complete within 80ms",
      unit: "ms",
    },
  ],

  hints: [
    "Which single component's utilization is maxed out while everything downstream of it still has headroom?",
    "If that one component disappeared right now, is there anything else in the architecture that could pick up its work?",
    "What does horizontal scaling actually require — a bigger box, or more boxes and something to split traffic between them?",
  ],

  learningGoals: [
    "A single server has a hard capacity ceiling no matter how well-tuned its own settings are.",
    "A load balancer doesn't create capacity — it distributes existing traffic across replicas that each have their own ceiling.",
    "Scaling out only helps as long as what's downstream can absorb the combined load of every replica.",
  ],
};
