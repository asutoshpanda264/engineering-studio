/**
 * Flight Status Push Updates — message-queue-required, difficulty 4,
 * "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts). Same Message Queue lesson as
 * priceAlertNotifications.ts/concertTicketDrop.ts, one notch harder — a
 * bigger burst, tighter constraints, and a much wider gap between "no
 * queue, backlog raised" and passing (p95 nearly 700ms), making the
 * latency failure impossible to miss.
 *
 * Verified against the real engine (seed 1040, burst: 450 requests
 * clustered into a 200ms window every 5s, over 15s / 3 cycles) via a
 * throwaway tuning script (deleted after use), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/100queue/15ms, no queue):
 *     37.3% success, p95 367ms, $225/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   No queue, Database's own backlog raised to admit the whole burst (DB
 *   6conn/450queue/12ms):
 *     100% success (fully admitted) but p95 699ms → fails latency badly
 *     — every request in the burst's tail waits synchronously behind the
 *     deep backlog draining through only 6 connections.
 *   No queue, Database brute-force sized (DB 150conn/300queue/12ms):
 *     100% success, p95 38ms → clears both metric constraints, but
 *     $769/mo — over budget.
 *   Message Queue in front, Database sized for the average rate (MQ
 *   consumerCount10/queue400/dispatch1ms, DB 2conn/50queue/1ms, API
 *   10/200queue/1ms):
 *     100% success, p95 15ms, $422/mo → gatesPassed=true, composite
 *     0.630, 2★ — the only shape that clears success rate, latency, and
 *     budget at once.
 *   Lazy overprovisioning of the queue-fronted shape (a UI-unreachable
 *   value):
 *     100% success, p95 22ms, $700/mo → over budget.
 *
 * `optimalSolution` is the queue-fronted build (composite 0.630, 2★).
 */

import type { Scenario } from "./types";

export const flightStatusPushUpdates: Scenario = {
  id: "flight-status-push-updates",
  title: "Flight Status Push Updates",
  difficulty: 4,
  topics: ["message-queues"],
  story:
    "When a flight's status changes — gate assignment, delay, boarding — every passenger " +
    "tracking that flight needs a push notification at once, and a single popular route can " +
    "have hundreds of people watching it. Between status changes, the system is quiet. A " +
    "passenger who doesn't get notified in time can miss their gate change. Engineering's job " +
    "is to make every update land fast for a crowd this size, without paying to keep the " +
    "backend permanently sized for a spike that lasts a fraction of a second.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 90 },
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
  budgetUsd: 440,

  trafficPattern: { type: "burst", rate: 450, duration: 200, interval: 5000 },
  durationMs: 15_000,
  seed: 1040,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.98,
      label: "At least 98% of passengers are notified",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 100,
      label: "95% of notifications arrive within 100ms",
      unit: "ms",
    },
  ],

  hints: [
    "Notifications don't trickle in — every status change fires to hundreds of trackers at once. Watch what happens to a synchronous Database's own backlog.",
    "A Database's own backlog can absorb the burst for free — it isn't billed. So why would inserting a Message Queue ever be worth it?",
    "The passenger is still waiting the whole time their notification sits in a Database's backlog. Is there a component that can confirm it before the actual write has happened?",
  ],

  learningGoals: [
    "A synchronous backend can absorb a burst it can't otherwise handle just by raising its own backlog — but every request in that backlog makes the caller wait, and at high enough volume that wait gets severe, not just noticeable.",
    "A Message Queue confirms a request the instant it's durably admitted, decoupling the caller's wait from how long the actual downstream write takes.",
    "Once a queue is absorbing bursts, the backend behind it only needs to be sized for the sustained average rate, not any single burst's peak.",
  ],

  optimalSolution: {
    summary:
      "A Message Queue between the API Server and Database, confirming every notification the " +
      "instant it's durably queued — with the Database itself sized for the average rate, not " +
      "any single burst's peak.",
    editorial: [
      "A Database's own backlog can absorb this burst for free — it isn't billed. Raising it " +
        "large enough to admit every notification directly does work, functionally. But the " +
        "passenger is waiting synchronously the whole time their notification sits in that " +
        "backlog, and at this volume the wait is severe — nearly 700ms at the tail, not just " +
        "noticeable.",
      "Brute-force sizing the Database's own connection count high enough to drain the burst " +
        "almost instantly does fix the latency too — but connections are billed, and " +
        "provisioning enough of them costs far more than the traffic's own average rate would " +
        "ever justify.",
      "A Message Queue confirms the passenger's notification the instant it's durably queued, " +
        "regardless of how long the eventual database write takes. The Database behind the " +
        "queue only ever needs to keep up with the sustained average rate — a smaller, cheaper " +
        "Database, at near-zero extra cost for the queue itself.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 90 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 320, y: 200 },
        config: { maxConcurrent: 10, maxQueueLength: 200, processingTimeMs: 1 },
      },
      {
        id: "mq",
        type: "message_queue",
        label: "Message Queue",
        position: { x: 560, y: 200 },
        config: { consumerCount: 10, maxQueueLength: 400, dispatchTimeMs: 1 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 800, y: 200 },
        config: { maxConnections: 2, maxQueueLength: 50, processingTimeMs: 1 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "mq" },
      { source: "mq", target: "db" },
    ],
  },
};
