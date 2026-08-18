/**
 * Ad Auction Bidding Events — message-queue-required, difficulty 3,
 * "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts).
 *
 * Same Message Queue lesson as priceAlertNotifications.ts/
 * concertTicketDrop.ts, a fresh story and numbers.
 *
 * ORIGINALLY DESIGNED AS A QUEUE + DATABASE-TYPE COMBO, LIKE
 * viralVideoComments.ts — abandoned after being DISPROVEN against the
 * real engine, worth recording so it isn't re-attempted: a Message
 * Queue's whole mechanism (MessageQueue.ts) acknowledges the producer
 * the instant a message is durably admitted, on a completely separate,
 * independently-dispatched leg from the eventual database write. That
 * means the Database's own `type`/`processingTimeMs` has ZERO effect on
 * client-facing p95 latency once a queue is in front — verified directly
 * (SQL vs NoSQL behind an identically-configured queue produced the
 * exact same client-facing p95, to the millisecond, only differing
 * slightly in cost). viralVideoComments.ts's cache+database-type combo
 * works specifically because a Cache does NOT decouple client-facing
 * latency the way a Message Queue does; a queue+database-type combo
 * structurally can't reproduce that trick. Filed as a real, permanent
 * property of this engine's queue model, not a tuning gap.
 *
 * Verified against the real engine (seed 960, burst: 400 requests
 * clustered into a 250ms window every 5s, over 15s / 3 cycles), using the
 * real `scoreScenario` function throughout, never hand math, and — as of
 * the DEFAULT_CONNECTION_LATENCY_MS fix (see simulationDefaults.ts) — the
 * real 5ms-per-hop connection latency every live simulation actually
 * applies, not 0ms:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/100queue/15ms, no queue):
 *     47.5% success, p95 365ms, $241/mo → evaluation.passed=false, a
 *     genuine capacity failure.
 *   No queue, Database brute-force sized to drain the peak near-instantly
 *   (DB 130conn/300queue/12ms):
 *     100% success, p95 37ms → clears the metric constraints, but
 *     $663/mo — over budget.
 *   Message Queue in front, Database sized for the average rate (MQ
 *   consumerCount8/queue300/dispatch1ms, DB 15conn/50queue/20ms, API
 *   10/200queue/1ms):
 *     100% success, p95 20ms, $392/mo → gatesPassed=true, composite
 *     0.443, 1★ — the only shape that clears success rate, latency, and
 *     budget at once. (RETUNED after the connection-latency fix: p95 was
 *     14ms/composite 0.552/2★ at the old, incorrect 0ms assumption — the
 *     queue's decoupling still keeps this scenario comfortably passing,
 *     just with less margin now that its two short hops — client→api,
 *     api→queue — carry real latency too.)
 *   Lazy overprovisioning of the queue-fronted shape (a UI-unreachable
 *   value):
 *     100% success, p95 22ms, $662/mo → over budget.
 *
 * `optimalSolution` is the queue-fronted build (composite 0.443, 1★).
 */

import type { Scenario } from "./types";

export const adAuctionBidding: Scenario = {
  id: "ad-auction-bidding",
  title: "Ad Auction Bidding Events",
  difficulty: 3,
  topics: ["message-queues"],
  story:
    "A real-time ad exchange runs an auction round every few seconds — every connected bidder " +
    "fires a bid in the same brief window, then goes quiet until the next round. Every accepted " +
    "bid needs to be durably recorded; losing one under load means an advertiser paid for an " +
    "impression they didn't actually win. Engineering's job is to make sure every round's flood " +
    "of bids lands cleanly, without paying to keep the backend permanently sized for a spike " +
    "that only lasts a fraction of a second.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 80 },
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

  trafficPattern: { type: "burst", rate: 400, duration: 250, interval: 5000 },
  durationMs: 15_000,
  seed: 960,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.97,
      label: "At least 97% of bids are recorded",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 25,
      label: "95% of bids are acknowledged within 25ms",
      unit: "ms",
    },
  ],

  hints: [
    "Bids don't trickle in — every connected bidder fires within the same brief window, every round. What happens to a synchronous Database's own backlog the instant hundreds of bids land at once?",
    "A Database's own backlog can absorb a burst for free — it isn't billed. So why would inserting a Message Queue ever be worth it?",
    "The bidder is still waiting the whole time their bid sits in a Database's backlog. Is there a component that can confirm the bid before the actual write has happened?",
  ],

  learningGoals: [
    "A synchronous backend can absorb a burst it can't otherwise handle just by raising its own backlog — but every request in that backlog makes the caller wait, so latency (not capacity) is what actually fails.",
    "A Message Queue confirms a request the instant it's durably admitted, decoupling the caller's wait from how long the actual downstream write takes.",
    "Once a queue is absorbing bursts, the backend behind it only needs to be sized for the sustained average rate across rounds, not any single round's peak.",
  ],

  optimalSolution: {
    summary:
      "A Message Queue between the API Server and Database, confirming every bid the instant " +
      "it's durably queued — with the Database itself sized for the average rate across " +
      "rounds, not any single round's peak.",
    editorial: [
      "A Database's own backlog can absorb a 400-bid burst for free. An unconfigured build " +
        "fails because a default Database's small backlog is too small to hold it, not because " +
        "the burst itself is unmanageable.",
      "Brute-force sizing the Database's own connection count high enough to drain the burst " +
        "almost instantly does clear the metrics — but connections are billed, and provisioning " +
        "enough of them to make a synchronous burst feel instant costs far more than the " +
        "traffic's own average rate would ever justify.",
      "A Message Queue confirms the bidder the instant their bid is durably queued, regardless " +
        "of how long the eventual database write takes. The Database behind the queue only ever " +
        "needs to keep up with the sustained average rate across rounds — a smaller, cheaper " +
        "Database, at near-zero extra cost for the queue itself.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 80 },
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
        config: { maxConnections: 15, maxQueueLength: 50, processingTimeMs: 20 },
      },
    ],
    connections: [
      { source: "client", target: "api" },
      { source: "api", target: "mq" },
      { source: "mq", target: "db" },
    ],
  },
};
