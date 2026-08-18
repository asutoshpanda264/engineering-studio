/**
 * Movie Ticket Booking — SCENARIOS.md's Level 1 "Foundations" scenario.
 *
 * Reference implementation of the "given + budget" scenario model (see
 * scenarios/types.ts's `givenNodeIds`/`lockedFields`/`budgetUsd` and
 * `src/lib/scenarioScoring.ts`) — the first scenario rebuilt this way,
 * meant to be the recipe for the other three. Replaces the old model,
 * where the starting graph was already a finished Client→API→Database
 * architecture and the "fix" was raising a single config field (Max
 * Connections). That taught dial-turning, not design, and nothing stopped
 * a student from just cranking a field arbitrarily high — no cost to it.
 *
 * The only thing on the canvas at the start is the Client, with its
 * request rate locked (`givenNodeIds`/`lockedFields` below) — the fixed
 * demand the student has to design for, not a lever to weaken. Everything
 * else is a blank canvas; the student builds the booking service from
 * scratch, under a real monthly budget.
 *
 * REVISION NOTE (second tuning pass): the first pass used 80 req/s and
 * budgetUsd=550. Verified in the browser that a totally unconfigured
 * build (Client→API Server→Database, every field left at its
 * entityConfigSchema.ts default — API maxConcurrent 10/proc 5ms; Database
 * maxConnections 5/query 15ms/queue 100) passed with 100% success, p95
 * 46ms, $233/mo, 3 stars, zero design decisions made. 80 req/s was simply
 * too low relative to a *default* Database's own raw ceiling (5 × 1000/15
 * = 333 req/s) to ever require real sizing — the fixed demand has to
 * actually stress an unconfigured build, or the whole "no free win"
 * premise this scenario exists to teach doesn't hold.
 *
 * Retuned to 370 req/s — just over that same default ceiling — and
 * budgetUsd raised to $1,100 to match the larger traffic volume. Verified
 * against the real engine (seed 100, 10s @ 370 req/s) via a throwaway
 * tuning script (deleted after use, per docs/Learn-Problem-Solution.md's
 * discipline), using the actual `scoreScenario` function, not hand math:
 *
 *   Defaults, unconfigured (API 10/5ms, DB 5conn/15ms/queue100):
 *     92.1% success, p95 349ms, $660/mo → constraints genuinely fail
 *     (not just budget) — gatesPassed=false, 0★
 *   Properly sized, no cache (API 8/5ms, DB 12conn/12ms):
 *     100% success, p95 43ms, $691/mo → gatesPassed=true, 2★
 *   Lazy overprovisioning (API 200/5ms, DB 200conn/15ms — the old
 *   "just raise the dial" fix):
 *     100% success, p95 46ms, $2,305/mo → over budget by >2x, 0★
 *   Cache-fronted, well-sized (API 5/4ms, Cache cap 45, DB 3conn/8ms):
 *     100% success, p95 43ms, $496/mo (92.1% hit rate) → gatesPassed=true,
 *     composite 0.802, 3★
 *
 * The default-config build failing on its own capacity (not merely its
 * cost) is the cleaner story: budgetUsd's job stays "stop wasteful
 * overprovisioning specifically," not "catch everything."
 *
 * `optimalSolution` (revealable reference build + the "legendary" tier for
 * beating it — see types.ts's OptimalSolution) was found by pushing the
 * cache-fronted shape further: capacity 50 (the Client's full key pool, so
 * nearly every request should hit), processing times at their schema
 * floor (1ms), connections/concurrency at the cheapest cost tier. Several
 * further variants (single DB connection, tighter queues) were tried and
 * plateaued at the same number — a real, not-arbitrary ceiling for this
 * shape of build, not just the first thing that worked:
 *
 *   Optimal reference (API maxConcurrent 5/queue20/proc1ms, Cache
 *   capacity50/ttl10000/lru, DB maxConnections2/queue15/proc1ms):
 *     100% success, p95 22ms, $484/mo → composite 0.829, 3★
 *
 * Beating 0.829 is possible (nothing here is proven mathematically
 * maximal) but requires a genuinely different idea, not just nudging these
 * same numbers further — that gap is what "legendary" is for.
 */

import type { Scenario } from "./types";

