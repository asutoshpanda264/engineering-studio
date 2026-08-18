/**
 * Internal Admin Dashboard — the friendliest onboarding scenario in the
 * catalogue: pure capacity sizing, no cache/database-type/queue lever
 * needed. Difficulty 1, "given + budget" model (see docs/scenario-redesign.md;
 * reference implementation is movieTicketBooking.ts).
 *
 * Deliberately the SAME underlying lesson as movieTicketBooking.ts (a
 * connection pool's throughput ceiling, correctly calculated) at an
 * easier tier, not a different mechanism — this catalogue only has a
 * handful of genuinely distinct, honestly-tunable levers (see
 * priceAlertNotifications.ts's header for why most of the "obvious"
 * other component topics don't survive tuning), so scaling the number of
 * problems means new stories and difficulty tiers over the same proven
 * levers, not a new lever per scenario.
 *
 * Verified against the real engine (seed 900, 10s @ 350 req/s) via a
 * throwaway tuning script (deleted after use, per docs/Learn-Problem-
 * Solution.md's discipline), using the real `scoreScenario` function
 * throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms):
 *     99.8% success, p95 284ms, $635/mo → evaluation.passed=false — the
 *     default Database's own raw ceiling (5 x 1000/15 ~ 333 req/s) is
 *     close enough to the fixed 350 req/s demand that queueing delay
 *     alone blows the (deliberately tight, 150ms) latency bar, even
 *     though almost every request eventually succeeds.
 *   Adequate, properly sized (API 8/5ms, DB 10conn/10ms):
 *     100% success, p95 35ms, $649/mo → gatesPassed=true, composite
 *     0.634, 2★.
 *   Tightened (API 6/3ms, DB 6conn/6ms):
 *     100% success, p95 27ms, $650/mo → gatesPassed=true, composite
 *     0.651, still 2★ — usage cost (billed per request, fixed by the
 *     traffic rate alone) dominates the bill at this volume regardless
 *     of how tightly the pools are sized, so there's a real, not
 *     arbitrary, ceiling on how much tighter sizing alone can move the
 *     composite here.
 *   Lazy overprovisioning (API 100/5ms, DB 100conn/10ms — a UI-
 *   unreachable "just keep turning the dial" value, matching
 *   movieTicketBooking.ts's own precedent):
 *     100% success, p95 35ms, $1,400/mo → clears the metric constraints
 *     fine but budgetPassed=false, exactly 2x over budget.
 *
 * `optimalSolution` is the tightened build (composite 0.651, 2★) —
 * genuinely capped by usage cost, not an arbitrary stopping point.
 */

import type { Scenario } from "./types";

export const internalAdminDashboard: Scenario = {
  id: "internal-admin-dashboard",
  title: "Internal Admin Dashboard",
  difficulty: 1,
  topics: ["system-design"],
  story:
    "Support staff use an internal dashboard all day to look up customer records and order " +
    "history. It's not customer-facing and the traffic isn't spiky — but infra spend on " +
    "internal tools gets scrutinized just as closely as anything public, and a dashboard that " +
    "hangs mid-lookup is still a real support-team productivity problem. Engineering's job is " +
    "the most basic one there is: size the service correctly for the traffic it actually gets, " +
    "without overpaying for capacity nobody needs.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 350 },
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
  lockedFields: { client: ["requestRate"] },
  budgetUsd: 750,

  trafficPattern: { type: "constant", rate: 350 },
  durationMs: 10_000,
  seed: 900,

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
      threshold: 150,
      label: "95% of lookups complete within 150ms",
      unit: "ms",
    },
  ],

  hints: [
    "The Client's request rate is fixed at 350 req/s. What's a default API Server and Database's own raw throughput ceiling, at their default settings — does it actually clear 350 req/s?",
    "Dropping default-configured components onto the canvas and connecting them isn't automatically enough. Most requests succeed eventually — so if success rate looks fine, what's actually failing?",
    "Is there a cheaper way to hit the same latency bar than just cranking every dial as high as it'll go?",
  ],

  learningGoals: [
    "A connection pool's throughput ceiling is connections × (1000 / processing time) — a number you calculate, not one that takes care of itself at default settings.",
    "Success rate alone doesn't tell the whole story — a backend can eventually process almost everything and still fail a real latency bar under queueing delay.",
    "Budget makes 'just add more capacity' a real tradeoff, not a free move — the same latency bar is reachable at wildly different costs.",
  ],

  optimalSolution: {
    summary:
      "A modestly, deliberately sized API Server and Database — no cache, no special " +
      "database type, no queue. Just enough capacity to clear the latency bar, no more.",
    editorial: [
      "This scenario doesn't have a hidden trick — it's the most basic version of the lesson " +
        "every other scenario in this catalogue builds on. A default API Server and Database's " +
        "raw throughput ceiling sits right at the edge of what 350 req/s actually demands, so " +
        "even though almost every request eventually gets a response, the queueing delay on the " +
        "way there is enough to blow a real latency bar.",
      "Fixing it doesn't require anything exotic — raising the Database's connection count and " +
        "the API Server's own concurrency a modest amount clears both the success-rate and " +
        "latency constraints comfortably.",
      "The one real tradeoff left is cost: this traffic's own volume bills a fixed usage cost no " +
        "matter how the pools are sized, so tightening the configuration further saves some " +
        "money but not a dramatic amount — the real, avoidable waste is turning every dial up " +
        "far higher than the traffic ever needed, which clears the metrics just as well while " +
        "costing twice as much.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 350 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 400, y: 200 },
        config: { maxConcurrent: 6, maxQueueLength: 40, processingTimeMs: 3 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 720, y: 200 },
        config: { maxConnections: 6, maxQueueLength: 40, processingTimeMs: 6 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "db" },
    ],
  },
};
