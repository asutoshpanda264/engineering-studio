/**
 * URL Shortener — rebuilt on the "given + budget" scenario model (see
 * docs/scenario-redesign.md; reference implementation is
 * movieTicketBooking.ts).
 *
 * The lesson is a small, skewed hot-key pool: a handful of viral links get
 * clicked far more than everything else combined (Client.keyPoolSize=30 —
 * TrafficGenerator's squared draw concentrates most requests on the lowest
 * few of those 30 keys). That skew is exactly what a Cache is for, and
 * it's the real cost lever here (docs/scenario-redesign.md §5.4): a cache
 * absorbing repeat lookups cuts the *volume* of requests actually reaching
 * the database, which is what usage-based billing charges for.
 *
 * BOTH `requestRate` and `keyPoolSize` are locked on the given Client — a
 * departure from a plain single-field lock, deliberate for the same
 * reason flashSale.ts locks `keyPoolSize` too: shrinking the pool would
 * make a cache artificially more effective, cheapening the given traffic
 * itself rather than actually solving it (see §4 step 2 / §5.9 of the
 * redesign doc).
 *
 * GENERIC MACHINERY FIX DISCOVERED WHILE TUNING THIS SCENARIO: the
 * original tuning pass found that wiring the Client straight to a
 * Database or Cache — skipping the API Server entirely — was cheaper
 * than any real architecture under this app's cost model (API pricing is
 * the one meaningfully-taxed compute tier), so it trivially "solved" this
 * scenario, and separately verified to also beat the *already-shipped*
 * movieTicketBooking.ts's own optimalSolution and score "legendary" there
 * too — a real gap in the shared scoring machinery, not a number to
 * retune per scenario. Fixed generically in
 * src/lib/architectureValidation.ts's `hasUnguardedBackendAccess`, wired
 * into `scoreScenario` as a new `architectureValid` gate (see
 * scenarioScoring.ts) — a Database/Cache/Message Queue/Kafka/Replica Pool
 * must never be reachable from a Client without passing through an API
 * Server first. Every number below was verified *after* that fix landed.
 *
 * Verified against the real engine (seed 200, 8s @ 400 req/s, keyPoolSize
 * 30) via a throwaway tuning script (deleted after use, per
 * docs/Learn-Problem-Solution.md's discipline), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms):
 *     87.7% success, p95 347ms, $693/mo (well under any reasonable
 *     budget) → evaluation.passed=false, a genuine capacity failure — a
 *     default DB's own ceiling (5 × 1000/15 ≈ 333 req/s) falls short of
 *     400 req/s, not just a cost failure.
 *   Adequate, no cache (API 15/5ms, DB 15conn/10ms):
 *     100% success, p95 41ms, $761/mo → gatesPassed=true, composite
 *     0.682, 2★.
 *   Adequate, no cache, but tightened hard (API 15/1ms, DB 5conn/1ms —
 *   proving raw sizing alone plateaus, it isn't a substitute for caching):
 *     100% success, p95 25ms, $762/mo → composite 0.735, still 2★. Usage
 *     cost (billed per request that actually reaches the database) is
 *     what a cache cuts and raw sizing can't.
 *   Cache-fronted, well-sized (API 5/1ms, Cache 30/lru/ttl0, DB
 *   1conn/1ms) — several variants tried (capacity 30-40, concurrency
 *   2-5, queue lengths 3-30), all plateauing at the same number:
 *     100% success, p95 22ms, $510/mo → composite 0.805, 3★.
 *   Lazy overprovisioning (API 150/5ms, DB 150conn/10ms — a UI-
 *   unreachable "just keep turning the dial" value, matching
 *   movieTicketBooking.ts's own precedent):
 *     100% success, p95 41ms, $1,939/mo → clears the old constraints
 *     fine but budgetPassed=false, over budget by ~38%.
 *
 * `optimalSolution` is that same cache-fronted plateau (composite 0.805) —
 * genuinely hard to beat: neither tighter sizing nor a bigger cache moved
 * it further, only skipping the API Server did (closed above), so nothing
 * legitimate currently beats it.
 */

import type { Scenario } from "./types";

