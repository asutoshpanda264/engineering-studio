/**
 * Checkout Timeout Mystery — diagnose-the-bottleneck, difficulty 3,
 * "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts).
 *
 * The deliberate MIRROR of slowSearchEndpoint.ts/
 * parkingReservationPlatform.ts: same "utilization is a symptom, not a
 * diagnosis" lesson, but this time the API Server genuinely IS the real
 * bottleneck, not backpressure from the database. A second scenario
 * teaching the same diagnostic *process* with the opposite answer is the
 * point — a student who solved the other two by pattern-matching "it's
 * always the database" gets a real check here, not just more practice at
 * the same conclusion.
 *
 * Mechanically: the API Server here is a GIVEN node (not just the
 * Client) with `processingTimeMs` locked at 20ms — checkout runs real,
 * unavoidable business logic (fraud checks, tax calculation) that no
 * amount of database tuning can shortcut. `maxConcurrent` stays
 * adjustable; the Database (now part of every scenario's standard
 * starting scaffold — see `internalAdminDashboard.ts`'s header for why
 * every scenario has one) is completely free-form.
 *
 * Verified against the real engine (seed 970, 10s @ 350 req/s, API
 * processingTimeMs locked at 20ms), using the real `scoreScenario`
 * function throughout, never hand math:
 *
 *   Bare starting scaffold, unedited (API processingTimeMs 20ms/
 *   maxConcurrent 3 — its starting value, not locked — Database at
 *   schema defaults): every request now occupies the API's still-tiny
 *   3-slot pool TWICE (inbound + response legs both route through the
 *   same BoundedProcessor), so the database being present at all — even
 *   completely unconfigured — already compounds the API's own ceiling:
 *     10.3% success, p95 727ms → evaluation.passed=false, a severe
 *     capacity failure before any design decision.
 *   Wrong lever — deliberately raise the Database (30 connections)
 *   without touching the API's concurrency at all:
 *     12.8% success, p95 720ms → barely moves. Confirms the database was
 *     never the real ceiling — the API's own tiny concurrency was, and
 *     is what still bites regardless of how the database is sized.
 *   Partial right lever — raise only the API's concurrency (16), database
 *   left at its schema default:
 *     98.2% success, p95 359ms → success recovers almost entirely, but
 *     latency doesn't — not enough headroom yet.
 *   Well-optimized — API concurrency raised further (22) with the
 *   database modestly sized (6 connections):
 *     100% success, p95 49ms, $754/mo → gatesPassed=true, composite
 *     0.604, 2★.
 *   Lazy overprovisioning (API maxConcurrent 150, DB 150conn — a
 *   UI-unreachable value):
 *     100% success, p95 56ms, $1,871/mo → clears the metric constraints
 *     fine but wildly over budget.
 *
 * `optimalSolution` is the well-optimized build (composite 0.604, 2★).
 */

import type { Scenario } from "./types";

export const checkoutTimeoutMystery: Scenario = {
  id: "checkout-timeout-mystery",
  title: "Checkout Timeout Mystery",
  difficulty: 3,
  topics: ["system-design"],
  story:
    "Checkout has been timing out under load, and just like last time the search endpoint was " +
    "slow, both the API layer and the database look maxed out. It's tempting to assume the " +
    "same fix applies — but checkout runs real, unavoidable business logic on every request " +
    "(fraud checks, tax calculation) that no database tuning can shortcut. Engineering's job " +
    "is to actually verify which tier is the real ceiling this time, not assume it's the same " +
    "one as before.",

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
      // maxConcurrent is deliberately NOT locked (see lockedFields below) —
      // only its starting value is low. Left unedited (e.g. a bare
      // Client->API with no Database at all — APIServer.ts's terminal
      // respond() path answers directly with no downstream, single-leg
      // occupancy), this genuinely fails the traffic on its own, so
      // there's still a real problem even before a student adds a
      // Database at all.
      config: { processingTimeMs: 20, maxConcurrent: 3 },
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
  givenNodeIds: ["client", "api"],
  lockedFields: { client: ["requestRate"], api: ["processingTimeMs"] },
  budgetUsd: 800,

  trafficPattern: { type: "constant", rate: 350 },
  durationMs: 10_000,
  seed: 970,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of checkouts succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 200,
      label: "95% of checkouts complete within 200ms",
      unit: "ms",
    },
  ],

  hints: [
    "The API Server's own per-request processing time is fixed here — it isn't a lever you can turn. What lever does the API Server actually have left?",
    "Try raising only the database's capacity, leaving the API Server's concurrency untouched. Does that meaningfully move success rate?",
    "Now try raising only the API Server's own concurrency instead. Compare — and check whether success alone is enough, or whether latency still needs more headroom.",
  ],

  learningGoals: [
    "A fixed per-request processing cost is a real, unavoidable ceiling — no amount of downstream tuning removes it, only enough concurrency to run more of that work in parallel does.",
    "The same symptom (two tiers both at high utilization) can have a completely different real cause each time — diagnose fresh, don't pattern-match from the last problem.",
    "Clearing success rate alone doesn't mean you're done — the same fix often needs a bit more headroom before latency clears too.",
  ],

  optimalSolution: {
    summary:
      "The API Server's concurrency raised enough to run its fixed per-request work in " +
      "genuine parallel, with the database sized modestly — it was never the real ceiling.",
    editorial: [
      "This time, adding a Database without touching the API Server's own concurrency doesn't " +
        "just fail to help — it makes success rate worse. Every request now has a response leg " +
        "to route back through the API Server too, and that server's concurrency was already " +
        "the real ceiling — doubling the work routed through the same small pool bites harder, " +
        "not less.",
      "Raising the API Server's own concurrency helps a lot on success rate, but a small bump " +
        "isn't quite enough to also clear the latency bar — there's a difference between " +
        "'enough capacity to eventually get through' and 'enough headroom that nothing queues " +
        "for long.'",
      "Pushing the API Server's concurrency further, while leaving the database only modestly " +
        "sized (it was never the bottleneck), clears both bars at once. The lesson from the " +
        "other diagnose-the-bottleneck scenarios still applies — verify before you spend — it " +
        "just points the other direction this time.",
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
        config: { processingTimeMs: 20, maxConcurrent: 22, maxQueueLength: 60 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 720, y: 200 },
        config: { maxConnections: 6, maxQueueLength: 40, processingTimeMs: 3 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "db" },
    ],
  },
};
