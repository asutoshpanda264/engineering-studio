/**
 * Newsletter Send Confirmations — message-queue-friendly, difficulty 1,
 * "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts). The gentlest queue scenario
 * in the catalogue — unlike concertTicketDrop.ts/priceAlertNotifications.ts
 * (where a Message Queue is strictly required to pass at all), a
 * synchronous build here already passes on its own; the queue is the
 * clearly best answer, not the only passing one — same "better, not
 * required" framing movieTicketBooking.ts/urlShortener.ts use for Cache.
 *
 * Verified against the real engine (seed 990, burst: 150 requests
 * clustered into a 200ms window every 5s, over 15s / 3 cycles) via a
 * throwaway tuning script (deleted after use), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/100queue/15ms, no queue):
 *     100% success, p95 277ms, $179/mo → evaluation.passed=false, a
 *     genuine latency failure (queueing delay through the default
 *     backlog).
 *   No queue, Database's own backlog raised (DB 5conn/200queue/12ms):
 *     100% success, p95 191ms, $210/mo → gatesPassed=true, composite
 *     0.545, 2★ — passes, but with thin latency headroom.
 *   No queue, Database brute-force sized (DB 60conn/150queue/12ms):
 *     100% success, p95 37ms, $314/mo → gatesPassed=true, composite
 *     0.652, 2★ — better latency, but costs more for it.
 *   Message Queue in front, Database sized for the average rate (MQ
 *   consumerCount5/queue150/dispatch1ms, DB 1conn/30queue/1ms):
 *     100% success, p95 14ms, $223/mo → gatesPassed=true, composite
 *     0.769, 2★ — the best composite of any passing shape, cheaper AND
 *     faster than brute-force sizing.
 *   Lazy overprovisioning of the queue-fronted shape (a UI-unreachable
 *   value):
 *     100% success, p95 22ms, $470/mo → over budget.
 *
 * `optimalSolution` is the queue-fronted build (composite 0.769, 2★).
 */

import type { Scenario } from "./types";

export const newsletterSendConfirmations: Scenario = {
  id: "newsletter-send-confirmations",
  title: "Newsletter Send Confirmations",
  difficulty: 1,
  topics: ["message-queues"],
  story:
    "A newsletter tool sends out a batch of emails whenever an editor hits 'publish' — a small " +
    "flurry of send requests all at once, then quiet until the next issue goes out. Every send " +
    "needs a confirmation logged, but nobody's staring at a loading spinner waiting for it. " +
    "Engineering's job is to record every send reliably, without over-provisioning a backend " +
    "that's idle most of the time.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 30 },
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
  budgetUsd: 350,

  trafficPattern: { type: "burst", rate: 150, duration: 200, interval: 5000 },
  durationMs: 15_000,
  seed: 990,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of sends are confirmed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 250,
      label: "95% of confirmations arrive within 250ms",
      unit: "ms",
    },
  ],

  hints: [
    "Sends don't trickle in — every batch fires at once, right when an editor publishes. Watch what a Database's own backlog does with that.",
    "A properly-sized synchronous build (Database sized generously, no queue) already passes here. Is there a shape that does the same job for less?",
    "A Message Queue confirms a send the instant it's durably queued, rather than making the caller wait through the database's own backlog.",
  ],

  learningGoals: [
    "A synchronous backend can pass a burst scenario on raw capacity alone — a Message Queue isn't always strictly required, but it's often the cheaper, faster way to get there.",
    "A Message Queue confirms a request the instant it's durably admitted, decoupling the caller's wait from how long the actual downstream write takes.",
    "Comparing a few different passing shapes side by side is worth doing — 'it passes' and 'it's the best passing shape' aren't the same question.",
  ],

  optimalSolution: {
    summary:
      "A Message Queue between the API Server and Database, confirming every send the instant " +
      "it's durably queued — cheaper and faster than sizing the Database alone to absorb the " +
      "burst.",
    editorial: [
      "A synchronous build already passes here if the Database's backlog is generous enough — " +
        "this scenario doesn't strictly require a queue the way some of the others do. But it's " +
        "worth checking what that passing build actually costs.",
      "Sizing the Database's connections up instead of just its backlog gets better latency, but " +
        "costs noticeably more — you're paying for enough raw throughput to drain a burst almost " +
        "instantly, most of which sits idle between publishes.",
      "A Message Queue confirms the send the instant it's durably queued, regardless of how long " +
        "the eventual database write takes. The Database behind it only needs to keep up with " +
        "the sustained average rate — cheaper AND faster than either synchronous option.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 30 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 320, y: 200 },
        config: { maxConcurrent: 8, maxQueueLength: 80, processingTimeMs: 1 },
      },
      {
        id: "mq",
        type: "message_queue",
        label: "Message Queue",
        position: { x: 560, y: 200 },
        config: { consumerCount: 5, maxQueueLength: 150, dispatchTimeMs: 1 },
      },
      {
        id: "db",
        type: "database",
        label: "Database",
        position: { x: 800, y: 200 },
        config: { maxConnections: 1, maxQueueLength: 30, processingTimeMs: 1 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "mq" },
      { source: "mq", target: "db" },
    ],
  },
};