export const urlShortener: Scenario = {
  id: "url-shortener",
  title: "URL Shortener",
  difficulty: 1,
  story:
    "A link-shortening service is popular because of a handful of viral posts — the same " +
    "few short links get clicked millions of times, while the long tail barely gets touched " +
    "at all. Engineering's job is to design a resolution service that keeps up with that " +
    "traffic, on a budget that won't get laughed out of a planning meeting.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 400, keyPoolSize: 30 },
    },
  ],
  startingConnections: [],
  // Both fields describe the fixed shape of the demand itself: how much
  // traffic arrives, and how concentrated it is on a small set of hot
  // links (see this file's header comment for why keyPoolSize is locked
  // too — shrinking it would make a cache artificially effective, an easy
  // out rather than the real lesson).
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate", "keyPoolSize"] },
  budgetUsd: 1400,

  trafficPattern: { type: "constant", rate: 400 },
  durationMs: 8_000,
  seed: 200,

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
      threshold: 100,
      label: "95% of requests complete within 100ms",
      unit: "ms",
    },
  ],

  hints: [
    "Drop an unconfigured API Server and Database on the canvas and wire them up. What's a default Database's own raw ceiling (connections x 1000/query time) against 400 req/s?",
    "You can raise the Database's Max Connections to clear that ceiling — but watch the Budget row as you do. What does it cost by the time it clears 400 req/s?",
    "How many distinct keys are actually being requested? Check the Client's Key Pool Size in the Inspector — does the traffic look like 400 truly unique lookups a second, or the same handful repeating?",
    "Is there a component in the library whose entire job is to remember an answer instead of recomputing it — and where would it need to sit to keep expensive lookups from ever reaching the database at all?",
  ],

  learningGoals: [
    "A small, skewed set of hot keys is exactly what a cache is for — most 'repeated work' is really the same few keys, over and over.",
    "A connection pool's throughput ceiling is a number you design for — an unconfigured default database falls short of real traffic before you've made a single decision.",
    "Caching moves load off a bottleneck without touching its capacity — and because usage cost is billed per request that actually reaches a priced entity, cutting real request volume is a cost lever raw sizing alone can't match.",
  ],

  capacityEstimate: {
    prompt:
      "The Client sends a fixed 400 req/s for the whole run. A default, unconfigured Database " +
      "(5 connections, 15ms per query) has a raw ceiling of connections x (1000/query time). " +
      "Does that clear 400 req/s?",
    worked:
      "5 connections x (1000/15ms) = 333 req/s — already short of the 400 req/s arriving, on " +
      "average, before a single burst is considered. An unconfigured Database isn't a neutral " +
      "starting point here; it's already undersized. Raising Max Connections closes that gap, " +
      "but every connection is billed whether or not it's ever used — a pool sized for raw " +
      "capacity alone gets expensive fast. With only 30 distinct keys actually being requested, " +
      "most of that traffic is answering the same question over and over — a much cheaper thing " +
      "to fix than buying more connections.",
  },

  reflection: {
    template:
      "This run landed at {{successRate}} success, {{throughput}} completed, and a p95 latency " +
      "of {{p95Latency}} — but those numbers alone don't say whether you solved this well or " +
      "just expensively. Check the Budget row and star rating above: the same success rate is " +
      "reachable anywhere from a tightly-sized, cache-fronted build for a few hundred dollars a " +
      "month to well over a thousand just by buying more database connections. With traffic this " +
      "concentrated on a small set of keys, a cache absorbing repeat lookups is the cheaper win — " +
      "raw sizing alone plateaus long before it gets there.",
  },

  optimalSolution: {
    summary:
      "A cache sized to hold the Client's entire key pool — so nearly every request is answered " +
      "without ever reaching the database — in front of a minimally-sized pool underneath it.",
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 400, keyPoolSize: 30 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 340, y: 200 },
        config: { maxConcurrent: 5, maxQueueLength: 20, processingTimeMs: 1 },
      },
      {
        id: "cache",
        type: "cache",
        label: "Cache",
        position: { x: 600, y: 200 },
        config: { capacity: 30, evictionPolicy: "lru", ttlMs: 0 },
      },
      {
        id: "database",
        type: "database",
        label: "Database",
        position: { x: 860, y: 200 },
        config: { maxConnections: 1, maxQueueLength: 15, processingTimeMs: 1, failureProbability: 0 },
      },
    ],
    connections: [
      { source: "client", target: "api", latencyMs: 5 },
      { source: "api", target: "cache", latencyMs: 5 },
      { source: "cache", target: "database", latencyMs: 5 },
    ],
  },
};
