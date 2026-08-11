/**
 * Parking Reservation Platform — rebuilt on the "given + budget" scenario
 * model (see docs/scenario-redesign.md; reference implementation is
 * movieTicketBooking.ts).
 *
 * MAJOR PIVOT FROM THE OLD SCENARIO — read before touching these numbers.
 *
 * The old scenario's "fix" was a Reverse Proxy: carve the business-critical
 * /checkout route onto its own dedicated API+Database pair, leaving
 * everything else on a slightly-larger catch-all pair. Tuning this onto the
 * given+budget model started by trying to preserve that lesson — and found,
 * repeatedly, that it doesn't survive a real budget gate. `costEngine.ts`'s
 * tiered base pricing is subadditive (ceil(a)+ceil(b) >= ceil(a+b), always),
 * so splitting one pool into two NEVER reduces base cost, and splitting
 * traffic across two smaller pools also loses pooling efficiency (worse
 * latency for the same total capacity — an M/M/c queueing effect). Verified
 * three separate ways, all confirming the same result at rate=400/seed=500:
 *
 *   1. Plain single pool, tightly sized: 100% success, p95 25ms, $719/mo.
 *   2. Same total capacity, split via Reverse Proxy (one route carved out):
 *      100% success, p95 56ms, $859/mo — strictly worse on both cost AND
 *      latency, even after pushing several tighter variants of the split.
 *   3. A "free capacity" framing (a given, unremovable legacy Database with
 *      a hard-locked low ceiling, so routing some load to it is "already
 *      paid for") was also tried: ignoring the legacy DB entirely and
 *      building one fresh pool for all 400 req/s ($799 incl. the idle
 *      legacy DB's own base cost) still beat actually routing load to it
 *      via Reverse Proxy ($829) — the second API+Reverse-Proxy base cost
 *      always outweighs the "free" capacity gained.
 *
 * This is exactly the "reconsider before forcing it" case
 * docs/scenario-redesign.md §4 step 2 warns about (the same conclusion
 * flashSale.ts's own header comment reached for a different reason). So
 * this scenario does NOT use Reverse Proxy as its fix. See §5.10-equivalent
 * note added to docs/scenario-redesign.md for the full writeup.
 *
 * THE LESSON THAT SURVIVED TUNING, AND IS GENUINELY DISTINCT FROM THE OTHER
 * THREE SCENARIOS: at this traffic level, an unconfigured API Server *and*
 * Database both show ~100% utilization at once — but they aren't two
 * independent problems. The API server's slots are stuck waiting on a
 * struggling downstream database (backpressure), not short on their own
 * raw capacity. Raising the API server's own concurrency alone does
 * nothing (verified: maxConcurrent 10->30 with the database left at its
 * default keeps success at 84%, unchanged) because the database was always
 * the true ceiling; sizing the database alone fixes both symptoms at once.
 * Movie Ticket Booking teaches "calculate the ceiling correctly"; this
 * teaches "utilization is a symptom, not a diagnosis — a saturated-looking
 * neighbor can just be waiting on the real bottleneck, so verify a fix
 * actually helps before spending budget on it."
 *
 * Both `requestRate` and `keyPoolSize` are locked on the Client, same
 * "the skew itself is given" reasoning as Flash Sale (large, diverse pool
 * so a Cache can't cheaply dominate the intended lever — verified: with
 * keyPoolSize left at the schema default 50, a cache-fronted build hits
 * composite 0.951 and trivializes the scenario; locked at 1000, the same
 * shape only reaches 0.918, honestly worse than the properly-sized
 * reference's 0.827). `routePoolSize` is left unlocked and largely
 * cosmetic here (the "many services on one shared path" story explains WHY
 * traffic is heavy, without a Reverse-Proxy-based fix depending on it
 * mechanically) — nothing exploitable was found by changing it, unlike
 * keyPoolSize.
 *
 * Verified against the real engine (seed 500, 10s @ 400 req/s, keyPoolSize
 * 1000) via a throwaway tuning script (deleted after use), using the real
 * `scoreScenario` function throughout, never hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms):
 *     84.8% success, p95 346ms, both API and DB at ~100% utilization →
 *     evaluation.passed=false, a genuine capacity failure.
 *   Wrong lever — raise ONLY the API server (maxConcurrent 10->30), DB
 *   left at its default:
 *     84.0% success, p95 225ms → still fails. Confirms the API's high
 *     utilization was backpressure from the database, not its own limit.
 *   Right lever, adequate — raise ONLY the database (13 connections),
 *   API left at its default (10/5ms):
 *     100% success, p95 46ms, $748/mo → gatesPassed=true, composite
 *     0.773, 2★.
 *   Well-optimized — both sized deliberately, processing times tightened
 *   to the schema floor (several variants tried: API concurrency 3-5,
 *   queues 10-30, DB connections 4-13, processing 1ms both sides — all
 *   plateau at the same number, since DB base cost stays in the same
 *   $51.1 tier from 1-20 connections either way):
 *     100% success, p95 24-25ms, $719/mo → composite 0.825-0.827, 3★.
 *   Lazy overprovisioning (API 300/5ms, DB 300conn/10ms — a UI-unreachable
 *   "just keep turning the dial" value, matching movieTicketBooking.ts's
 *   own precedent):
 *     100% success, p95 41ms, $3,225/mo → clears the old constraints fine
 *     but budgetPassed=false, over budget by ~61%.
 *
 * `optimalSolution` is the well-optimized plateau (composite ~0.827) —
 * genuinely hard to beat: neither tighter connection counts nor smaller
 * queues moved it further once processing time hit the schema floor.
 */

