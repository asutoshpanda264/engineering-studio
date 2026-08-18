/**
 * Flash Sale — SCENARIOS.md's Level 3 "Scalability" scenario, rebuilt on
 * the "given + budget" model (see docs/scenario-redesign.md; reference
 * implementation is movieTicketBooking.ts).
 *
 * TUNING HISTORY — worth reading before touching these numbers:
 *
 * First approach tried (and abandoned): keep the old scenario's "single
 * API server bottleneck, fix = Load Balancer + 2nd API server" lesson by
 * ALSO making the API server a given node with `processingTimeMs` locked
 * (modeling an unavoidable synchronous payment-gateway confirmation),
 * forcing horizontal scaling. That part worked — but with no cache in the
 * picture (checkout writes aren't cacheable) and every request billed
 * through both the API's request AND response leg (APIServer.ts),
 * *usage* cost dominates total cost so heavily (docs/scenario-redesign.md
 * §5.4) that no combination of traffic rate / locked processing time /
 * budget / p95 threshold could reach 3★ without either an unrealistic p95
 * bar (1-2+ seconds) or a "lazy" reference so extreme (10+ replicas) it
 * stopped being a believable comparison. Exactly the "reconsider before
 * forcing it" case §4 step 2 warns about — abandoned.
 *
 * What shipped instead: only the Client is given (same shape as
 * movieTicketBooking.ts). The distinguishing lesson is the Database's own
 * `type` field (sql | nosql — see entityConfigSchema.ts / Database.ts):
 * nosql applies a 3x connection-ceiling multiplier and a 0.5x query-time
 * multiplier — 6x the effective throughput of the same maxConnections/
 * processingTimeMs — at *zero* extra cost (costEngine.ts's databasePricing
 * only ever reads maxConnections, never type). A real, freshly-unused-by-
 * any-other-scenario lever: picking the right database technology for a
 * high-volume write workload beats just buying more SQL connections, and
 * can drop a whole cost tier doing it. Both `requestRate` AND
 * `keyPoolSize` are locked on the Client — see the "why keyPoolSize is
 * locked here" note below, a deliberate departure from this document's
 * own roadmap note (which assumed the abandoned single-API-bottleneck
 * design and didn't anticipate a database-type lesson needing it too).
 *
 * Verified against the real engine (seed 300, 8s @ 400 req/s, keyPoolSize
 * 1000) via a throwaway tuning script (deleted after use), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB sql/5conn/15ms):
 *     85.5% success, p95 346ms, $693/mo → evaluation.passed=false (a
 *     genuine capacity failure — the default SQL pool's own ceiling,
 *     5 x 1000/15 ≈ 333 req/s, falls short of 400 req/s — not just a
 *     budget failure; budgetPassed is actually still true here).
 *   Adequate, properly-sized SQL (API 15/5ms, DB sql/25conn/10ms):
 *     100% success, p95 41ms, $825/mo → gatesPassed=true, composite
 *     0.773, 2★.
 *   Well-optimized, NoSQL (API 5/4ms, DB nosql/5conn/8ms):
 *     100% success, p95 33ms, $714/mo → gatesPassed=true, composite
 *     0.807, 3★ — same functional shape as "adequate," cheaper purely
 *     because NoSQL's multiplier lets a much smaller (cheaper-tier) pool
 *     hit the same ceiling.
 *   Lazy overprovisioning (API 150/5ms, DB sql/150conn/10ms — a UI-
 *   unreachable "just keep turning the dial" value, matching
 *   movieTicketBooking.ts's own precedent of an illustrative, not
 *   necessarily slider-reachable, lazy example):
 *     100% success, p95 41ms, $1,952/mo → clears the old constraints
 *     fine (evaluation.passed=true) but budgetPassed=false, over budget
 *     by ~22%.
 *
 * `optimalSolution` (API 5/1ms, DB nosql/3conn/1ms) was pushed across
 * several tighter variants (processingTimeMs down to its schema floor on
 * both sides, DB connections down to 3, then 1 — plateaued at the same
 * number, confirming 3 wasn't an arbitrary stopping point):
 *
 *   Optimal reference: 100% success, p95 22ms, $715/mo → composite 0.822,
 *   3★ (scored against itself — never legendary by construction, see
 *   scenarioScoring.ts's own split between computeBaseScore and the
 *   public scoreScenario).
 *
 * WHY keyPoolSize IS LOCKED HERE (departure from this doc's own roadmap
 * note, which assumed the abandoned design): nothing stops a student from
 * dropping a Cache in front of the database — and at the Client's
 * schema-*default* keyPoolSize (50, left untouched), a cache trivially
 * beats the optimal reference above (composite 0.862 with keyPoolSize 50
 * — verified). That's not a clever alternate solution, it's the *given
 * traffic itself* getting easier because the pool happens to be small,
 * exactly the loophole §1's origin story called out ("users shouldn't be
 * able to change those configurations which make the problem what they
 * are") — keyPoolSize just wasn't in the "starting entities" in the
 * abandoned design, so nobody had reason to look at it. Locking it to
 * 1000 (many distinct orders across a site-wide sale, not one hot item —
 * see `story` below) keeps a cache a real, exploreable, honestly worse
 * option: even a maximally-sized cache (capacity 500, full pool coverage)
 * at keyPoolSize 1000 only reaches composite 0.804, still short of the
 * 0.822 reference — verified, not assumed.
 */

import type { Scenario } from "./types";