export const movieTicketBooking: Scenario = {
  id: "movie-ticket-booking",
  title: "Movie Ticket Booking",
  difficulty: 2,
  // "Calculate the ceiling correctly, then cache" (see header) — the
  // reference "given + budget" capstone.
  topics: ["caching", "system-design"],
  story:
    "A movie theater chain is about to open ticket sales for a blockbuster release. " +
    "Thousands of fans will hit the booking page the instant sales go live, all trying " +
    "to reserve seats for the same few showtimes within seconds of each other. The " +
    "demand itself is fixed — engineering's job is to design a booking service that " +
    "actually serves it, on a budget that won't get laughed out of a planning meeting.",

  startingEntities: [
    {
      id: "client",
      type: "client",
      label: "Client",
      position: { x: 80, y: 200 },
      config: { requestRate: 370 },
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
  budgetUsd: 1100,

  trafficPattern: { type: "constant", rate: 370 },
  durationMs: 10_000,
  seed: 100,

  constraints: [
    {
      id: "success-rate",
      metric: "successRate",
      comparator: "gte",
      threshold: 0.95,
      label: "At least 95% of booking requests succeed",
      unit: "%",
    },
    {
      id: "p95-latency",
      metric: "p95Latency",
      comparator: "lte",
      threshold: 300,
      label: "95% of requests complete within 300ms",
      unit: "ms",
    },
  ],

  hints: [
    "The Client's request rate is fixed at 370 req/s — you can't design your way out of it. What actually determines how much of that a database connection pool can drain, before you touch a single other setting?",
    "Dropping default-configured components onto the canvas and connecting them isn't the same as sizing them for this traffic. What's a default Database's own raw ceiling, at its default connection count and query time — does it even clear 370 req/s on paper?",
    "Two builds can both clear the success-rate bar — one for a few hundred dollars a month, one for well over a thousand. What's the expensive one actually buying that the cheap one isn't?",
    "Is there a cheaper way to keep repeat lookups from ever reaching the database at all?",
  ],

  learningGoals: [
    "A connection pool's throughput ceiling is connections × (1000 / processing time) — a number you design for, not one that takes care of itself at default settings.",
    "Budget turns 'just add more capacity' from a free move into a real tradeoff — the same success rate is reachable at wildly different costs.",
    "Efficient sizing (or a cache absorbing repeat work) beats brute-force overprovisioning, and it's the cheaper win, not just the cleverer one.",
  ],

  capacityEstimate: {
    prompt:
      "The Client will send a fixed 370 req/s for the whole run. If your Database has N " +
      "connections and each query takes T ms, its raw ceiling is N × (1000/T) req/s. A " +
      "default, unconfigured Database (5 connections, 15ms per query) — what's its ceiling, " +
      "and does it even average out to 370 req/s on paper, before bursts are considered at all?",
    worked:
      "5 connections × (1000/15ms) = 333 req/s — already short of the 370 req/s arriving, on " +
      "average, before a single burst is accounted for. Dropping default-configured " +
      "components onto the canvas isn't a neutral starting point here; it's already an " +
      "undersized one. Real traffic arrives in bursts, not evenly spaced, so a pool sized to " +
      "just barely clear (or fall short of) the average has nowhere for those bursts to go but " +
      "the queue, then rejection. A pool with real headroom — a raw ceiling meaningfully above " +
      "370, not just at or under it — is what actually survives contact with real traffic.",
  },

  reflection: {
    template:
      "This run landed at {{successRate}} success, {{throughput}} completed, and a p95 " +
      "latency of {{p95Latency}} — but those numbers alone don't say whether you solved this " +
      "well or just expensively. Check the Budget row and star rating above: the exact same " +
      "success rate is reachable anywhere from a few hundred dollars a month (a tightly sized " +
      "pool, or a cache absorbing repeat lookups before they ever reach the database) to well " +
      "over a thousand (just buying more of everything). Cost is the tell for which one you " +
      "actually built.",
  },

  optimalSolution: {
    summary:
      "A cache sized to hold the Client's entire key pool — so nearly every request is " +
      "answered without ever reaching the database — in front of a minimally-sized pool " +
      "underneath it.",
    editorial: [
      "Left completely unconfigured, this architecture doesn't fail on cost — it fails on " +
        "raw capacity. A default API Server and Database can only push about 333 requests " +
        "per second through them; the traffic this scenario hands you is higher than that. " +
        "No amount of budget saves an architecture that can't physically keep up.",
      "The fix isn't 'turn every dial up' — that clears the capacity bar but blows the " +
        "budget by more than 2x. Sizing the API Server and Database properly (not maximally) " +
        "already gets you a passing, 2-star build for a fraction of the cost.",
      "The real lever is a Cache in front of the Database, sized to hold the Client's whole " +
        "key pool. Once nearly every request can be answered from cache, the Database barely " +
        "needs to be touched at all — its own sizing (and its cost) collapses along with the " +
        "traffic actually reaching it. That's the 3-star shape: not bigger components, fewer " +
        "requests reaching the expensive one.",
      "A common near-miss: sizing the cache too small. If it can't hold the full key pool, a " +
        "meaningful slice of traffic still falls through to the database on every run, and " +
        "you're back to paying for capacity you thought the cache had already solved.",
    ],
    entities: [
      {
        id: "client",
        type: "client",
        label: "Client",
        position: { x: 80, y: 200 },
        config: { requestRate: 370 },
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
        config: { capacity: 50, evictionPolicy: "lru", ttlMs: 10_000 },
      },
      {
        id: "database",
        type: "database",
        label: "Database",
        position: { x: 860, y: 200 },
        config: { maxConnections: 2, maxQueueLength: 15, processingTimeMs: 1, failureProbability: 0 },
      },
    ],
    connections: [
      { source: "client", target: "api", latencyMs: 5 },
      { source: "api", target: "cache", latencyMs: 5 },
      { source: "cache", target: "database", latencyMs: 5 },
    ],
  },
};
