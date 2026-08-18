/**
 * Price Alert Notifications — the first scenario built specifically to
 * teach Message Queue, on the "given + budget" model (see
 * docs/scenario-redesign.md; reference implementation is
 * movieTicketBooking.ts).
 *
 * ONLY BUILDABLE AFTER A REAL ENGINE FIX, worth recording here: this
 * scenario's traffic is a `burst` pattern (`type: "burst"`), not
 * `constant` like all four earlier scenarios. Before this scenario
 * existed, `workshopBridge.ts`'s `buildSimulationConfig` unconditionally
 * synthesized `{ type: "constant", rate: <Client's requestRate config> }`
 * for every live Workshop run, completely ignoring `Scenario.trafficPattern`
 * — a burst/ramp pattern was only ever read by `scoreScenario`'s
 * `computeOptimalScore` (which re-simulates the *reference* build), never
 * by the student's own run. Every earlier scenario's constant `rate`
 * happened to already match its given Client's locked `requestRate`
 * exactly, so this was invisible. Fixed in `workshopBridge.ts`/
 * `workshopStore.ts` (`ScenarioOptions.trafficPattern`, passed through
 * from `activeScenario?.trafficPattern`) specifically to unblock this
 * scenario — see that fix's own commit/BROWSER-CHECKS entry.
 *
 * WHY THE OTHER OBVIOUS "MESSAGE QUEUE" LESSON DOESN'T WORK: a Message
 * Queue's own admission (`maxQueueLength`) is completely unpriced in
 * `costEngine.ts`, and critically, so is a plain `Database`'s own
 * `maxQueueLength` (only `maxConnections` is billed). That means "just
 * raise the Database's own backlog to survive a burst" is a free,
 * always-available move — a Message Queue can't be motivated by
 * *whether* a burst gets admitted, only by what admission costs in
 * CLIENT-FACING LATENCY: a Database admits synchronously (the client
 * waits behind everyone ahead of it in that backlog), while a
 * MessageQueue.ts acknowledges the producer the instant a message is
 * durably queued, regardless of how long the actual downstream write
 * later takes (see that file's own class doc). That's the real,
 * mechanically-verified lesson this scenario teaches — not "queues admit
 * more," but "queues decouple the client's wait from the backend's own
 * processing time."
 *
 * Verified against the real engine (seed 700, burst: 400 requests/6s
 * window packed into a 200ms clustered arrival, over 18s / 3 cycles,
 * 1200 total requests) via a throwaway tuning script (deleted after use,
 * per docs/Learn-Problem-Solution.md's discipline), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/100queue/15ms, no queue):
 *     42.8% success, p95 357ms, $209/mo → evaluation.passed=false, a
 *     genuine capacity failure — the default Database's admission
 *     capacity (5 connections + 100 backlog = 105) can't absorb a
 *     400-request burst.
 *   No queue, Database's own backlog raised to absorb the burst outright
 *   (DB 6conn/450queue/12ms, API 20/200queue):
 *     100% success (the burst is fully admitted) but p95 591ms — fails
 *     the latency constraint. Every request in the burst's tail waits
 *     synchronously behind the ~450-deep backlog draining through only 6
 *     connections.
 *   No queue, Database brute-force sized to drain the peak near-instantly
 *   (DB 150conn/300queue/12ms):
 *     100% success, p95 38ms → clears both metric constraints, but
 *     $685/mo — over budget. Buying enough raw connections to make a
 *     synchronous burst feel instant is expensive.
 *   Message Queue in front, Database sized for the AVERAGE rate only
 *   (MQ consumerCount10/queue300/dispatch1ms, DB 2conn/50queue/1ms,
 *   API 10/200queue/1ms):
 *     100% success, p95 14ms, $346/mo → gatesPassed=true, composite
 *     0.750, 2★ — the only shape that clears success rate, latency, AND
 *     budget at once.
 *   Lazy overprovisioning of the queue-fronted shape (MQ
 *   consumerCount20/queue500, DB 20conn/400queue, API 50/200queue — a
 *   UI-unreachable "just keep turning every dial up" value, matching
 *   movieTicketBooking.ts's own precedent):
 *     100% success, p95 22ms, $612/mo → clears the metric constraints
 *     fine but over budget — a queue alone doesn't excuse
 *     overprovisioning everything behind it.
 *
 * `optimalSolution` is that same queue-fronted, tightly-sized shape
 * (composite 0.750) — several tighter variants were tried (processing
 * floors both sides, API concurrency 5-10, MQ consumerCount 5-10, DB
 * connections 1-3) and plateaued in the 0.70-0.75 range, genuinely
 * bottlenecked on cost headroom rather than latency or success (both of
 * those are already near-ceiling) — a real, not-arbitrary plateau, if a
 * shallower one than the cache-fronted scenarios manage.
 */