export const flashSale: Scenario = {
  id: "flash-sale",
  title: "Flash Sale",
  difficulty: 3,
  // The lesson is a Database `type` (sql/nosql) capacity tradeoff, not
  // any one dedicated topic in the catalog — a system-design capstone.
  topics: ["system-design"],
  story:
    "A marketplace is running a site-wide flash sale — thousands of different items across the " +
    "entire catalog are discounted at once, not just one hero product. Checkout requests are " +
    "landing on a huge, diverse spread of distinct orders, so there's no small set of repeat " +
    "lookups to lean on. Engineering's job is to design a checkout service that keeps up with " +
    "the write volume, on a budget that survives the sale ending.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 400, keyPoolSize: 1000 },
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
  // Both fields describe the fixed shape of the demand itself: how much
  // traffic arrives, and how spread out across distinct orders it is (see
  // this file's header comment for why keyPoolSize is locked here too —
  // shrinking it would make a cache artificially effective, changing the
  // problem rather than solving it).
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate", "keyPoolSize"] },
  budgetUsd: 1600,

  trafficPattern: { type: "constant", rate: 400 },
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
      threshold: 250,
      label: "95% of requests complete within 250ms",
      unit: "ms",
    },
  ],

  hints: [
    "Drop an unconfigured API Server and Database on the canvas and wire them up. Which one is maxed out — and what's a default Database's own raw ceiling (connections x 1000/query time) against 400 req/s?",
    "You can raise the Database's Max Connections to fix that ceiling — but check the Cost panel as you do. What does that cost by the time it clears 400 req/s?",
    "Open the Database's Inspector panel and look at the Type field. What does switching it actually change about the connection ceiling and query time — and does that fit a workload that's mostly high-volume writes across a huge, diverse set of orders?",
    "With Key Pool Size fixed this large, would a Cache in front of the database actually see many repeat lookups?",
  ],

  learningGoals: [
    "A connection pool's throughput ceiling (connections x 1000/query time) is a number you design for — an unconfigured default database falls short of real traffic before you've made a single decision.",
    "Database type is a real architectural choice, not just a config value: trading SQL's joins/consistency for NoSQL's much higher connection-ceiling and faster per-query time can multiply effective capacity at the *same* dollar cost, for the right access pattern.",
    "Brute-force overprovisioning (cranking a SQL pool sky-high) still clears functional constraints, but the budget catches what raw capacity numbers don't — picking the right tool beats buying more of the wrong one.",
  ],

  capacityEstimate: {
    prompt:
      "The Client sends a fixed 400 req/s for the whole run, spread across 1000 distinct orders " +
      "(not a small repeatable set). A default, unconfigured Database (5 connections, 15ms per " +
      "query) has a raw ceiling of connections x (1000/query time). Does that clear 400 req/s?",
    worked:
      "5 connections x (1000/15ms) = 333 req/s — already short of the 400 req/s arriving, on " +
      "average, before a single burst is considered. An unconfigured Database isn't a neutral " +
      "starting point here; it's already undersized. Raising Max Connections closes that gap, " +
      "but check what it costs as you go — a connection pool's cost tier climbs in fixed steps " +
      "(every 20 connections), and a plain SQL pool sized for real headroom at this volume adds " +
      "up fast. The Database's own Type field is worth a look before reaching for more SQL " +
      "connections.",
  },

  reflection: {
    template:
      "This run landed at {{successRate}} success, {{throughput}} completed, and a p95 latency " +
      "of {{p95Latency}} — but those numbers alone don't say whether you solved this well or " +
      "just expensively. Check the Budget row and star rating above: the same success rate is " +
      "reachable anywhere from a modestly-priced, right-sized database to well over a thousand " +
      "dollars a month just by buying more SQL connections. The database's Type field — SQL vs. " +
      "NoSQL — is usually the real lever here, not fine connection-count tuning.",
  },

  optimalSolution: {
    summary:
      "A NoSQL-type database, minimally sized — its connection-ceiling and query-time multiplier " +
      "does more with a tiny pool than buying a much larger SQL one ever could, at the same cost.",
    editorial: [
      "There's no cache in the intended solution here — checkout writes aren't cacheable, so " +
        "unlike this catalogue's caching-focused scenarios, the lever isn't cutting the volume " +
        "of requests reaching the database.",
      "The real lever is the Database's own `type` field: switching it from SQL to NoSQL " +
        "applies a real connection-ceiling and query-time multiplier — several times the " +
        "effective throughput of the same pool size, at no extra cost. Sizing a SQL pool " +
        "large enough to match that throughput costs meaningfully more for the same result.",
      "A properly-sized SQL build already passes (2 stars) — the database type switch is what " +
        "pushes it further (3 stars) for a lower monthly cost, not a different shape of " +
        "architecture, just a better-chosen technology underneath the same one.",
      "This scenario locks the Client's key pool size specifically because, at the schema's " +
        "smaller default pool, a Cache would trivialize the problem — the traffic's own shape " +
        "is part of what makes the database-type lesson the one worth learning here, not an " +
        "arbitrary restriction.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 400, keyPoolSize: 1000 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 340, y: 200 },
        config: { maxConcurrent: 5, maxQueueLength: 20, processingTimeMs: 1 },
      },
      {
        id: "database",
        type: "database",
        label: "Database",
        position: { x: 600, y: 200 },
        config: {
          type: "nosql",
          maxConnections: 3,
          maxQueueLength: 40,
          processingTimeMs: 1,
          failureProbability: 0,
        },
      },
    ],
    connections: [
      { source: "client", target: "api", latencyMs: 5 },
      { source: "api", target: "database", latencyMs: 5 },
    ],
  },
};
