/**
 * Concert Ticket Drop Confirmations — message-queue-required, difficulty
 * 2, "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts).
 *
 * Same Message Queue lesson as priceAlertNotifications.ts (a Database's
 * own backlog absorbing a burst for free vs. a synchronous client
 * waiting through it vs. a queue decoupling the wait entirely — see that
 * file's header for the full mechanism writeup), a fresh story and
 * numbers. This is the second scenario built on a `burst` trafficPattern
 * — see priceAlertNotifications.ts's header for the workshopBridge.ts fix
 * that made burst-shaped scenarios reach the student at all.
 *
 * Verified against the real engine (seed 930, burst: 350 requests
 * clustered into a 250ms window every 5s, over 15s / 3 cycles, ~1050
 * total requests, average ~70 req/s) via a throwaway tuning script
 * (deleted after use), using the real `scoreScenario` function
 * throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/100queue/15ms, no queue):
 *     54.9% success, p95 350ms, $238/mo → evaluation.passed=false, a
 *     genuine capacity failure — the default Database's admission
 *     capacity can't absorb the burst.
 *   No queue, Database's own backlog raised to admit the whole burst (DB
 *   6conn/400queue/12ms):
 *     100% success (fully admitted) but p95 439ms → fails the latency
 *     constraint — every request in the burst's tail waits synchronously
 *     behind the deep backlog draining through only 6 connections.
 *   No queue, Database brute-force sized to drain the peak near-instantly
 *   (DB 130conn/300queue/12ms):
 *     100% success, p95 37ms → clears both metric constraints, but
 *     $640/mo — over budget.
 *   Message Queue in front, Database sized for the average rate only (MQ
 *   consumerCount8/queue300/dispatch1ms, DB 2conn/50queue/1ms, API
 *   10/200queue/1ms):
 *     100% success, p95 14ms, $367/mo → gatesPassed=true, composite
 *     0.705, 2★ — the only shape that clears success rate, latency, and
 *     budget at once.
 *   Lazy overprovisioning of the queue-fronted shape (MQ
 *   consumerCount20/queue500, DB 20conn/400queue, API 50/200queue — a
 *   UI-unreachable value):
 *     100% success, p95 22ms, $623/mo → clears the metric constraints
 *     fine but over budget — a queue alone doesn't excuse overprovisioning
 *     everything behind it.
 *
 * `optimalSolution` is the queue-fronted, tightly-sized shape (composite
 * 0.705, 2★).
 */

import type { Scenario } from "./types";

export const concertTicketDrop: Scenario = {
  id: "concert-ticket-drop",
  title: "Concert Ticket Drop Confirmations",
  difficulty: 2,
  topics: ["message-queues"],
  story:
    "A ticketing platform opens sales for a popular concert at a fixed time — everyone hits " +
    "'buy' within the same few hundred milliseconds of doors opening, then it's quiet until the " +
    "next drop. Every purchase needs a confirmation, and losing one under load means a fan who " +
    "paid but never got their ticket. Engineering's job is to make every drop feel instant to " +
    "the buyer, without paying to keep the backend permanently sized for a spike that lasts a " +
    "fraction of a second.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 70 },
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
  budgetUsd: 450,

  trafficPattern: { type: "burst", rate: 350, duration: 250, interval: 5000 },
  durationMs: 15_000,
  seed: 930,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.97,
      label: "At least 97% of purchases are confirmed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 200,
      label: "95% of confirmations arrive within 200ms",
      unit: "ms",
    },
  ],

  hints: [
    "Ticket buyers don't trickle in — watch the packet animation on a run. What happens to a synchronous Database's own backlog the instant hundreds of purchases land at once?",
    "A Database's own backlog can absorb a burst for free — it isn't billed. So why would inserting a Message Queue ever be worth it?",
    "The buyer is still waiting the whole time their request sits in a Database's backlog. Is there a component that can confirm the purchase before the actual write has happened?",
    "Once a Message Queue is durably holding a burst, how big does the Database behind it actually need to be — sized for the drop's peak, or for the average rate across drops?",
  ],

  learningGoals: [
    "A synchronous backend can absorb a burst it can't otherwise handle just by raising its own backlog — but every request in that backlog makes the buyer wait, so latency (not capacity) is what actually fails.",
    "A Message Queue confirms a request the instant it's durably admitted, decoupling the buyer's wait from how long the actual downstream write takes.",
    "Once a queue is absorbing bursts, the backend behind it only needs to be sized for the sustained average rate across drops, not the instantaneous peak of any one of them.",
  ],

  optimalSolution: {
    summary:
      "A Message Queue between the API Server and Database, confirming every purchase the " +
      "instant it's durably queued — with the Database itself sized for the average rate " +
      "across drops, not any single drop's peak.",
    editorial: [
      "A Database's own backlog can absorb a 350-purchase burst for free — it isn't billed at " +
        "all. An unconfigured build doesn't fail because the burst is too big; it fails because " +
        "a default Database's small backlog is too small to hold it, and once it's full, the " +
        "overflow is rejected outright.",
      "Raising the Database's own backlog large enough to admit the whole burst directly does " +
        "fix that — every purchase gets in. But the buyer is still waiting synchronously the " +
        "whole time their confirmation sits in that backlog behind everyone ahead of them, so " +
        "the tail of every drop pushes latency well past what a buyer would tolerate.",
      "Brute-force sizing the Database's own connection count high enough to drain the burst " +
        "almost instantly does fix the latency too — but connections (unlike backlog depth) are " +
        "billed, and provisioning enough of them to make a synchronous burst feel instant costs " +
        "far more than the traffic's own average rate would ever justify.",
      "A Message Queue confirms the buyer the instant their purchase is durably queued, " +
        "regardless of how long the eventual database write takes. The Database behind the queue " +
        "only ever needs to keep up with the sustained average rate — a smaller, cheaper " +
        "Database, at near-zero extra cost for the queue itself.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 70 },
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
        config: { consumerCount: 8, maxQueueLength: 300, dispatchTimeMs: 1 },
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