import type { Scenario } from "./types";

export const priceAlertNotifications: Scenario = {
  id: "price-alert-notifications",
  title: "Price Alert Notifications",
  difficulty: 2,
  topics: ["message-queues"],
  story:
    "A stock-trading app lets users set a price alert on any ticker. Alerts don't trickle in " +
    "steadily — the instant a watched price actually crosses its threshold, every user watching " +
    "that ticker needs a notification at once, in a tight burst. Between triggers, the system is " +
    "quiet. Engineering's job is to make sure a burst of alerts never gets lost or makes anyone " +
    "wait, without paying to keep the backend permanently sized for a spike that only happens for " +
    "a fraction of a second at a time.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      // Not the literal traffic shape (this scenario's real demand is a
      // burst — see `trafficPattern` below, honored directly by
      // workshopBridge.ts once a scenario is active) — this is the
      // *average* rate across a burst cycle (400 alerts / 6s), shown here
      // because the Inspector's "Request Rate" field is otherwise a
      // steady-rate control with no burst-shape equivalent. The actual
      // arrival pattern is explained in the story/hints and directly
      // observable in the run's packet animation (clustered, not steady).
      config: { requestRate: 67 },
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
  // Only the demand itself is fixed. Everything downstream — how many
  // components, what kind, how they're sized — is the student's design,
  // not something the scenario hands them (see this file's header comment).
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate"] },
  budgetUsd: 500,

  trafficPattern: { type: "burst", rate: 400, duration: 200, interval: 6000 },
  durationMs: 18_000,
  seed: 700,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.97,
      label: "At least 97% of alerts are delivered",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 250,
      label: "95% of alerts are acknowledged within 250ms",
      unit: "ms",
    },
  ],

  hints: [
    "Alerts don't arrive at a steady rate — watch the packet animation on a run. What actually happens to a synchronous Database's own backlog the instant several hundred requests land at once?",
    "A Database's own backlog (Max Queue Length) can absorb a burst for free — it's not billed. So why would inserting a Message Queue ever be worth it?",
    "The client is still waiting the whole time a request sits in a Database's backlog. Is there a component that can tell the client 'received' before the actual write has happened?",
    "Once a Message Queue is durably holding a burst, how big does the Database behind it actually need to be — sized for the peak, or for the average?",
  ],

  learningGoals: [
    "A synchronous backend can absorb a burst it can't otherwise handle just by raising its own backlog — but every request in that backlog makes the client wait, so latency (not capacity) is what actually fails.",
    "A Message Queue acknowledges a request the instant it's durably admitted, decoupling the client's wait from how long the actual downstream processing takes.",
    "Once a queue is absorbing bursts, the backend behind it only needs to be sized for the sustained average rate, not the instantaneous peak — a real, meaningful cost saving over brute-force sizing.",
  ],

  optimalSolution: {
    summary:
      "A Message Queue between the API Server and Database, acknowledging every alert the " +
      "instant it's durably queued — with the Database itself sized for the average rate, not " +
      "the burst's peak.",
    editorial: [
      "The Database's own backlog (Max Queue Length) can absorb a 400-request burst for free — " +
        "it isn't billed at all. So an unconfigured build doesn't fail on capacity in the usual " +
        "sense; a default Database's small backlog (105 total admission capacity) is simply too " +
        "small to hold the burst, and once it's full, the overflow is rejected outright.",
      "Raising the Database's own backlog large enough to admit the whole burst directly does " +
        "fix that — every alert gets in. But the client is still waiting synchronously the whole " +
        "time its request sits in that backlog behind everyone ahead of it, so the tail of every " +
        "burst pushes p95 latency well past what a real client would tolerate.",
      "Brute-force sizing the Database's own connection count high enough to drain the burst " +
        "almost instantly does fix the latency too — but connections (unlike backlog depth) are " +
        "billed, and provisioning enough of them to make a synchronous burst feel instant costs " +
        "meaningfully more than the traffic's own average rate would ever justify.",
      "A Message Queue sidesteps the tradeoff entirely: it acknowledges the client the instant a " +
        "message is durably queued, regardless of how long the eventual database write takes. " +
        "The Database behind the queue only ever needs to keep up with the *sustained average* " +
        "rate (drain the backlog before the next burst piles more on), not the instantaneous " +
        "peak — a smaller, cheaper Database, at near-zero extra cost for the queue itself.",
      "A common near-miss: adding a Message Queue but then leaving everything else " +
        "generously (or maximally) sized anyway. The queue's value is specifically that it lets " +
        "the rest of the architecture shrink — a queue in front of an oversized API Server and " +
        "Database still clears the metric constraints, it just doesn't clear the budget.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 67 },
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
        config: { consumerCount: 10, maxQueueLength: 300, dispatchTimeMs: 1 },
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