import type { Scenario } from "./types";

export const parkingReservationPlatform: Scenario = {
  id: "parking-reservation-platform",
  title: "Parking Reservation Platform",
  difficulty: 3,
  story:
    "A citywide parking reservation platform grew from a single weekend side project into eight " +
    "backend services — accounts, search, checkout, reservation history, payments, notifications, " +
    "live spot inventory, and garage reviews — all still funneled through one shared API tier and " +
    "one shared database from day one. The moment reservations spike, the whole platform slows " +
    "down together, and it looks like everything is struggling at once. Engineering's job is to " +
    "actually figure out what's struggling — and what's just waiting on what — before spending a " +
    "cent fixing the wrong thing.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 400, keyPoolSize: 1000, routePoolSize: 8 },
    },
  ],
  startingConnections: [],
  // requestRate and keyPoolSize describe the fixed shape of the demand
  // itself (see this file's header comment for why keyPoolSize is locked
  // large — a small pool would let a Cache cheaply dominate the intended
  // "diagnose the real bottleneck" lesson). routePoolSize stays unlocked:
  // it's real flavor for why traffic is heavy, but nothing exploitable
  // hinges on it once Reverse Proxy isn't the mechanical fix.
  givenNodeIds: ["client"],
  lockedFields: { client: ["requestRate", "keyPoolSize"] },
  budgetUsd: 2000,

  trafficPattern: { type: "constant", rate: 400 },
  durationMs: 10_000,
  seed: 500,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of requests across all 8 services succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 150,
      label: "95% of requests complete within 150ms",
      unit: "ms",
    },
  ],

  hints: [
    "Drop an unconfigured API Server and Database on the canvas, wire them up, and run it. Check the Inspector — is only one of them near 100% utilization, or both?",
    "If two entities both look saturated at once, that doesn't necessarily mean two independent problems. Try raising just the API server's Max Concurrent and re-running — does it actually move the success rate?",
    "A default Database's raw ceiling is connections x (1000/query time). Does it clear 400 req/s on paper — and if it doesn't, would a faster API server change that ceiling at all?",
    "Once you've found the lever that actually moves the number, tightening Processing Time (not just adding more connections) is what pushes latency down further from there.",
  ],

  learningGoals: [
    "High utilization on two entities at once doesn't always mean two independent bottlenecks — a component waiting on a struggling downstream neighbor looks just as saturated as the neighbor itself.",
    "Verify a fix actually moves the number before spending more budget on it — raising the wrong lever can leave you exactly as broken, just more expensive.",
    "Once the real bottleneck is sized correctly, processing time (not just connection/concurrency count) is what separates an adequate build from a well-optimized one on latency.",
  ],

  capacityEstimate: {
    prompt:
      "The Client sends a fixed 400 req/s. A default, unconfigured Database (5 connections, 15ms " +
      "per query) has a raw ceiling of connections x (1000/query time). Does that clear 400 req/s " +
      "— and if the API server ALSO shows ~100% utilization in that same run, does raising the " +
      "API server's own concurrency create any more room at the database?",
    worked:
      "5 connections x (1000/15ms) = 333 req/s — short of the 400 req/s arriving. The database is " +
      "the real ceiling. The API server's own near-100% utilization in that run isn't a second, " +
      "independent shortage — every request is held in an API server slot for the whole time it " +
      "waits on the database, so a struggling database makes the API server look just as saturated " +
      "as it is, purely from backpressure. Raising the API server's own concurrency doesn't create " +
      "any more room downstream; only sizing the database actually does.",
  },

  reflection: {
    template:
      "This run landed at {{successRate}} success and a p95 latency of {{p95Latency}} — but those " +
      "numbers alone don't say whether you found the real bottleneck or just spent budget on the " +
      "one that looked worst. Check the Budget row and star rating above: a build that sizes the " +
      "database correctly (even leaving the API server at its default) clears every gate; a build " +
      "that raises the API server's concurrency without touching the database doesn't, no matter " +
      "how high. Once the real lever is found, tightening processing time (not just adding more " +
      "connections) is what separates a merely-adequate build from a well-optimized one.",
  },

  optimalSolution: {
    summary:
      "A single, correctly-sized API Server and Database — concurrency and connections right-sized " +
      "for the real 400 req/s ceiling, processing time tightened to reduce latency further. No " +
      "second pool: splitting this traffic never actually pays for itself under a real budget.",
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 400, keyPoolSize: 1000, routePoolSize: 8 },
      },
      {
        id: "api",
        type: "api",
        label: "API Server",
        position: { x: 360, y: 200 },
        config: { maxConcurrent: 5, maxQueueLength: 20, processingTimeMs: 1 },
      },
      {
        id: "database",
        type: "database",
        label: "Database",
        position: { x: 640, y: 200 },
        config: { maxConnections: 11, maxQueueLength: 30, processingTimeMs: 1, failureProbability: 0 },
      },
    ],
    connections: [
      { source: "client", target: "api", latencyMs: 5 },
      { source: "api", target: "database", latencyMs: 5 },
    ],
  },
};
