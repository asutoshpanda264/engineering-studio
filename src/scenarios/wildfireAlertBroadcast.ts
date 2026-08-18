/**
 * Wildfire Alert Broadcast — message-queue-required, difficulty 5, the
 * hardest single-lever queue scenario in the catalogue, "given + budget"
 * model (see docs/scenario-redesign.md; reference implementation is
 * movieTicketBooking.ts). Same Message Queue lesson as
 * flightStatusPushUpdates.ts (difficulty 4), pushed further — a bigger
 * burst, a near-99% success bar, and a p95 constraint tight enough that
 * "no queue, backlog raised" misses it by nearly 20x (785ms vs a 40ms
 * bar).
 *
 * Verified against the real engine (seed 1090, burst: 500 requests
 * clustered into a 200ms window every 5s, over 15s / 3 cycles) via a
 * throwaway tuning script (deleted after use), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/100queue/15ms, no queue):
 *     32.8% success, p95 365ms, $226/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   No queue, Database's own backlog raised to admit the whole burst (DB
 *   6conn/500queue/12ms):
 *     100% success (fully admitted) but p95 785ms → catastrophic latency
 *     failure — every request in the burst's tail waits synchronously
 *     behind the deep backlog draining through only 6 connections.
 *   No queue, Database brute-force sized (DB 160conn/300queue/12ms):
 *     100% success, p95 44ms → clears both metric constraints, but
 *     $792/mo — nearly double the budget.
 *   Message Queue in front, Database sized for the average rate (MQ
 *   consumerCount10/queue450/dispatch1ms, DB 2conn/50queue/1ms, API
 *   10/200queue/1ms):
 *     100% success, p95 15ms, $453/mo → gatesPassed=true, composite
 *     0.554, 2★ — the only shape that clears success rate, latency, and
 *     budget at once.
 *   Lazy overprovisioning of the queue-fronted shape (a UI-unreachable
 *   value):
 *     100% success, p95 22ms, $738/mo → over budget.
 *
 * `optimalSolution` is the queue-fronted build (composite 0.554, 2★).
 */

import type { Scenario } from "./types";

export const wildfireAlertBroadcast: Scenario = {
  id: "wildfire-alert-broadcast",
  title: "Wildfire Alert Broadcast",
  difficulty: 5,
  topics: ["message-queues"],
  story:
    "When a wildfire alert is issued for a region, every resident's phone in that area needs " +
    "an emergency push notification within seconds — hundreds of thousands of devices, all at " +
    "once, then quiet until the next alert. A notification that arrives late, or not at all, " +
    "is not an inconvenience here — it's the entire point of the system failing. Engineering's " +
    "job is to make every alert land near-instantly for a crowd this size, without paying to " +
    "keep the backend permanently sized for an emergency that, thankfully, isn't constant.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 100 },
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
  budgetUsd: 470,

  trafficPattern: { type: "burst", rate: 500, duration: 200, interval: 5000 },
  durationMs: 15_000,
  seed: 1090,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.99,
      label: "At least 99% of residents are notified",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 40,
      label: "95% of alerts arrive within 40ms",
      unit: "ms",
    },
  ],

  hints: [
    "Alerts don't trickle in — an entire region's worth of phones need notifying at once. Watch what a synchronous Database's own backlog does with that.",
    "A Database's own backlog can absorb the burst for free — it isn't billed. So why would inserting a Message Queue ever be worth it?",
    "The resident is still waiting the whole time their notification sits in a Database's backlog. Is there a component that can confirm it before the actual write has happened?",
  ],

  learningGoals: [
    "A synchronous backend can absorb a burst it can't otherwise handle just by raising its own backlog — but at high enough volume, the resulting wait isn't just noticeable, it's catastrophic.",
    "A Message Queue confirms a request the instant it's durably admitted, decoupling the caller's wait from how long the actual downstream write takes.",
    "Once a queue is absorbing bursts, the backend behind it only needs to be sized for the sustained average rate, not any single burst's peak.",
  ],

  optimalSolution: {
    summary:
      "A Message Queue between the API Server and Database, confirming every alert the " +
      "instant it's durably queued — with the Database itself sized for the average rate, not " +
      "any single burst's peak.",
    editorial: [
      "A Database's own backlog can absorb this burst for free. Raising it large enough to " +
        "admit every alert directly does work, functionally — but the resident is waiting " +
        "synchronously the whole time, and at this volume the wait is catastrophic: nearly 20x " +
        "the latency bar.",
      "Brute-force sizing the Database's own connection count high enough to drain the burst " +
        "almost instantly does fix the latency — but connections are billed, and provisioning " +
        "enough of them nearly doubles the budget.",
      "A Message Queue confirms the resident's alert the instant it's durably queued, " +
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
        config: { requestRate: 100 },
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
        config: { consumerCount: 10, maxQueueLength: 450, dispatchTimeMs: 1 },
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
