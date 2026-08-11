/**
 * Deep-dive content for the standalone `/entities/[slug]` pages — separate
 * from `entityEducation.ts` (which is Inspector-only, paragraph-length) and
 * from `docs/Entities.md` (which is written for contributors, not users).
 *
 * This is where the fuller "textbook" content lives: industry examples,
 * tradeoffs, pros/cons, a practical usage guide (where it connects, normal
 * config, extremes, edge cases worth trying), and — the most important
 * section — named failure modes with concrete, reproducible steps for
 * triggering each one in the Workshop using this project's actual config
 * field labels.
 *
 * Deliberately independent of what the Inspector panel currently shows.
 * Nothing here assumes anything gets removed from InspectorPanel.tsx —
 * that's a separate decision for later, once this content exists to point
 * to instead.
 */

import type { EntityType } from "@/simulation/types";
import type { ScenarioEntity } from "@/scenarios/types";
import type { ConnectionConfig } from "@/simulation/types";

export interface Tradeoff {
  title: string;
  description: string;
}

/**
 * A config change that addresses (fully or partially) a failure mode's
 * demo — surfaced as one card in the "Try It" page's Remedies panel. Just
 * a config override on one already-present node — the cheap, common case
 * (Cache's stampedeMode, Load Balancer's algorithm, ...). See
 * `ArchitectureRemedy` for the other kind: a remedy whose real-world fix
 * is adding a new component instead.
 */
export interface ConfigRemedy {
  kind: "config";
  id: string;
  label: string;
  /** Plain-language explanation of why this helps — and, where relevant, what it doesn't fix. */
  description: string;
  /** Which node in the demo's startingEntities this override applies to. */
  nodeId: string;
  /** Merged onto that node's config when this remedy is applied. */
  configOverride: Record<string, unknown>;
}

/**
 * A remedy whose real-world fix is adding a new component — a Load
 * Balancer, a Circuit Breaker — not flipping an existing field. Applying
 * one doesn't auto-build the fix: it resets the canvas to the demo's
 * baseline and enables a scoped drag-and-drop palette (see
 * `RemediesPanel.tsx`'s `ArchitectureRemedyPalette` and
 * `failureDemoStore.ts`'s `addNode`/`onConnect`) restricted to
 * `allowedComponentTypes`, plus `instructions` walking through building it
 * — the student wires it up themselves, same "build before reading"
 * philosophy the real Workshop already teaches. `Compare` never touches
 * whatever the student has (or hasn't) built — it always measures
 * `referenceEntities`/`referenceConnections`, a separately hand-authored,
 * tuning-verified "what a correct fix looks like" architecture (same
 * verification discipline `FailureModeDemo`'s own doc describes), fresh,
 * every time. See `docs/Learn-Problem-Solution.md`'s architecture-change
 * remedies section for the full design writeup and how to add the next one.
 */
export interface ArchitectureRemedy {
  kind: "architecture";
  id: string;
  label: string;
  description: string;
  /** Numbered steps shown while this remedy is active — the manual "how to build it" guide. */
  instructions: string[];
  /** Component types the scoped palette offers while this remedy is active. */
  allowedComponentTypes: EntityType[];
  /** The correct fix, fully wired — used only to compute Compare's "with remedy" numbers. Never auto-applied to the student's canvas. */
  referenceEntities: ScenarioEntity[];
  referenceConnections: ConnectionConfig[];
}

export type Remedy = ConfigRemedy | ArchitectureRemedy;

/**
 * A pre-built, fixed-seed architecture that reliably reproduces one
 * FailureMode, plus the remedies a student can try against it — the
 * automated form of that FailureMode's own `reproduce` steps. Powers
 * `/entities/[slug]/try/[failureModeSlug]`.
 *
 * Every number here was verified against the real engine (same seed,
 * printed metrics) before being written down, not guessed — see the
 * demo's own inline comment for what was measured.
 */
export interface FailureModeDemo {
  startingEntities: ScenarioEntity[];
  startingConnections: ConnectionConfig[];
  durationMs: number;
  seed: number;
  remedies: Remedy[];
}

export interface FailureMode {
  name: string;
  /** What happens, mechanically, and why it matters. */
  description: string;
  /** Ordered steps to reproduce this in the Workshop, empty if not simulated. */
  reproduce: string[];
  /** What to look at to confirm it's actually happening. */
  observe: string;
  /** False for failure modes that are named/documented but not directly simulated yet. */
  simulated: boolean;
  /** Present only for failure modes with a "Try It" page — see FailureModeDemo's doc. */
  demo?: FailureModeDemo;
}

export interface UsageExtreme {
  title: string;
  description: string;
}

export interface UsageGuide {
  /** Where this entity belongs in a graph — canonical position, what it connects to on each side. */
  whereItGoes: string;
  /** A concrete example topology string, e.g. "Client → API Server → Cache → Database". */
  typicalTopology: string;
  /** What a healthy, unremarkable configuration looks like and what "good" looks like once run. */
  normal: string;
  /** Pushing individual knobs to their min/max — what it isolates or reveals. */
  extremes: UsageExtreme[];
  /** Specific, concrete scenarios/combinations worth trying in the Workshop — subtler than a failure mode, not necessarily a crash. */
  edgeCases: string[];
}

export interface EntityDeepDive {
  tagline: string;
  summary: string;
  industryExamples: string[];
  usage: UsageGuide;
  tradeoffs: Tradeoff[];
  pros: string[];
  cons: string[];
  failureModes: FailureMode[];
}

export const ENTITY_DEEP_DIVE: Record<EntityType, EntityDeepDive> = {
  client: {
    tagline: "The origin of every request — and the only honest judge of whether the system worked.",
    summary:
      "The Client generates traffic and waits for a response. It has no idea whether an answer came from a warm cache or a cold database query three hops away — it only knows how long the wait was and whether it got one. Every other entity in this simulator exists, ultimately, to make the Client's experience better.",
    industryExamples: [
      "Real end users — web and mobile",
      "Third-party API consumers",
      "Load-testing tools — k6, Locust, JMeter, Gatling",
    ],
    usage: {
      whereItGoes:
        "Always the root of the graph — a request source, never a target. Every architecture starts with at least one Client with at least one outgoing connection.",
      typicalTopology: "Client → API Server → Database (the minimal three-node baseline every other pattern builds on).",
      normal:
        "One Client, a moderate Request Rate (10–50 req/s), and a Key Pool Size sized to whatever it's pointed at — small if a Cache is downstream, large if not. This is the shape used to sanity-check an architecture works at all before stress-testing it.",
      extremes: [
        {
          title: "Rate → 0",
          description:
            "No traffic at all. Useful as a control run — confirms nothing downstream fails or reports odd metrics when nothing happened, before trusting a positive result from a real run.",
        },
        {
          title: "Rate → 1000 req/s (max)",
          description:
            "Every bounded entity downstream saturates almost immediately unless the whole chain is scaled to match. The fastest way to find the single weakest link in an architecture — whatever turns red first.",
        },
        {
          title: "Key Pool Size → 1",
          description:
            "Every request targets the same single key. A Cache should show a near-100% hit rate after the first request. Good for isolating whether a Cache's mechanics work at all, independent of hit-rate tuning.",
        },
      ],
      edgeCases: [
        "Two Clients pointed at the same downstream chain with very different Request Rates — check whether metrics correctly attribute load and latency per origin, or blur together.",
        "Key Pool Size set exactly equal to a downstream Cache's Capacity — the boundary where every key just barely fits. Eviction policy should visibly matter more here than when the pool is far larger or smaller than capacity.",
        "Request Rate raised gradually across several runs rather than jumped straight to max — watch for the exact point the Results bar's success rate starts to dip, not just whether it eventually fails.",
      ],
    },
    tradeoffs: [
      {
        title: "Request Rate",
        description:
          "Low rate proves an architecture works. High rate proves it scales — or reveals exactly where it doesn't. The same topology can look identical at 5 req/s and collapse at 500.",
      },
      {
        title: "Key Pool Size",
        description:
          "A small pool means requests repeat — the traffic shape a Cache is built for. A large pool means requests are mostly unique — a Cache can't help no matter how well it's configured, because there's nothing to remember.",
      },
    ],
    pros: [
      "Rate and Key Pool Size are enough to reproduce the two traffic shapes that matter for almost every other entity's behavior: burst load and repetition.",
      "Deterministic seeding means the exact same traffic pattern replays identically — a regression in an architecture is provable, not anecdotal.",
    ],
    cons: [
      "Real traffic isn't uniform-rate or uniform-key-distribution — no diurnal patterns, no bursts correlated with real-world events, no adversarial traffic.",
      "Think time, retry policy, and timeout are named in the entity model but not yet configurable here.",
    ],
    failureModes: [
      {
        name: "Thundering Herd",
        description:
          "The Client is how you produce every failure mode downstream — it's the trigger, not the target. Raising Request Rate past what any downstream entity can absorb is the most common way to induce backpressure, queue saturation, or a tripped Circuit Breaker.",
        reproduce: [
          "Build a Client → API Server → Database chain with default config.",
          "Open the Client's Inspector panel and raise Request Rate well past the API Server's Max Concurrent + Max Queue Length.",
          "Run the simulation.",
        ],
        observe:
          "The Results bar's success rate drops and the API Server's node-health dot turns red (dropping requests) — the queue filled and started rejecting.",
        simulated: true,
      },
      {
        name: "Defeating a Cache with Key Pool Size",
        description:
          "A Cache's hit rate is a property of both the cache and the traffic. Raising Key Pool Size high enough makes any cache configuration look broken, even a well-tuned one — not because the cache is wrong, but because there's nothing repetitive left to remember.",
        reproduce: [
          "Add a Cache in front of a Database.",
          "Set Key Pool Size on the Client far above the Cache's Capacity.",
          "Run, then compare hit rate against a run with a small Key Pool Size.",
        ],
        observe:
          "Hit rate in the Cache's Inspector panel collapses toward zero as Key Pool Size grows, independent of Capacity or Eviction Policy.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, Client at 200
        // req/s -> Cache (capacity 50, coalesced stampede protection so a
        // hot key's concurrent misses don't multiply — an unrelated
        // confound that would otherwise swamp this failure mode's own
        // signal, since 200 req/s comfortably outpaces this Database's
        // per-connection processing time for the same key) -> a
        // deliberately narrow Database (1 connection, 60ms/query) sized
        // to comfortably absorb a well-tuned cache's trickle of real
        // misses but not a defeated cache's near-total miss traffic. The
        // Cache itself is given generous headroom (maxConcurrent 200,
        // maxQueueLength 1000) so its own throughput is never the
        // confound — this failure mode is about hit rate, not the cache's
        // own capacity):
        //   BROKEN (Key Pool Size 100,000, the field's own max): hit rate
        //     0.3%, Database failure rate 90.6% (107 attempts, 1036
        //     rejected — crosses this app's 90% "Crashed" threshold),
        //     overall success 9.6%. The Cache's own status reads "error"
        //     (steady red, 31.2% of its own attempts) not pulsing
        //     "Crashed" — same forwarded-failure attribution as every
        //     other pass-through entity; the Database is what's actually
        //     down.
        //   REMEDY Lower Key Pool Size (100,000 -> 10): hit rate 95.5%,
        //     Database failure rate 0.0% (10/10 succeed — exactly one
        //     legitimate first-time miss per distinct key, the coalescing
        //     fix's own signature), overall success 100.0% — fully
        //     healthy, and Capacity/Eviction Policy never changed. Re-
        //     verified through getFailureModeDemo() itself, not just a
        //     standalone tuning config.
        // Worth knowing before re-tuning: with naive stampede protection
        // instead of coalesced, even this remedy's small key pool showed
        // real Database failures (concurrent requests for the same hot
        // key each independently re-fetching while the first fetch was
        // still in flight) — a real mechanism, but the wrong one to
        // demonstrate here; it would have conflated Key Pool Size with
        // Cache Stampede's own already-built lesson instead of isolating
        // Key Pool Size on its own.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 200, keyPoolSize: 100000 },
            },
            {
              id: "cache",
              type: "cache",
              label: "Cache",
              position: { x: 360, y: 160 },
              config: {
                capacity: 50,
                evictionPolicy: "lru",
                ttlMs: 0,
                stampedeMode: "coalesced",
                maxConcurrent: 200,
                maxQueueLength: 1000,
              },
            },
            {
              id: "database",
              type: "database",
              label: "Database",
              position: { x: 640, y: 160 },
              config: {
                maxConnections: 1,
                maxQueueLength: 6,
                processingTimeMs: 60,
                processingJitterMs: 3,
                failureProbability: 0,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "cache", latencyMs: 5 },
            { source: "cache", target: "database", latencyMs: 2 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "lower-key-pool-size",
              label: "Lower Key Pool Size",
              nodeId: "client",
              configOverride: { keyPoolSize: 10 },
              description:
                "The production fix — and it's a traffic-shape fix, not a cache-tuning one: nothing about the Cache changed, Capacity and Eviction Policy are exactly what they were in the broken run. A cache can only remember what actually repeats; ten distinct resources fit comfortably in this Cache's 50-slot capacity and stay cached indefinitely, so only the very first request for each one ever reaches the Database.",
            },
          ],
        },
      },
    ],
  },
  api: {
    tagline: "Does the work, and has a hard limit on how much of it at once.",
    summary:
      "The API Server runs business logic between the Client and everything behind it. Every request competes for the same fixed pool of concurrency slots — admit up to Max Concurrent, queue up to Max Queue Length beyond that, reject anything past both.",
    industryExamples: [
      "Node/Express, Django, Spring Boot, Go net/http services",
      "Anything behind a Kubernetes Horizontal Pod Autoscaler or an AWS Auto Scaling Group",
    ],
    usage: {
      whereItGoes:
        "Sits directly behind a Client or a Load Balancer, in front of a Database (or a Cache in front of that Database). Rarely a leaf node — it almost always forwards to something stateful.",
      typicalTopology:
        "Client → API Server → Database, or Client → Load Balancer → API Server ×2–3 → Database for the horizontally-scaled version.",
      normal:
        "Max Concurrent sized comfortably above the expected steady Request Rate × Processing Time, with a modest queue as burst insurance. A healthy run keeps the node-health dot green and queue depth rarely touching Max Queue Length.",
      extremes: [
        {
          title: "Max Concurrent → 1",
          description:
            "Every request is fully serialized — the server behaves like a single-threaded process. Total throughput is bounded almost entirely by Processing Time regardless of Request Rate. A clean way to see queueing theory's effect in isolation.",
        },
        {
          title: "Max Queue Length → 0",
          description:
            "No burst tolerance at all — anything past Max Concurrent is rejected immediately rather than waiting. Compare against a generous queue at identical Request Rate to feel the latency-vs-reliability tradeoff directly.",
        },
        {
          title: "Processing Time → 200ms (max)",
          description:
            "Even a small Max Concurrent drains extremely slowly. Useful for simulating a genuinely heavy endpoint (a report generator, a large aggregation) rather than a typical CRUD call.",
        },
      ],
      edgeCases: [
        "Max Concurrent and Max Queue Length both set low, with Request Rate tuned to sit just under the rejection threshold — the architecture 'just barely' survives. Nudge Request Rate up slightly and watch how abruptly it tips over instead of degrading gracefully.",
        "Two API Servers behind a Load Balancer with different Processing Time values — confirms the Load Balancer's algorithm choice actually matters, per the Load Balancer's own failure-mode section.",
        "Max Queue Length set very large (200) with Max Concurrent very small — technically never rejects, but check what happens to p95/p99 latency in the Results bar as the queue does all the work instead of capacity.",
      ],
    },
    tradeoffs: [
      {
        title: "Max Concurrent",
        description:
          "Raising it admits more simultaneous work before anything queues — the realistic ceiling is CPU/memory per instance, not a free lever. In production this is usually solved by adding more instances, not raising one instance's ceiling indefinitely.",
      },
      {
        title: "Max Queue Length",
        description:
          "A bigger queue absorbs bursts without rejecting requests, at the cost of every queued request waiting longer. A queue of 0 rejects overflow immediately instead — lower latency for admitted requests, zero tolerance for bursts.",
      },
      {
        title: "Processing Time",
        description:
          "Heavier business logic occupies a concurrency slot longer, lowering effective throughput even with Max Concurrent unchanged — the same reason an unoptimized query or loop can quietly halve a service's real capacity.",
      },
    ],
    pros: [
      "The admit → queue → reject model matches how virtually every real server behaves under a thread pool or connection limit — not a simplification of the mechanism, just of the numbers.",
      "Because queueing is explicit and bounded, backpressure is something you can see happening (queue depth, rejection rate) instead of an invisible cliff.",
    ],
    cons: [
      "No CPU/memory modeling — Max Concurrent is a number a student sets directly, not something computed from simulated hardware.",
      "No modeling of what's inside 'business logic' — a slow database call, a slow downstream API, and genuinely heavy computation all just look like a longer Processing Time here.",
    ],
    failureModes: [
      {
        name: "Queue Saturation (Backpressure Collapse)",
        description:
          "The textbook failure: load exceeds Max Concurrent, the queue absorbs the overflow for a while, and once the queue is also full, every further request is rejected outright.",
        reproduce: [
          "Set Max Concurrent to a small number (e.g. 5) and Max Queue Length to something modest (e.g. 10).",
          "Raise the Client's Request Rate well beyond what 5 concurrent slots can drain given the configured Processing Time.",
          "Run the simulation.",
        ],
        observe:
          "Success rate falls in the Results bar, the API Server's node-health dot goes red, and its Inspector panel shows the queue pinned at Max Queue Length.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, 100 req/s)
        // before writing these numbers down — the first architecture-
        // change remedy built (see docs/Learn-Problem-Solution.md's
        // architecture-change remedies section):
        //   BROKEN (1 API Server):              api1 failure rate 50.9%
        //     (609 admissions, 632 errors), overall success rate 45.1%
        //     (client status "error" — below the 50% threshold).
        //   REFERENCE (Load Balancer + 2nd API): api1/api2 failure rate
        //     0.5%/0.7%, overall success rate 98.8% — both servers
        //     comfortably healthy at identical demand.
        // Deliberately doesn't cross nodeStatus.ts's 90% "Crashed"
        // (pulsing red) threshold on api1, unlike every config-toggle
        // demo before it — and this isn't under-tuning. For an admission-
        // loss system (bounded concurrency + a small queue), reaching a
        // literal 90% failure rate on ONE server requires demand roughly
        // 10x its capacity — confirmed empirically by sweeping request
        // rates 60→800 before settling here. At that much demand, TWO
        // servers' combined capacity (only 2x one server's) is *also*
        // still ~5x oversubscribed, so the "fix" would look nearly as
        // broken as the problem — the opposite of the lesson this demo
        // teaches. 100 req/s is chosen instead as the highest demand
        // where the fix is still unambiguously healthy (98.8%) — the
        // single server's "error" (steady red, not pulsing) status and a
        // sub-50% client success rate are still an honestly bad, clearly
        // visible broken state, just not the same threshold every
        // config-toggle demo happens to cross.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 100, keyPoolSize: 50 },
            },
            {
              id: "api1",
              type: "api",
              label: "API Server",
              position: { x: 360, y: 160 },
              config: {
                maxConcurrent: 5,
                maxQueueLength: 6,
                processingTimeMs: 50,
                processingJitterMs: 5,
              },
            },
            {
              id: "database",
              type: "database",
              label: "Database",
              position: { x: 640, y: 160 },
              config: {
                maxConnections: 1000,
                maxQueueLength: 1000,
                processingTimeMs: 1,
                failureProbability: 0,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "api1", latencyMs: 5 },
            { source: "api1", target: "database", latencyMs: 2 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "architecture",
              id: "scale-horizontally",
              label: "Scale Horizontally — Load Balancer + 2nd API Server",
              description:
                "The production fix: a Load Balancer doesn't create capacity on its own, but it lets a second API Server's capacity actually get used, doubling the total throughput ceiling. Build it yourself below, then Run — Compare shows what a correctly-wired version measures.",
              instructions: [
                "Drag a Load Balancer onto the canvas.",
                "Drag a second API Server onto the canvas.",
                "Select the direct Client → API Server connection and press Delete.",
                "Connect Client → Load Balancer.",
                "Connect Load Balancer → each API Server (both of them).",
                "Connect the new API Server → Database, same as the existing one.",
                "Run the simulation.",
              ],
              allowedComponentTypes: ["load_balancer", "api"],
              referenceEntities: [
                {
                  id: "client",
                  type: "client",
                  label: "Client",
                  position: { x: 80, y: 160 },
                  config: { requestRate: 100, keyPoolSize: 50 },
                },
                {
                  id: "lb",
                  type: "load_balancer",
                  label: "Load Balancer",
                  position: { x: 320, y: 160 },
                  config: { algorithm: "round_robin" },
                },
                {
                  id: "api1",
                  type: "api",
                  label: "API Server",
                  position: { x: 560, y: 60 },
                  config: {
                    maxConcurrent: 5,
                    maxQueueLength: 6,
                    processingTimeMs: 50,
                    processingJitterMs: 5,
                  },
                },
                {
                  id: "api2",
                  type: "api",
                  label: "API Server (2)",
                  position: { x: 560, y: 260 },
                  config: {
                    maxConcurrent: 5,
                    maxQueueLength: 6,
                    processingTimeMs: 50,
                    processingJitterMs: 5,
                  },
                },
                {
                  id: "database",
                  type: "database",
                  label: "Database",
                  position: { x: 840, y: 160 },
                  config: {
                    maxConnections: 1000,
                    maxQueueLength: 1000,
                    processingTimeMs: 1,
                    failureProbability: 0,
                  },
                },
              ],
              referenceConnections: [
                { source: "client", target: "lb", latencyMs: 5 },
                { source: "lb", target: "api1", latencyMs: 5 },
                { source: "lb", target: "api2", latencyMs: 5 },
                { source: "api1", target: "database", latencyMs: 2 },
                { source: "api2", target: "database", latencyMs: 2 },
              ],
            },
          ],
        },
      },
      {
        name: "Latency Cliff from Processing Time",
        description:
          "Raising Processing Time without raising Max Concurrent doesn't just slow individual requests — it lowers the server's effective throughput, since each request now occupies a slot longer. Traffic that was fine before can suddenly start queueing.",
        reproduce: [
          "Run once at the default Processing Time and note p95 latency in the Results bar.",
          "Raise Processing Time (e.g. 5ms → 80ms) with everything else unchanged.",
          "Run again.",
        ],
        observe:
          "p95 latency in the Results bar jumps disproportionately — not linearly with the Processing Time change, because requests now queue that didn't before.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, Client at 150
        // req/s -> API Server -> a generously-capacitied Database so it's
        // never the bottleneck being measured). Max Concurrent (5) and Max
        // Queue Length (6) never change between broken and remedy — only
        // Processing Time does, isolating exactly the axis this failure
        // mode is about:
        //   BROKEN (processingTimeMs=200, the field's own max): failure
        //     rate 90.8% (164 admitted, 1618 rejected — crosses this app's
        //     90% "Crashed" threshold), overall success 6.5%, p95 latency
        //     987ms.
        //   REMEDY Lower Processing Time (200 -> 10): failure rate 0.0%
        //     (1730/1730 admitted), overall success 100.0%, p95 latency
        //     42ms — a ~23x p95 drop for a 20x Processing Time drop,
        //     nearly proportional once the server is no longer queueing at
        //     all, matching this failure mode's own "not linear near the
        //     cliff" observation. Re-verified through getFailureModeDemo()
        //     itself, not just a standalone tuning config.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 150, keyPoolSize: 50 },
            },
            {
              id: "api1",
              type: "api",
              label: "API Server",
              position: { x: 360, y: 160 },
              config: {
                maxConcurrent: 5,
                maxQueueLength: 6,
                processingTimeMs: 200,
                processingJitterMs: 5,
              },
            },
            {
              id: "database",
              type: "database",
              label: "Database",
              position: { x: 640, y: 160 },
              config: {
                maxConnections: 1000,
                maxQueueLength: 1000,
                processingTimeMs: 1,
                failureProbability: 0,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "api1", latencyMs: 5 },
            { source: "api1", target: "database", latencyMs: 2 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "lower-processing-time",
              label: "Lower Processing Time",
              nodeId: "api1",
              configOverride: { processingTimeMs: 10 },
              description:
                "The production fix: the endpoint itself got faster — a query got an index, an N+1 call got batched, unnecessary work got cut — so each request now occupies a concurrency slot for a fraction of the time it used to. Max Concurrent never changed; the server didn't get more capacity, the same capacity just got used more efficiently.",
            },
          ],
        },
      },
    ],
  },
  database: {
    tagline: "Usually the tightest bottleneck in the whole architecture.",
    summary:
      "The Database persists state behind a bounded connection pool — the same admit/queue/reject shape as the API Server, plus an independent failure probability that models flaky infrastructure separate from overload. It can't be casually duplicated the way a stateless server can.",
    industryExamples: [
      "SQL — PostgreSQL, MySQL, Amazon RDS",
      "NoSQL — DynamoDB, MongoDB, Cassandra",
    ],
    usage: {
      whereItGoes:
        "Almost always a leaf node — the thing everything else is ultimately protecting. Sits behind an API Server directly, behind a Cache for the cache-aside pattern, or as the leader/replica targets of a Replica Pool.",
      typicalTopology:
        "Client → API Server → Cache → Database (cache-aside), or Client → API Server → Replica Pool → [Database (leader), Database, Database] (replicas).",
      normal:
        "Max Connections sized to what real traffic needs after any upstream Cache absorbs repeat load, Failure Probability at or near 0 unless specifically testing resilience, Processing Time reflecting a reasonably well-indexed query.",
      extremes: [
        {
          title: "Max Connections → 1",
          description:
            "The database can only ever do one thing at a time — every other query queues behind it no matter how light the traffic. Isolates connection-pool contention from every other variable.",
        },
        {
          title: "Failure Probability → 100%",
          description:
            "Every single query fails, regardless of load or capacity. The cleanest possible test of whether a Circuit Breaker upstream actually stops hammering a dependency that's fully down, vs. one that's merely slow.",
        },
        {
          title: "Processing Time → 300ms (max)",
          description:
            "Models a genuinely bad query — a missing index on a large table, an expensive aggregation. Even generous Max Connections can't fully compensate; each connection is tied up for a long time.",
        },
      ],
      edgeCases: [
        "Database Type switched from SQL to NoSQL with every other config held identical — confirms the ~3x connection ceiling / ~half processing time multiplier actually changes measured throughput and latency in the Results bar, not just the label.",
        "Failure Probability set low but nonzero (5%) with capacity comfortably above load — the node-health dot should stay green even as occasional failures show up in the Results bar, proving failure and overload are tracked independently.",
        "A Database directly exposed to a Client with no API Server in front — the minimal two-node graph. Shows a database's raw admit/queue/reject behavior with nothing upstream shaping the traffic first.",
      ],
    },
    tradeoffs: [
      {
        title: "SQL vs NoSQL",
        description:
          "SQL enforces a fixed schema with joins and ACID transactions — strong consistency, but query-planning and locking overhead caps concurrent write throughput. NoSQL trades that for a flexible, key-partitioned schema — much higher concurrent throughput, but no joins and usually weaker consistency. Modeled here as NoSQL applying roughly 3x the connection ceiling and half the query time on top of your configured values — not as the four distinct NoSQL data models (document / key-value / column-family / graph), which this simulation collapses into one profile.",
      },
      {
        title: "Max Connections",
        description:
          "Every connection costs memory on a real database server, so this isn't free to raise indefinitely — the same bounded-resource idea as Max Concurrent on an API Server, for a stateful dependency that can't be trivially cloned.",
      },
      {
        title: "Failure Probability",
        description:
          "Models flaky infrastructure independent of load — a query can fail even when the database is nowhere near capacity. The honest way to test whether a Circuit Breaker or retry logic upstream actually helps, versus just adding more capacity.",
      },
    ],
    pros: [
      "Bounded concurrency + independent failure probability, in one entity, demonstrates the two distinct reasons a database call fails: it's overloaded, or it's just broken right now — and those need different fixes.",
    ],
    cons: [
      "No schemas, joins, partition keys, replication, or consistency modeling — indexing shows up only as a faster Processing Time, not as an actual index a student adds.",
      "Read replicas require manually wiring a second Database node behind a Load Balancer — the pattern isn't automatic here (see Replica Pool for the dedicated version).",
    ],
    failureModes: [
      {
        name: "Connection Pool Exhaustion",
        description:
          "The same backpressure story as the API Server, but for the entity that's hardest to horizontally scale — this is why protecting the database (caching, connection limits) matters more than protecting anything stateless.",
        reproduce: [
          "Set Max Connections low (e.g. 3) with a modest Max Queue Length.",
          "Point enough Client Request Rate at it directly, or through an API Server, to exceed both.",
          "Run the simulation.",
        ],
        observe:
          "Rejections appear in the Results bar and the Database's node-health dot turns red — compare against the same run with a Cache in front to see how much load the cache absorbs before it ever reaches here.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, 500 req/s
        // direct against the database, no API Server in front) before
        // writing these numbers down — deliberately extreme (2 connections,
        // 0 queue) so the broken state crosses this app's own 90% "Crashed"
        // status threshold, not a subtle utilization bump:
        //   BROKEN (sql, maxConnections=2, maxQueueLength=0): failure rate
        //     95.9% (5668 attempts, 5434 errors), overall success 7.9%.
        //   REMEDY Raise Max Connections (2 -> 40): failure rate 0.4%
        //     (2957 attempts, 12 errors), overall success 99.8% — fully
        //     healthy. The real fix: actual added throughput.
        //   REMEDY Raise Max Queue Length only (0 -> 500, the field's own
        //     max, connections left at 2): failure rate 85.6% (5161
        //     attempts, 4420 errors), overall success 25.1% — barely moves
        //     the needle even maxed out, because demand here is sustained
        //     above capacity for the whole run, not a temporary burst a
        //     buffer can ride out. Honestly weak, not a fix.
        //   REMEDY Switch to NoSQL (type: "nosql", maxConnections left at
        //     2, so effective ceiling becomes 2*3=6): failure rate 72.1%
        //     (4615 attempts, 3328 errors), overall success 43.6% — NoSQL's
        //     3x concurrency / 0.5x latency profile buys real headroom
        //     (better than the queue-only remedy, and no longer reads as
        //     "Crashed") but the underlying pool is still undersized for
        //     this load — a tradeoff that helps, not a substitute for
        //     sizing capacity to demand.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 500, keyPoolSize: 50 },
            },
            {
              id: "database",
              type: "database",
              label: "Database",
              position: { x: 400, y: 160 },
              config: {
                type: "sql",
                maxConnections: 2,
                maxQueueLength: 0,
                processingTimeMs: 50,
                processingJitterMs: 5,
                failureProbability: 0,
              },
            },
          ],
          startingConnections: [{ source: "client", target: "database", latencyMs: 5 }],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "raise-max-connections",
              label: "Raise Max Connections",
              nodeId: "database",
              configOverride: { maxConnections: 40 },
              description:
                "The production fix: actually raise the connection pool's ceiling so the database can run more queries at once instead of rejecting or queueing the overflow. Real databases cap this against server memory, so it isn't free to raise indefinitely — but here it's comfortably above the incoming load, so nearly everything succeeds.",
            },
            {
              kind: "config",
              id: "raise-max-queue-length",
              label: "Raise Max Queue Length",
              nodeId: "database",
              configOverride: { maxQueueLength: 500 },
              description:
                "A partial mitigation, not a fix: queueing lets overflow queries wait instead of failing instantly, but it doesn't add any real capacity — the pool still only drains 2 queries at a time. Against a temporary burst that would be enough; against demand that stays above capacity for the whole run, even the field's own maximum queue barely helps.",
            },
            {
              kind: "config",
              id: "switch-to-nosql",
              label: "Switch to NoSQL",
              nodeId: "database",
              configOverride: { type: "nosql" },
              description:
                "A real, if partial, tradeoff-driven fix: NoSQL's simulated profile applies roughly 3x the connection ceiling and half the query time on top of the same Max Connections, standing in for partitioned, simpler key-based access. That buys meaningful headroom here without touching Max Connections at all — but it's not a substitute for sizing the pool to actual demand, and it trades away SQL's joins/ACID guarantees to get it.",
            },
          ],
        },
      },
      {
        name: "Independent Failure (Flaky Infrastructure)",
        description:
          "Failures that have nothing to do with load — the case a Circuit Breaker exists for. Even a database running well under capacity can fail unpredictably here.",
        reproduce: [
          "Set Failure Probability to something noticeable (e.g. 10%) with Max Connections comfortably above the traffic level.",
          "Run and note the failure rate in the Results bar even though the node-health dot stays healthy (not overloaded).",
          "Wrap the same Database in a Circuit Breaker and compare how quickly upstream requests fail fast instead of waiting on doomed queries.",
        ],
        observe:
          "Failures in the Results bar alongside a healthy (non-red) node-health dot — proof the failures are independent of load, not caused by it.",
        simulated: true,
      },
    ],
  },
  load_balancer: {
    tagline: "Spreads existing capacity around — never creates more of it.",
    summary:
      "The Load Balancer has no capacity of its own. It makes an instant routing decision — Round Robin, Least Connections, Weighted Round Robin, IP Hash, or Least Response Time — and forwards. Putting one in front of a single overloaded server changes nothing; the servers behind it are what actually need to scale.",
    industryExamples: ["nginx, HAProxy, Envoy", "AWS ELB / ALB / NLB, Google Cloud Load Balancing"],
    usage: {
      whereItGoes:
        "Sits between a traffic source (Client, or another Load Balancer) and 2+ homogeneous or near-homogeneous downstream targets. Pointless with only one target — there's nothing to balance.",
      typicalTopology: "Client → Load Balancer → API Server ×2–3 → Database.",
      normal:
        "Two or three API Servers of roughly similar capacity behind it, Algorithm set to whichever is being compared. Under Weighted Round Robin, each downstream target gets its own entry in the Inspector's Target Weights section (default 1, so an untouched target is never silently dropped from rotation). A healthy run shows requests spread across all targets in the Inspector's distribution chart, none pinned at zero.",
      extremes: [
        {
          title: "One downstream target only",
          description:
            "Every algorithm degenerates to the same thing: every request goes to the only option. Confirms the Load Balancer adds zero value with nothing to balance across — the entity's own core lesson, made literal.",
        },
        {
          title: "Many targets (5+), wildly different Processing Time each",
          description:
            "Round Robin's blindness to load becomes obvious fast — some targets sit near-idle while others queue heavily, all receiving an equal share regardless.",
        },
        {
          title: "Weighted Round Robin with one target's weight set to 50 (max), all others at 1",
          description:
            "That one target should absorb the overwhelming majority of dispatches — makes the weight's effect on the Inspector's distribution chart unmistakable, not just a small nudge.",
        },
      ],
      edgeCases: [
        "Give every downstream target the exact same Processing Time, then compare Round Robin vs Least Connections — they should be statistically indistinguishable, confirming the algorithms only diverge because of load imbalance, not because one is inherently 'better'.",
        "Chain a Load Balancer behind another Load Balancer — not a typical real-world pattern, but useful for confirming the entity forwards responses correctly through multiple hops without losing per-target in-flight counts.",
        "Two downstream API Servers with the same Processing Time but different Max Queue Length — check whether Least Connections accounts for queue depth or only raw in-flight count.",
        "IP Hash with a very small Client Key Pool Size (e.g. 2–3) against 2 targets — with so few distinct keys, the hash can land unevenly by chance alone; compare the distribution chart against the same setup under Round Robin to see the difference between 'deterministic per key' and 'balanced overall' — IP Hash only promises the former.",
        "Least Response Time with two targets configured identically (same Processing Time, same Max Concurrent) — the distribution should still land close to even, not lock onto one target, because of the algorithm's periodic exploration dispatches. Worth trying specifically because a naive implementation of this algorithm gets this wrong.",
      ],
    },
    tradeoffs: [
      {
        title: "Round Robin vs Least Connections vs Least Response Time",
        description:
          "Round Robin and Least Connections behave identically when every target is equally fast — the difference only appears once one target is slower or already loaded, and Least Connections notices and routes around it by request count. Least Response Time is the same idea generalized from 'how many requests' to 'how long they actually took' — it reacts to a target that's technically available but just slow, not only one that's visibly saturated.",
      },
      {
        title: "Weighted Round Robin vs IP Hash",
        description:
          "Both diverge from plain Round Robin immediately, by design, rather than in response to load. Weighted Round Robin is for known, fixed capacity differences (a bigger instance type) — a human-configured preference. IP Hash is for session affinity — the same identifier consistently reaching the same target — at the cost of never rebalancing around a slow target at all, since the routing decision ignores load entirely.",
      },
      {
        title: "Layer 4 vs Layer 7 (named, not simulated)",
        description:
          "L4 balances at the TCP level — fast, but blind to request content. L7 (what this entity implicitly models) balances at the HTTP level — can route on path/headers/cookies, at the cost of more per-request overhead.",
      },
      {
        title: "Health Checks (named, deliberately not simulated here)",
        description:
          "Detecting a struggling target and routing around it automatically is exactly what Circuit Breaker already teaches as its own entity. Rather than duplicate that state machine inside Load Balancer, the intended composition is architectural: put a Circuit Breaker in front of each target a Load Balancer routes to.",
      },
    ],
    pros: [
      "Comparing five real algorithms side-by-side, with a per-target request-distribution chart, makes the difference between them something you see, not something you take on faith.",
      "Round Robin needs no state beyond a counter — genuinely the simplest correct algorithm, itself a useful lesson in engineering minimalism.",
      "Least Response Time's periodic exploration dispatches are a real, if small, lesson of their own: a purely greedy 'always pick the best-looking option' algorithm can permanently lock onto a wrong answer from early noise alone, and needs deliberate, ongoing sampling of the alternatives to self-correct.",
    ],
    cons: [
      "The Load Balancer is itself a single point of failure in production — that's true here too, but this simulation doesn't model the LB failing.",
      "IP Hash routes on the request's resource key, not a real client IP — this simulation has no modeled client identity, so the key is the closest available stand-in for session affinity, not a literal IP.",
    ],
    failureModes: [
      {
        name: "Uneven Backend Divergence",
        description:
          "The core lesson: load-aware algorithms are indistinguishable from Round Robin until backends aren't equal. Give one target more work per request and watch Round Robin ignore it while Least Connections and Least Response Time compensate.",
        reproduce: [
          "Connect the Load Balancer to two API Servers; give one a much higher Processing Time than the other.",
          "Run once with Algorithm set to Round Robin and note the per-target distribution chart in the Inspector.",
          "Switch Algorithm to Least Connections (or Least Response Time) and run again with identical traffic.",
        ],
        observe:
          "Round Robin's distribution stays roughly 50/50 regardless of the slow target's backlog; Least Connections and Least Response Time visibly shift traffic toward the faster target.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, 320 req/s)
        // before writing these numbers down — deliberately extreme (one
        // slow target with a tiny connection pool and queue, one fast
        // target with generous headroom) so the broken state crosses this
        // app's own 90% "Crashed" status threshold, not a subtle
        // utilization bump:
        //   BROKEN (round_robin):        api_slow failure rate 91.2%
        //     (998 attempts, 910 errors — crosses CRASH_FAILURE_RATE),
        //     overall success rate 51.5%.
        //   REMEDY Least Connections:    api_slow failure rate 0%
        //     (78/78 attempts succeed, LB shifts the vast majority of
        //     traffic toward api_fast), overall success rate 100% —
        //     fully healthy. Re-verified through getFailureModeDemo()
        //     itself, not just a standalone tuning config.
        // Least Response Time was tried too and deliberately left out of
        // the shipped remedies: at this capacity gap its periodic
        // forced-round-robin "exploration" dispatches (every 3rd
        // dispatch, see LoadBalancer.ts) keep re-injecting real traffic
        // into the crashed target throughout the whole run, and its
        // near-instant rejections read as *low* latency to the EMA it
        // tracks — so it never reliably learns to avoid api_slow here
        // (measured ~55% overall success, barely above Round Robin's
        // 51.5%). Shipping it as a "fix" would have misrepresented what
        // it actually does in this scenario.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 320, keyPoolSize: 50 },
            },
            {
              id: "lb",
              type: "load_balancer",
              label: "Load Balancer",
              position: { x: 340, y: 160 },
              config: { algorithm: "round_robin" },
            },
            {
              id: "api_slow",
              type: "api",
              label: "API Server (slow)",
              position: { x: 600, y: 60 },
              config: {
                maxConcurrent: 2,
                maxQueueLength: 22,
                processingTimeMs: 260,
                processingJitterMs: 10,
              },
            },
            {
              id: "api_fast",
              type: "api",
              label: "API Server (fast)",
              position: { x: 600, y: 260 },
              config: {
                maxConcurrent: 20,
                maxQueueLength: 50,
                processingTimeMs: 10,
                processingJitterMs: 2,
              },
            },
            {
              id: "db_slow",
              type: "database",
              label: "Database (behind slow)",
              position: { x: 860, y: 60 },
              config: {
                maxConnections: 1000,
                maxQueueLength: 1000,
                processingTimeMs: 1,
                failureProbability: 0,
              },
            },
            {
              id: "db_fast",
              type: "database",
              label: "Database (behind fast)",
              position: { x: 860, y: 260 },
              config: {
                maxConnections: 1000,
                maxQueueLength: 1000,
                processingTimeMs: 1,
                failureProbability: 0,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "lb", latencyMs: 5 },
            { source: "lb", target: "api_slow", latencyMs: 5 },
            { source: "lb", target: "api_fast", latencyMs: 5 },
            { source: "api_slow", target: "db_slow", latencyMs: 2 },
            { source: "api_fast", target: "db_fast", latencyMs: 2 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "least-connections",
              label: "Least Connections",
              nodeId: "lb",
              configOverride: { algorithm: "least_connections" },
              description:
                "The production fix: the Load Balancer tracks how many requests are currently in flight to each target and routes new ones to whichever has the fewest — so the slow target's growing backlog gets it skipped in real time instead of receiving its blind, equal share every cycle.",
            },
          ],
        },
      },
      {
        name: "Weighted Misconfiguration",
        description:
          "Weighted Round Robin trusts the configured weight completely — it never checks whether a target can actually handle the share it's been given. A weight that doesn't match a target's real capacity turns the 'preferred' target into the bottleneck instead of the fast path.",
        reproduce: [
          "Connect the Load Balancer to two API Servers with identical Processing Time but very different Max Concurrent (e.g. 2 and 20).",
          "Set Algorithm to Weighted Round Robin and give the low-capacity target a high weight (e.g. 4) against the high-capacity target's weight of 1 in the Target Weights section.",
          "Run and compare error/queue behavior against the same setup with the weights reversed to match real capacity.",
        ],
        observe:
          "With the mismatched weights, the low-capacity target's queue length and error count climb even though the high-capacity target sits comfortably under load — the Load Balancer did exactly what it was told, which is the point.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, Client at 880
        // req/s -> Load Balancer -> two API Servers with identical
        // Processing Time (30ms) but a real 1:25 capacity ratio
        // (maxConcurrent 2 vs 50), each with its own generously-sized
        // Database so neither is the bottleneck being measured):
        //   BROKEN (weights: api-low=4, api-high=1 — backwards, giving
        //     4x the traffic to the target with 1/25th the capacity):
        //     api-low failure rate 90.2% (444 attempts, 4097 errors —
        //     crosses this app's 90% "Crashed" threshold), api-high
        //     failure rate 0.0% (barely used, comfortably idle), overall
        //     success 20.6%. The Load Balancer's own status dot reads
        //     "error" (steady red, 44.2% of its own forwarded requests
        //     failed) not pulsing "Crashed" — same backfilled-metrics fix
        //     as the Uneven Backend Divergence demo, correctly attributing
        //     the failure to api-low, not the router forwarding it.
        //   REMEDY Fix Target Weights (api-low=4->1, api-high=1->25 — the
        //     real 1:25 capacity ratio, not just "swap the two numbers"):
        //     api-low failure rate 0.0% (398/398 succeed), api-high
        //     failure rate 0.0% (9925 attempts, 2 errors), overall success
        //     100.0% — fully healthy. Re-verified through
        //     getFailureModeDemo() itself, not just a standalone tuning
        //     config.
        // Worth noting for anyone re-tuning this: a naive "just swap the
        // two weight values" (1:4) was tried first and rejected — it
        // under-corrects, since the targets' real capacity ratio here is
        // 1:25, not 1:4. A meaningfully wrong weight in the *other*
        // direction still leaves api-high under-fed relative to what it
        // can safely absorb; only a weight ratio that actually tracks
        // real capacity clears both targets.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 880, keyPoolSize: 50 },
            },
            {
              id: "lb",
              type: "load_balancer",
              label: "Load Balancer",
              position: { x: 340, y: 160 },
              config: {
                algorithm: "weighted_round_robin",
                weights: { "api-low": 4, "api-high": 1 },
              },
            },
            {
              id: "api-low",
              type: "api",
              label: "API Server (low capacity)",
              position: { x: 600, y: 60 },
              config: {
                maxConcurrent: 2,
                maxQueueLength: 20,
                processingTimeMs: 30,
                processingJitterMs: 5,
              },
            },
            {
              id: "api-high",
              type: "api",
              label: "API Server (high capacity)",
              position: { x: 600, y: 260 },
              config: {
                maxConcurrent: 50,
                maxQueueLength: 100,
                processingTimeMs: 30,
                processingJitterMs: 5,
              },
            },
            {
              id: "db-low",
              type: "database",
              label: "Database (behind low)",
              position: { x: 860, y: 60 },
              config: {
                maxConnections: 1000,
                maxQueueLength: 1000,
                processingTimeMs: 1,
                failureProbability: 0,
              },
            },
            {
              id: "db-high",
              type: "database",
              label: "Database (behind high)",
              position: { x: 860, y: 260 },
              config: {
                maxConnections: 1000,
                maxQueueLength: 1000,
                processingTimeMs: 1,
                failureProbability: 0,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "lb", latencyMs: 5 },
            { source: "lb", target: "api-low", latencyMs: 5 },
            { source: "lb", target: "api-high", latencyMs: 5 },
            { source: "api-low", target: "db-low", latencyMs: 2 },
            { source: "api-high", target: "db-high", latencyMs: 2 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "fix-target-weights",
              label: "Fix Target Weights",
              nodeId: "lb",
              configOverride: { weights: { "api-low": 1, "api-high": 25 } },
              description:
                "The production fix: set each target's weight to actually track its real capacity, not a guessed or inherited number. Here that's a 1:25 ratio, matching the servers' real 2:50 Max Concurrent split — not simply swapping the two broken values, which would still under-feed the high-capacity target relative to what it can safely absorb. Weighted Round Robin never validates this itself; it trusts whatever weight it's given completely.",
            },
          ],
        },
      },
      {
        name: "Load Balancer as SPOF",
        description:
          "Not simulated — the Load Balancer itself never fails here. Worth knowing regardless: a production deployment runs more than one LB behind DNS or a floating IP, because a single LB instance is exactly the kind of single point of failure this whole architecture is otherwise designed to avoid.",
        reproduce: [],
        observe: "Named for completeness — there's nothing to trigger, only to know.",
        simulated: false,
      },
    ],
  },
  cache: {
    tagline: "Prevents repeated work — but only if the same work keeps repeating.",
    summary:
      "The Cache sits in front of slower storage and answers from memory when it can (cache-aside): check the cache, fall through on a miss, store the result on the way back. Hit rate is a property of both the cache (capacity, eviction policy) and the traffic (how repetitive it actually is).",
    industryExamples: ["Redis, Memcached, AWS ElastiCache"],
    usage: {
      whereItGoes:
        "Always sits between a request source and slower storage — never a leaf node, never a root. The canonical position is directly in front of a Database.",
      typicalTopology: "Client → API Server → Cache → Database.",
      normal:
        "Capacity sized to comfortably hold the Client's Key Pool Size (or a meaningful working set of it), TTL generous relative to traffic. Stampede Protection defaults to Naive (matching this entity's behavior before the toggle existed) — switch it to Coalesced to see the production fix in action. A healthy run shows a high, stable hit rate.",
      extremes: [
        {
          title: "Capacity → 1",
          description:
            "The cache can only ever remember one key at a time — everything else is a guaranteed eviction. Makes eviction policy irrelevant (no meaningful choice between them at capacity 1) and isolates the effect of capacity alone.",
        },
        {
          title: "TTL → 0 with high Request Rate",
          description:
            "Entries never expire on their own, so eviction policy becomes the only thing determining hit rate — the cleanest setup for comparing LRU vs LFU vs FIFO vs MRU head-to-head.",
        },
        {
          title: "TTL very low (e.g. 100ms) under sustained load",
          description:
            "Forces continuous stampede-adjacent behavior even without a single dramatic expiry event — useful for seeing Naive vs Coalesced diverge under steady pressure, not just a one-off spike.",
        },
      ],
      edgeCases: [
        "Capacity set exactly equal to Key Pool Size — the boundary where, with a good policy, every key could stay cached forever, but any policy 'mistake' still causes evictions. Compare LRU against FIFO right at this boundary — they should differ most here.",
        "MRU eviction policy against genuinely random (non-cyclic) traffic — per the entity's own documentation this is the policy expected to perform worst. Confirm it actually does, rather than taking the claim on faith.",
        "TTL set low relative to Request Rate but Stampede Protection left on Naive (not the production default) — deliberately reproduce the Stampede failure mode below before switching to Coalesced, so the 'before' picture is real and measured, not assumed.",
      ],
    },
    tradeoffs: [
      {
        title: "Eviction Policy",
        description:
          "LRU (evict least-recently-touched) is the default that works for most traffic shapes. LFU (evict least-frequently-requested) beats it when a small set of keys is disproportionately hot. FIFO ignores access pattern entirely — simplest, worst hit rate under skewed traffic. MRU is a special case that helps only cyclic-scan patterns and generally hurts here.",
      },
      {
        title: "TTL",
        description:
          "Longer TTL keeps entries valid longer, raising hit rate at the cost of staler data. Shorter TTL forces fresher re-fetches more often, trading hit rate for freshness — and, at the extreme, is exactly what triggers a stampede.",
      },
      {
        title: "Stampede Protection",
        description:
          "Naive lets every concurrent miss for a key independently re-fetch — simplest, but multiplies downstream load exactly when a hot key expires under load. Coalesced makes the first miss the leader and has every other concurrent miss wait on and share its result (request coalescing / single-flight), at the cost of a waiting follower holding its own concurrency/queue slot the whole time.",
      },
    ],
    pros: [
      "All three named 'production killer' failure modes — Stampede, Penetration, and Avalanche — are fully simulated with a real before/after, not just described.",
      "Cache-aside is the pattern behind the overwhelming majority of real production caching, so what's modeled here transfers directly.",
    ],
    cons: [
      "Only cache-aside is simulated — write-through, write-behind, and read-through are named but not implemented.",
    ],
    failureModes: [
      {
        name: "Cache Stampede",
        description:
          "A popular key's value disappears (TTL expiry, cold start) while many requests for it are still arriving. Under Naive mode, every one of those misses independently re-fetches from downstream — multiplying load on the database at exactly the wrong moment.",
        reproduce: [
          "Put a Cache in front of a Database with a small Key Pool Size on the Client (so keys repeat) and a low TTL relative to Request Rate — e.g. TTL 500ms against 50 req/s.",
          "Set Stampede Protection to Naive and run.",
          "Switch Stampede Protection to Coalesced, keep everything else identical, and run again.",
        ],
        observe:
          "The Cache Inspector's Stampede section shows independent fetches spiking with every expiry under Naive, then flattening toward one fetch per expiry under Coalesced — with the Database's load visibly lower on the second run.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run) before writing
        // these numbers down — deliberately extreme (one hot key, 800 req/s,
        // a database with just one connection and no queue) so the broken
        // state is unmistakable, not a subtle utilization bump:
        //   BROKEN (naive, ttl=100ms):     db failure rate 96.5% (crosses
        //     this app's own 90% "Crashed" status threshold), overall
        //     success rate 69.2%.
        //   REMEDY Coalesced:              db failure rate 0%, overall
        //     success rate 100% — fully healthy.
        //   REMEDY Raised TTL (ttl=3000ms, still naive): db failure rate is
        //     still 96.3% *when a stampede happens* — raising TTL doesn't
        //     change how badly Naive mode behaves during one — but expiries
        //     are ~30x rarer, so overall success rate recovers to 97.8%.
        //     A real, honest, partial mitigation: better than broken,
        //     visibly worse than Coalesced.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 800, keyPoolSize: 1 },
            },
            {
              id: "cache",
              type: "cache",
              label: "Cache",
              position: { x: 360, y: 160 },
              config: {
                capacity: 20,
                evictionPolicy: "lru",
                ttlMs: 100,
                stampedeMode: "naive",
                maxConcurrent: 200,
                maxQueueLength: 1000,
              },
            },
            {
              id: "database",
              type: "database",
              label: "Database",
              position: { x: 640, y: 160 },
              config: { maxConnections: 1, maxQueueLength: 0, processingTimeMs: 60 },
            },
          ],
          startingConnections: [
            { source: "client", target: "cache", latencyMs: 5 },
            { source: "cache", target: "database", latencyMs: 5 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "coalesced",
              label: "Coalesced (single-flight)",
              nodeId: "cache",
              configOverride: { stampedeMode: "coalesced" },
              description:
                "The production fix: the first miss for a key becomes its leader and fetches; every other concurrent miss for that same key waits on and shares the leader's result instead of fetching independently. Doesn't change how often the hot key expires — changes what happens each time it does.",
            },
            {
              kind: "config",
              id: "raise-ttl",
              label: "Raise TTL",
              nodeId: "cache",
              configOverride: { ttlMs: 3000 },
              description:
                "A partial mitigation, not a fix: fewer expiries means fewer opportunities for a stampede to happen at all, but every expiry that still occurs stampedes exactly as badly as before under Naive mode — and it trades staler data for that reduction. Compare its numbers against Coalesced to see the difference between reducing frequency and fixing the mechanism.",
            },
          ],
        },
      },
      {
        name: "Cache Penetration",
        description:
          "Repeated lookups for a key that never exists in the underlying store — every one is a guaranteed miss, so it bypasses the cache's protection entirely and hits the database every time. Production fix: cache the negative result too (or use a bloom filter to reject impossible keys before they reach storage — named, not simulated).",
        reproduce: [
          "Set the Client's Missing Key Rate to something meaningful (e.g. 30%) so a real share of traffic targets a small, fixed pool of permanently nonexistent keys.",
          "Set the Cache's Negative Caching to Off and run — every lookup for a missing key makes its own full downstream round trip, every time.",
          "Switch Negative Caching to On, keep everything else identical, and run again.",
        ],
        observe:
          "The Cache Inspector's Penetration section shows almost all misses as 'Downstream (not found)' under Off; switching On shifts most of that same traffic to 'Negative cache (avoided)' and the Database's request count drops for identical traffic.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, 1200 req/s,
        // 88% of traffic targeting a small pool of permanently-missing
        // keys) before writing these numbers down — deliberately extreme
        // (a single-connection database, an aggressive probing rate) so
        // the broken state crosses this app's own 90% "Crashed" status
        // threshold:
        //   BROKEN (negativeCaching=off): database failure rate 90.2%
        //     (6483 attempts, 5848 errors — crosses CRASH_FAILURE_RATE),
        //     100% utilization; all 6229 misses for the missing-key pool
        //     went downstream (0 avoided).
        //   REMEDY Negative Caching On: database failure rate 0.0% (148
        //     attempts, 0 errors), utilization drops to 25.5% — fully
        //     healthy. 6140 of 6229 phantom misses answered from the
        //     negative cache instead of hitting the database again (98.6%
        //     avoided) — the small residual (89) is each missing key's
        //     unavoidable first-ever lookup, before that key has a
        //     negative entry yet.
        // Overall client success rate stays low either way (8.7% -> 12.0%)
        // — capped by missingKeyRate=0.88 itself: 88% of all traffic
        // targets a key that will never exist, and Cache.ts resolves that
        // deterministically as "not found" regardless of Negative Caching.
        // This remedy protects the database, not the client's raw success
        // rate — see its own description below.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 1200, keyPoolSize: 20, missingKeyRate: 0.88 },
            },
            {
              id: "cache",
              type: "cache",
              label: "Cache",
              position: { x: 360, y: 160 },
              config: {
                capacity: 50,
                evictionPolicy: "lru",
                ttlMs: 0,
                maxConcurrent: 100,
                maxQueueLength: 200,
                negativeCaching: "off",
                negativeCacheTtlMs: 5000,
              },
            },
            {
              id: "database",
              type: "database",
              label: "Database",
              position: { x: 640, y: 160 },
              config: {
                maxConnections: 1,
                maxQueueLength: 50,
                processingTimeMs: 10,
                processingJitterMs: 5,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "cache", latencyMs: 5 },
            { source: "cache", target: "database", latencyMs: 5 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "negative-caching-on",
              label: "Negative Caching On",
              nodeId: "cache",
              configOverride: { negativeCaching: "on" },
              description:
                "The production fix: the first \"not found\" result for a given missing key gets cached too, for Negative Cache TTL, so every repeat lookup for that same permanently-missing key is answered locally instead of making its own full round trip to the database. Doesn't change that a lookup for a missing key still comes back \"not found\" — changes whether the database has to be asked again to know that.",
            },
          ],
        },
      },
      {
        name: "Cache Avalanche",
        description:
          "Many unrelated keys expiring at the same moment (e.g. everything cached with the same fixed TTL, all set at once) — the cache's protection briefly disappears for a large fraction of traffic simultaneously, not just one hot key. Production fix: jitter each entry's TTL so expirations spread out instead of clustering.",
        reproduce: [
          "Put a Cache in front of a Database with a moderate Key Pool Size on the Client and enough Request Rate that many keys get cached around the same moment.",
          "Set the Cache's TTL low relative to Request Rate (e.g. 500ms) and TTL Jitter to 0%, then run.",
          "Raise TTL Jitter toward its upper end (e.g. 40–50%), keep everything else identical, and run again.",
        ],
        observe:
          "The Cache Inspector's Avalanche section shows a high 'Peak burst (100ms)' number relative to total expired misses at 0% Jitter — a synchronized wave; raising Jitter lowers that peak and the callout switches to 'no synchronized wave detected'.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, 1000 req/s,
        // an 8-key pool at Cache capacity 8, Naive stampede mode) before
        // writing these numbers down. Unlike every other "Try It" demo,
        // tuning could not push the broken state to this app's own 90%
        // "Crashed" status threshold — three real, structural reasons
        // found along the way (see docs/Learn-Problem-Solution.md §8's
        // own note on this row): naive stampede duplication dominates at
        // high traffic and drowns out the avalanche-specific signal;
        // switching to Coalesced stampede protection to remove that
        // confound instead collapses the *cache's* own admission (a
        // waiting follower holds its own concurrency slot for the whole
        // wait against a slow-draining backend); and the cold-start phase
        // is mathematically jitter-invariant (jitter only randomizes an
        // entry's *future* expiry, never its *first* fetch), so whatever
        // crashes during warm-up crashes identically in both runs and
        // dilutes the aggregate number either way. The numbers below are
        // the best real, honest gap found after a systematic sweep — a
        // meaningful, correctly-directioned improvement, not a full
        // crash-to-healthy flip:
        //   BROKEN (ttlJitterPercent=0): database failure rate 70.1%
        //     (334 attempts, 234 errors), overall success rate 96.0%
        //     (most traffic never reaches the database at all — only
        //     cache misses do). cacheAvalanche: 16 expired misses, peak
        //     burst 5 within 100ms — crosses this app's own isAvalanche
        //     (> 3) threshold, so the Inspector's callout reads as a
        //     detected wave.
        //   REMEDY Raise TTL Jitter (0% -> 50%): database failure rate
        //     41.2% (279 attempts, 115 errors) — a real ~29-point
        //     improvement, not a fix. Peak burst drops to 3 (at the
        //     isAvalanche threshold), flipping the callout to "no
        //     synchronized wave detected".
        // The database's own node-health dot reads "error" (steady red)
        // in both runs — never "Crashed" (pulsing) broken, never
        // green/healthy fixed. This demo's evidence is the Cache's own
        // Avalanche section (expired misses, peak burst, the callout
        // text) and the database's measurably lower failure rate, not a
        // canvas-wide status flip the way every other demo here shows.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 1000, keyPoolSize: 8 },
            },
            {
              id: "cache",
              type: "cache",
              label: "Cache",
              position: { x: 360, y: 160 },
              config: {
                capacity: 8,
                evictionPolicy: "lru",
                ttlMs: 2000,
                ttlJitterPercent: 0,
                stampedeMode: "naive",
                maxConcurrent: 200,
                maxQueueLength: 1000,
              },
            },
            {
              id: "database",
              type: "database",
              label: "Database",
              position: { x: 640, y: 160 },
              config: {
                maxConnections: 3,
                maxQueueLength: 6,
                processingTimeMs: 40,
                processingJitterMs: 3,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "cache", latencyMs: 5 },
            { source: "cache", target: "database", latencyMs: 5 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "raise-ttl-jitter",
              label: "Raise TTL Jitter",
              nodeId: "cache",
              configOverride: { ttlJitterPercent: 0.5 },
              description:
                "The production fix, honestly partial at this traffic level: spreading each entry's own expiry over a window instead of letting a whole batch share one exact TTL cuts the database's failure rate substantially (70% → 41% here) by turning one large synchronized spike into several smaller ones. It doesn't eliminate the underlying mismatch — jitter changes *when* entries expire, not *how many* need refetching — so watch the Cache's own Avalanche section for the real evidence: Peak Burst drops enough to flip the callout from a detected wave to \"no synchronized wave detected\", even though the database keeps seeing real load either way.",
            },
          ],
        },
      },
    ],
  },
  cdn: {
    tagline: "Distance is a physics problem, not a capacity problem.",
    summary:
      "The CDN is a cache with geography — N independent edge caches, each closer to some users than a single origin could be, each falling through to the origin on a miss. Content warmed at one edge isn't visible at another, exactly like real CDN edges.",
    industryExamples: ["Cloudflare, Akamai, Fastly, Amazon CloudFront"],
    usage: {
      whereItGoes:
        "Sits in front of the entire rest of the architecture, closest to the Client — it's the first thing a request reaches, falling through to everything else (API Server, Database) only on a miss.",
      typicalTopology: "Client → CDN → API Server → Database, with the CDN's origin being whatever's directly downstream of it.",
      normal:
        "Edge Count moderate (3–5), Min/Max Edge Latency reflecting a realistic geographic spread, Capacity per edge sized to a meaningful slice of the Key Pool Size divided across edges.",
      extremes: [
        {
          title: "Edge Count → 1",
          description:
            "Degenerates to a plain Cache with an added latency cost — no geographic benefit at all, since there's only one place a request could land. Useful for isolating the CDN's caching mechanics from its geography mechanics.",
        },
        {
          title: "Edge Count → 20 (max)",
          description:
            "Maximum geographic spread, minimum per-edge warmth — the tension named in the entity's own Engineering Concept made concrete. Compare hit rate here against Edge Count → 3 with identical traffic.",
        },
        {
          title: "Min Edge Latency = Max Edge Latency",
          description:
            "Every edge reports the same latency number — but routing is still proximity-weighted from the real position of the User pin regardless of this setting, so hit rate still skews toward whichever edge the pin is nearest. This isolates latency as a variable, not proximity itself: drag the User pin and the traffic split still shifts even though every edge now shows identical latency.",
        },
      ],
      edgeCases: [
        "A Client Key Pool Size much larger than (Edge Count × per-edge Capacity) — every edge is perpetually cold no matter how the traffic is routed, the CDN equivalent of Cache's key-pool-defeats-cache edge case.",
        "Compare the CDN's 'Why This Helps' latency panel at Edge Count 2 vs 10 — confirm the measured latency improvement is real and not just an assumption baked into the visualization.",
        "The origin (whatever the CDN falls through to on a miss) deliberately under-provisioned — a CDN with a high miss rate should reveal an undersized origin exactly the way removing a Cache would reveal an undersized Database.",
      ],
    },
    tradeoffs: [
      {
        title: "Edge Count",
        description:
          "More edges improve worst-case latency (some user is always closer to an edge), but the same traffic now splits across more independently-warmed caches — each individually colder. Proximity and hit rate pull in different directions; a CDN is a bet that proximity wins.",
      },
      {
        title: "Min / Max Edge Latency",
        description:
          "Widening the gap between nearest and farthest edge makes which edge a user lands on matter more. A tighter gap makes edge placement close to irrelevant for latency, leaving hit rate as the only thing that matters.",
      },
      {
        title: "Pull vs Push (named, not simulated)",
        description:
          "This CDN is implicitly pull-only — content is fetched into an edge the first time it's asked for there. Real CDNs can also push content to every edge ahead of any request, for known high-demand releases — pre-positioning content before the first user ever asks.",
      },
      {
        title: "Proximity-Weighted Routing (replaces key hashing)",
        description:
          "Which edge answers a request is now weighted by real distance from the draggable User pin — the nearest edge gets a larger share of dispatches, not just a faster response. The tradeoff: a given content key can now land on different edges across requests, since routing no longer depends on the key at all. An earlier design hashed the key instead, giving a given piece of content a single sticky edge (real anycast/geo-DNS behavior) at the cost of the map being just a static picture rather than something that actually drives the simulation.",
      },
    ],
    pros: [
      "Ships a measured 'with vs. without this CDN' latency comparison (Why This Helps) — the CDN's benefit is demonstrated with real numbers from the same seed and traffic, not just asserted.",
      "The User and Origin are real, draggable pins on the Edge Map, not fixed numbers — moving the User pin changes per-edge latency and which edge wins traffic live, in the same view.",
    ],
    cons: [
      "No real geography — edges sit on a schematic 0–100 plane at fixed, auto-arranged positions (only User and Origin are independently placeable), not an actual map with real regional traffic distribution.",
      "Routing is no longer content-sticky — a given key can land on a different edge from one request to the next, since proximity to the User pin decides, not the key itself (see Proximity-Weighted Routing above).",
      "Push CDN and origin shield are unmodeled. Of the three named invalidation strategies, only TTL is simulated — explicit purge would need a scheduled/timer event this engine has no concept of anywhere; versioned key needs no special modeling at all, since a new key is already an independent cache entry the moment traffic shifts to it.",
    ],
    failureModes: [
      {
        name: "Cold Edge Network",
        description:
          "Adding edges always helps worst-case latency, but past a point it can hurt overall hit rate — the same traffic thinned across more independently-cold caches. More edges isn't a strict upgrade.",
        reproduce: [
          "Build a CDN with a small Edge Count (e.g. 2) and a small Client Key Pool Size so it warms up fast.",
          "Run and note per-edge hit rate in the Inspector.",
          "Raise Edge Count substantially (e.g. to 15) with identical traffic and run again.",
        ],
        observe:
          "Per-edge hit rate drops even though worst-case latency improves — the CDN's Edge Map (distance = latency, color = hit rate) makes both effects visible on the same view.",
        simulated: true,
      },
    ],
  },
  message_queue: {
    tagline: "Lets a producer and its consumers work at different speeds.",
    summary:
      "The Message Queue acknowledges the producer the instant a message is durably admitted — not once a consumer finishes it — then dispatches to its own downstream consumer as an independently-simulated request under the same request id. A bounded backlog absorbs bursts a consumer alone couldn't keep up with.",
    industryExamples: [
      "Point-to-point — RabbitMQ, Amazon SQS",
      "Pub-sub / fan-out — Apache Kafka, Amazon SNS, Google Pub/Sub",
    ],
    usage: {
      whereItGoes:
        "Sits between a producer (Client or API Server) and one or more consumer targets. Under Queue mode, connect it to a single downstream target representing the shared consumer pool; under Topic mode, connect it to multiple downstream targets, each an independent subscriber.",
      typicalTopology:
        "Client → API Server → Message Queue → Database (Queue mode), or Message Queue → [API Server A, API Server B, API Server C] (Topic mode, fan-out).",
      normal:
        "Consumer Count sized to keep the backlog draining faster than it fills on average, Max Queue Length generous enough to absorb realistic bursts, Dispatch Time reflecting real per-message work.",
      extremes: [
        {
          title: "Consumer Count → 1",
          description:
            "Every message is handled strictly one at a time — the backlog becomes the primary place load shows up, rather than rejections. A clean way to watch a backlog actually grow and drain in the Inspector instead of just seeing pass/fail.",
        },
        {
          title: "Max Queue Length → 0",
          description:
            "No buffering at all — the entity degenerates to synchronous hand-off, rejecting anything that can't be dispatched immediately. Useful for confirming the 'accept now, finish later' behavior is really doing something, by comparing against this.",
        },
        {
          title: "Delivery Mode → Topic with 5 subscribers",
          description:
            "Producer load is silently multiplied by 5 in total dispatch work. The single fastest way to demonstrate that fan-out isn't free, even though no single subscriber sees more traffic than it would alone.",
        },
      ],
      edgeCases: [
        "Queue mode with Consumer Count high but Dispatch Time also high — check whether the backlog still grows, since more consumers each individually slow can still add up to a slow overall drain rate.",
        "Topic mode with subscribers of very different downstream capacity (one API Server with generous Max Concurrent, one deliberately starved) — confirm a slow subscriber genuinely doesn't block a fast one, per the entity's core claim.",
        "Producer Request Rate set to exactly match Consumer Count × (1000ms / Dispatch Time), the theoretical break-even drain rate — small deviations either direction should tip the backlog from stable to slowly growing or shrinking.",
      ],
    },
    tradeoffs: [
      {
        title: "Queue vs Topic (Delivery Mode)",
        description:
          "Queue is point-to-point — a shared consumer pool competes for each message, exactly one consumer gets it, a classic task queue. Topic is fan-out/pub-sub — every downstream connection is an independent subscriber with its own consumer pool and gets its own copy of every message. A slow subscriber under Topic only falls behind on its own copy; it never blocks anyone else, since there's no shared backlog to overflow.",
      },
      {
        title: "Consumer Count vs Dispatch Time",
        description:
          "More consumers drain the backlog faster under sustained load. Slower Dispatch Time lowers effective drain rate even with Consumer Count unchanged — the same admit/queue/reject shape every bounded entity here shares.",
      },
      {
        title: "Max Queue Length",
        description:
          "A bigger backlog absorbs a bigger burst without dropping messages, at the cost of longer wait times for whatever's backlogged — decoupling 'accepted' from 'finished' doesn't mean unlimited, it means bounded and later.",
      },
    ],
    pros: [
      "Backpressure that doesn't mean instant rejection — the queue trades that for 'reject only once the buffer itself is full,' the actual production pattern for absorbing bursts.",
      "Modeling Topic mode as literally independent consumer pools per subscriber makes fan-out load multiplication something you can watch happen, not just a warning in prose.",
    ],
    cons: [
      "No dead-letter queue — production treats DLQ handling as 'non-negotiable'; here a message that keeps failing has nowhere to go.",
      "No redelivery or idempotency modeling — every admitted message is dispatched exactly once, so the at-least-once-delivery lesson is named, not demonstrated.",
      "Kafka's partition/consumer-group/replay model isn't represented — Topic mode captures the fan-out shape, not partitioned ordering or replay.",
    ],
    failureModes: [
      {
        name: "Backlog Overflow",
        description:
          "Producer rate outpacing what Consumer Count × Dispatch Time can drain. The queue absorbs the gap for a while — that's the point — but once Max Queue Length is also exhausted, new messages are rejected outright.",
        reproduce: [
          "Set Consumer Count low (e.g. 2) and Dispatch Time moderate (e.g. 30ms), with a modest Max Queue Length.",
          "Raise the producing Client's Request Rate well past what 2 consumers can drain at that dispatch time.",
          "Run the simulation.",
        ],
        observe:
          "The Results bar shows rejections once the backlog fills — compare against raising Consumer Count alone to drain faster without touching the backlog size.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, Client at 500
        // req/s -> MessageQueue -> Database, Database given generous
        // capacity (50 connections) so it's never the bottleneck being
        // measured):
        //   BROKEN (consumerCount=2, maxQueueLength=20, dispatchTimeMs=30):
        //     drain rate = 2 / 0.03s ≈ 66.7 msg/s, far under the 500 req/s
        //     producer rate. Queue failure rate 92.3% (420 admitted, 5062
        //     rejected), overall success 14.2% — crosses this app's 90%
        //     "Crashed" threshold.
        //   REMEDY Raise Consumer Count (2 -> 40): drain rate ≈ 1333 msg/s,
        //     comfortably above demand. Queue failure rate 0.0% (2951
        //     admitted, 0 rejected), overall success 100.0% — the real fix,
        //     actual added drain throughput.
        //   REMEDY Raise Max Queue Length only (20 -> 500, the field's own
        //     max, consumerCount left at 2): failure rate 82.0% (900
        //     admitted, 4102 rejected), overall success 30.5% — a real but
        //     honest partial mitigation: a bigger backlog absorbs a bigger
        //     burst, but demand stays above drain rate for the whole run
        //     here, not just a temporary spike, so even the field's own
        //     maximum barely moves the needle. No longer pulsing "Crashed"
        //     (under the 90% threshold) but still clearly unhealthy.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 500, keyPoolSize: 200 },
            },
            {
              id: "message-queue",
              type: "message_queue",
              label: "Message Queue",
              position: { x: 360, y: 160 },
              config: {
                deliveryMode: "queue",
                consumerCount: 2,
                maxQueueLength: 20,
                dispatchTimeMs: 30,
                dispatchJitterMs: 5,
              },
            },
            {
              id: "database",
              type: "database",
              label: "Database",
              position: { x: 640, y: 160 },
              config: {
                type: "sql",
                maxConnections: 50,
                maxQueueLength: 500,
                processingTimeMs: 10,
                processingJitterMs: 2,
                failureProbability: 0,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "message-queue", latencyMs: 2 },
            { source: "message-queue", target: "database", latencyMs: 2 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "raise-consumer-count",
              label: "Raise Consumer Count",
              nodeId: "message-queue",
              configOverride: { consumerCount: 40 },
              description:
                "The production fix: actual added drain throughput. The backlog was never the real problem — it was absorbing a gap between producer and consumer speed that never closed, because too few consumers were pulling from it at once. More consumers drain messages faster than the producer can add them, so the backlog stops growing and stays near-empty instead of staying permanently full.",
            },
            {
              kind: "config",
              id: "raise-max-queue-length",
              label: "Raise Max Queue Length",
              nodeId: "message-queue",
              configOverride: { maxQueueLength: 500 },
              description:
                "A partial mitigation, not a fix: a bigger backlog absorbs a bigger burst of producer traffic without rejecting it, but it doesn't add any real drain capacity — still only 2 consumers pulling from it. Against a temporary spike that would be enough to ride it out; against demand that stays above drain rate for the whole run, even the field's own maximum queue length barely helps, it just delays rejections rather than preventing them.",
            },
          ],
        },
      },
      {
        name: "Fan-out Load Multiplication",
        description:
          "Switching to Topic mode doesn't split traffic across subscribers — it multiplies it. Each subscriber gets every message, so total dispatch load scales with subscriber count for the same producer rate.",
        reproduce: [
          "Connect the Message Queue to two or three downstream targets.",
          "Set Delivery Mode to Queue and run — note the total dispatch load is shared across the pool.",
          "Switch Delivery Mode to Topic with identical config and run again.",
        ],
        observe:
          "Under Topic, every downstream target's Inspector shows it received the full message volume independently — not a fraction of it — and the queue needs Consumer Count / Max Queue Length sized for that multiplication to avoid backlog overflow.",
        simulated: true,
      },
    ],
  },
  rate_limiter: {
    tagline: "Says no immediately, instead of making anything wait.",
    summary:
      "The Rate Limiter admits requests only up to a configured rate — Token Bucket allows short bursts by spending saved-up capacity, Sliding Window enforces a hard, steady ceiling with no burst allowance. Whatever it rejects fails immediately; it never queues.",
    industryExamples: ["Stripe API rate limits", "Cloudflare rate limiting", "AWS API Gateway throttling"],
    usage: {
      whereItGoes:
        "Sits early, directly behind whatever generates the traffic being throttled — usually right after the Client, before it reaches an API Server or anything more expensive downstream.",
      typicalTopology: "Client → Rate Limiter → API Server → Database.",
      normal:
        "Requests/Second set comfortably above typical legitimate traffic, Burst Capacity (Token Bucket only) sized to tolerate normal bursts without tolerating abuse.",
      extremes: [
        {
          title: "Requests/Second → 1 (min)",
          description:
            "Almost everything gets rejected regardless of algorithm — useful as a stress test of what total lockdown looks like in the Results bar, and to confirm downstream entities never see traffic that was already rejected here.",
        },
        {
          title: "Burst Capacity → 1000 (max), Token Bucket",
          description:
            "Effectively removes burst protection — Token Bucket starts behaving close to 'admit almost everything for a while.' Compare against Sliding Window at the same Requests/Second to see the gap between them at its widest.",
        },
      ],
      edgeCases: [
        "Client Request Rate set to exactly the Rate Limiter's Requests/Second — the steady-state boundary. Both algorithms should behave near-identically here; any burst above it should start showing the divergence described in the Failure Modes section.",
        "A Rate Limiter placed after an API Server instead of before it — not the canonical position, but worth trying once: protecting a dependency that's already been reached defeats the entity's own 'never make anything wait' premise, since work was already done before the rejection.",
        "Two Clients sharing one Rate Limiter, one well-behaved and one bursting — confirm the limiter has no per-source fairness (it's a single global rate), so the well-behaved Client's requests get rejected too once the bursting one exhausts the shared budget.",
      ],
    },
    tradeoffs: [
      {
        title: "Token Bucket vs Sliding Window",
        description:
          "Identical under smooth, steady traffic — they diverge the moment traffic bursts. Token Bucket forgives the spike (spends accumulated idle capacity); Sliding Window rejects the overflow immediately regardless of how idle the limiter was a moment ago.",
      },
      {
        title: "Requests/Second vs Burst Capacity",
        description:
          "Requests/Second sets the steady-state ceiling both algorithms converge to. Burst Capacity only matters for Token Bucket — how much accumulated idle capacity can be spent at once — and has no effect under Sliding Window.",
      },
    ],
    pros: [
      "Rejecting immediately is a genuinely different tradeoff than queueing (API Server, Database) or buffering (Message Queue) — having all three in the same simulator makes that comparison direct instead of theoretical.",
    ],
    cons: [
      "Fail-fast only makes sense when the caller can retry or degrade gracefully on its own — this entity doesn't model what a rejected caller does next.",
      "No per-client/per-key rate limiting — the limiter applies one global rate to all traffic passing through it, not the more common production pattern of limiting per API key or per IP.",
    ],
    failureModes: [
      {
        name: "Burst Rejection Divergence",
        description:
          "The two algorithms behave identically under smooth traffic, so the difference between them only shows up once traffic is bursty — the same shape as Load Balancer's two algorithms only diverging once backends aren't equal.",
        reproduce: [
          "Set Requests/Second to a moderate steady rate and Burst Capacity noticeably higher than it.",
          "Send a bursty Client load — a Request Rate spike above the steady rate — through the limiter set to Token Bucket, and note the rejection rate.",
          "Switch Algorithm to Sliding Window with identical traffic and compare.",
        ],
        observe:
          "Token Bucket admits more of the burst (spending Burst Capacity); Sliding Window rejects the overflow immediately once the steady rate is exceeded, regardless of how idle the limiter was just before.",
        simulated: true,
        // Verified against the real engine (seed 42, 3s run, 300 req/s
        // sustained against a Requests/Second ceiling of 20) before writing
        // these numbers down — deliberately extreme (a real misconfigured
        // ceiling, not a subtle one) so the broken state crosses this app's
        // own 90% "Crashed" status threshold:
        //   BROKEN (sliding_window, requestsPerSecond=20): rate limiter
        //     admitted 60 / rejected 805 (93.1% failure rate — crosses
        //     CRASH_FAILURE_RATE), overall success rate 6.9%.
        //   REMEDY Raise Requests/Second (20 -> 400): admitted 865 /
        //     rejected 0, overall success rate 100% — fully healthy. The
        //     real fix: the ceiling now actually matches real demand.
        //   REMEDY Switch to Token Bucket only (requestsPerSecond left at
        //     20): admitted 159 / rejected 706 (81.6% failure rate — still
        //     unhealthy, but no longer crosses the Crashed threshold).
        //     Token Bucket's accumulated burst capacity forgives the first
        //     instant of overload, then throttles down to the same 20
        //     req/s ceiling Sliding Window enforces from the first
        //     request — a real, honest partial improvement against
        //     sustained overload, not a fix for an undersized ceiling.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 300, keyPoolSize: 50 },
            },
            {
              id: "rate-limiter",
              type: "rate_limiter",
              label: "Rate Limiter",
              position: { x: 360, y: 160 },
              config: {
                algorithm: "sliding_window",
                requestsPerSecond: 20,
                burstCapacity: 100,
              },
            },
            {
              id: "database",
              type: "database",
              label: "Database",
              position: { x: 640, y: 160 },
              config: {
                maxConnections: 50,
                maxQueueLength: 200,
                processingTimeMs: 5,
                failureProbability: 0,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "rate-limiter", latencyMs: 5 },
            { source: "rate-limiter", target: "database", latencyMs: 5 },
          ],
          durationMs: 3000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "raise-requests-per-second",
              label: "Raise Requests/Second",
              nodeId: "rate-limiter",
              configOverride: { requestsPerSecond: 400 },
              description:
                "The production fix: the configured ceiling was simply too low for real legitimate traffic. Raising it so the steady rate actually matches demand fixes this regardless of which algorithm is running — algorithm choice only ever changes how a temporary burst above the ceiling is handled, not whether the ceiling itself is sized correctly.",
            },
            {
              kind: "config",
              id: "switch-to-token-bucket",
              label: "Switch to Token Bucket",
              nodeId: "rate-limiter",
              configOverride: { algorithm: "token_bucket" },
              description:
                "A partial mitigation, not a fix: Token Bucket's accumulated idle capacity forgives the first instant of overload, admitting a real burst that Sliding Window would reject immediately — but once that saved-up capacity is spent, it throttles down to the exact same undersized ceiling. Against demand that stays above the ceiling for a while, not just a brief spike, this only delays the failure, it doesn't prevent it.",
            },
          ],
        },
      },
    ],
  },
  circuit_breaker: {
    tagline: "Stops hammering something that's already struggling.",
    summary:
      "The Circuit Breaker wraps a single dependency and watches what happens to requests it forwards. Enough consecutive failures trips it open — every request fails instantly, without ever reaching the dependency — until a trial request is let through to check for recovery.",
    industryExamples: [
      "Netflix Hystrix (the pattern's namesake)",
      "resilience4j (Java)",
      "Polly (.NET)",
      "Istio / service-mesh-level circuit breaking",
    ],
    usage: {
      whereItGoes:
        "Wraps exactly one downstream dependency — placed directly between whatever's calling a service and that single service. Never used to protect more than one target at once; use several breakers if there are several dependencies.",
      typicalTopology: "Client → API Server → Circuit Breaker → Database.",
      normal:
        "Failure Threshold moderate (5), Trip Duration long enough to give real recovery room (several seconds), Half-Open Probes at 1 for the safest recovery check — the defaults.",
      extremes: [
        {
          title: "Failure Threshold → 1 (min)",
          description:
            "Trips on the very first failure — maximally protective, maximally trigger-happy. A single transient blip is indistinguishable from a real outage at this setting.",
        },
        {
          title: "Trip Duration → 60,000ms (max)",
          description:
            "Once tripped, the breaker stays open for a full minute of simulated time before even attempting recovery — models a dependency assumed to need a long time to come back, at the cost of a long guaranteed outage for every caller.",
        },
        {
          title: "Half-Open Probes → 10 (max)",
          description:
            "Confirms recovery with 10 concurrent trial requests instead of 1 — fast signal, but if the dependency is only barely recovered, this is enough concurrent load to knock it back down and reopen the breaker immediately.",
        },
      ],
      edgeCases: [
        "Wrap a Database with Failure Probability at 0% (never independently fails) in a Circuit Breaker — the breaker should essentially never trip, confirming it reacts to real failures, not to being present.",
        "Set Failure Threshold just above the number of failures a brief, deliberate burst produces — the breaker should not trip. Add one more failure to the burst and it should. Useful for feeling the threshold as a hard boundary, not a fuzzy one.",
        "Compare total successful requests with and without the breaker, both against a Database with high Failure Probability and low Max Connections — the breaker should show fewer requests reaching the database at all, and faster failures for the ones that don't, at the cost of the breaker itself contributing some outright rejections while open.",
      ],
    },
    tradeoffs: [
      {
        title: "Failure Threshold",
        description:
          "A higher threshold tolerates more transient errors before cutting the dependency off — slower to protect, less prone to tripping on noise. A lower threshold trips sooner — more protective, but more prone to a false trip on a brief blip.",
      },
      {
        title: "Trip Duration",
        description:
          "Longer gives a struggling dependency more uninterrupted time to recover, at the cost of a longer outage for every caller depending on it. Shorter retries recovery sooner, at the risk of probing something that hasn't actually recovered yet.",
      },
      {
        title: "Half-Open Probes",
        description:
          "More probes confirm recovery faster (more signal, sooner), but risk overwhelming a target that's only barely back. Fewer — down to 1 — is the safest, slowest recovery check.",
      },
    ],
    pros: [
      "Directly demonstrates why retrying a failing dependency doesn't help it recover — it adds load to something already struggling and can cascade the failure upstream, versus failing fast and giving it room.",
    ],
    cons: [
      "Only wraps a single dependency — no modeling of a breaker per downstream target when there are several, or bulkheading between them.",
      "No backoff strategy beyond a fixed Trip Duration — real breakers often use exponential backoff across repeated trips.",
    ],
    failureModes: [
      {
        name: "Cascading Failure Prevention",
        description:
          "The entity's whole reason to exist: without a breaker, a struggling downstream dependency keeps receiving full traffic and stays struggling (or gets worse). With a breaker, failing requests get cut off fast instead of piling up waiting on a doomed call.",
        reproduce: [
          "Build Client → Circuit Breaker → Database, with the Database's Failure Probability set high (e.g. 40%) and Max Connections low.",
          "Run once with the Circuit Breaker's Failure Threshold high enough that it barely ever trips, and note average latency and the Database's load in the Results bar.",
          "Lower Failure Threshold so it trips readily, keep the rest identical, and run again.",
        ],
        observe:
          "With a low threshold, once tripped, the Results bar shows requests failing fast (low latency, but as rejections) instead of queueing behind an already-failing Database — and the Database's own load drops while the breaker is open.",
        simulated: true,
      },
    ],
  },
  replica_pool: {
    tagline: "Scales reads by copying data, not by working harder.",
    summary:
      "The Replica Pool routes writes to one leader — the first connection drawn from it — and spreads reads round-robin across whatever replicas follow. Each replica is a real database or server configured independently; the pool only decides which one a given request goes to.",
    industryExamples: [
      "PostgreSQL streaming replication + read replicas",
      "MySQL read replicas",
      "MongoDB secondary reads",
      "Amazon RDS read replicas / Aurora Replicas",
    ],
    usage: {
      whereItGoes:
        "Sits between a request source and multiple Database (or API Server) targets — the first connection drawn from it is the leader, every connection after it is a replica. Order matters: connect the intended leader first.",
      typicalTopology: "Client → API Server → Replica Pool → [Database (leader), Database (replica), Database (replica)].",
      normal:
        "Write Ratio reflecting realistic read-heavy traffic (most real applications read far more than they write) — something like 5–15%, with 2–3 replicas behind the leader.",
      extremes: [
        {
          title: "Write Ratio → 0% (min)",
          description:
            "The leader never receives traffic at all — every request is a read, spread across replicas. Isolates read-scaling behavior completely from the leader's bottleneck.",
        },
        {
          title: "Write Ratio → 100% (max)",
          description:
            "Every request goes to the single leader; replicas sit completely idle. Demonstrates that this pattern has zero benefit for a write-heavy workload — the leader is exactly as bottlenecked as a single Database would be alone.",
        },
        {
          title: "Only one connection (no replicas)",
          description:
            "Degenerates to a plain Database — the leader handles everything, there's nothing to spread reads across. Confirms the pool adds no overhead of its own when there's nothing to pool.",
        },
      ],
      edgeCases: [
        "Give the leader Database a much lower Max Connections than the replicas — realistic if the leader is also absorbing all write overhead — and watch it become the bottleneck even at a moderate Write Ratio, sooner than the replicas would alone.",
        "Write Ratio set low (5%) but replica count also low (1) — confirms whether a single replica is already enough to meaningfully help at that ratio, or whether the benefit only shows up with more replicas.",
        "Compare a Replica Pool against Database's own 'read replicas' pattern (a second plain Database behind a Load Balancer configured for reads only) — same underlying idea, two different entities. Worth trying both to feel why a dedicated Replica Pool entity was worth adding.",
      ],
    },
    tradeoffs: [
      {
        title: "Write Ratio",
        description:
          "A higher fraction of writes sends more traffic to the single leader, which can't scale horizontally the way replicas do — that's the realistic bottleneck this models. A lower ratio spreads more load across replicas, which is where this pattern actually earns its keep.",
      },
    ],
    pros: [
      "Isolates a genuinely distinct scaling lever from Load Balancer's — spreading reads across copies of the same data is a different mechanism than spreading requests across identical stateless servers, and conflating them would teach the wrong lesson.",
    ],
    cons: [
      "Replication lag — a replica's data can be stale relative to the leader's, since writes have to propagate — is named but not simulated. Every replica here returns data as current as the leader's.",
      "No modeling of the leader itself failing — no automatic failover or promotion of a replica.",
    ],
    failureModes: [
      {
        name: "Leader Overload Under High Write Ratio",
        description:
          "Because only one connection in the pool is ever the leader, raising Write Ratio concentrates load on that single connection while every replica sits comparatively idle — the opposite of what adding replicas is supposed to buy you.",
        reproduce: [
          "Build a Replica Pool with one leader Database and two or three replica Databases behind it.",
          "Set Write Ratio low (e.g. 5%) and run — note load is spread across replicas, leader lightly loaded.",
          "Raise Write Ratio high (e.g. 80%) with identical total traffic and run again.",
        ],
        observe:
          "The leader Database's Inspector shows it approaching its own Max Connections / queue limits while the replica Databases stay comparatively idle — proof that replicas only help the read side, and a write-heavy workload doesn't benefit from adding more of them.",
        simulated: true,
      },
    ],
  },
  reverse_proxy: {
    tagline: "Decides who handles this — not how many of them there are.",
    summary:
      "The Reverse Proxy routes each request to a specific downstream service based on a named route (/orders, /users, /payments, ...), not to any of several interchangeable replicas of the same service — that's Load Balancer's job. An API-gateway pattern: different kinds of work go to different destinations entirely.",
    industryExamples: ["nginx (location blocks), Envoy, Amazon API Gateway, Kong, Traefik"],
    usage: {
      whereItGoes:
        "Sits between a traffic source (Client) and 2+ heterogeneous downstream services — each one handling a different route, not copies of the same thing. Often the thing directly in front of several Load Balancers, one per service, rather than the other way around.",
      typicalTopology:
        "Client → Reverse Proxy → [API Server (Orders), API Server (Users), API Server (Payments)] → their own Databases.",
      normal:
        "Client's Route Pool Size set to however many services are actually connected, each downstream target assigned exactly one route in the Reverse Proxy's Routes section. A healthy run shows every configured target receiving traffic in the Inspector's distribution chart, and zero 'no matching route' failures.",
      extremes: [
        {
          title: "Route Pool Size larger than the number of configured routes",
          description:
            "Some fraction of traffic is addressed to routes nothing claims. Isolates the 'no matching route' failure mode cleanly — proof a Reverse Proxy doesn't invent a destination for traffic nobody told it to expect.",
        },
        {
          title: "One target set to the catch-all (*), everything else specific",
          description:
            "Every unclaimed route lands on the catch-all target exclusively — a clean way to see the default_server pattern in isolation before combining it with specific routes.",
        },
      ],
      edgeCases: [
        "Two downstream targets both configured with the exact same specific route — confirms which one wins (deterministic: whichever comes first in the graph's connection order) rather than splitting traffic between them the way a Load Balancer would.",
        "A target given a route no request will ever carry (outside the Client's actual Route Pool Size) — it should show zero traffic in the distribution chart, proof a misconfigured route silently starves a target instead of erroring at config time.",
        "Chain a Reverse Proxy in front of a Load Balancer per route (Reverse Proxy → route /orders → Load Balancer → 3 Order API Servers) — the intended real-world composition: route first, then spread load within whichever service was chosen.",
      ],
    },
    tradeoffs: [
      {
        title: "Reverse Proxy vs Load Balancer",
        description:
          "Same position in a graph, different job. Load Balancer spreads identical work across a homogeneous pool — any target can serve any request. Reverse Proxy sends different kinds of work to different, heterogeneous destinations — only one target is the right answer for a given route. Conflating them into one entity would make neither concept legible.",
      },
      {
        title: "Specific Route vs Catch-all",
        description:
          "A specific route is precise but silent-fails (starves, not errors) the moment traffic shifts to a route nothing claims. A catch-all guarantees every request lands somewhere, at the cost of that target potentially receiving traffic it wasn't specifically provisioned for.",
      },
    ],
    pros: [
      "Makes 'routing' and 'load-spreading' visibly different mechanisms in the same Workshop, instead of one entity quietly doing both — the two most-conflated concepts in this part of the course, kept genuinely separate.",
      "The catch-all target is a real, named production pattern (nginx's default_server), not an invented simplification.",
    ],
    cons: [
      "Routes on a synthetic 'route label' dimension, not a real HTTP path — this engine has no path-shaped request data, so the Client's Route Pool Size stands in for it, the same kind of documented substitution Load Balancer's IP Hash already makes.",
      "No path-prefix or wildcard matching (e.g. `/orders/*`) — every route is an exact match against a fixed, closed label pool, not free-text patterns.",
      "TLS termination — the other thing real reverse proxies commonly do — isn't modeled at all.",
    ],
    failureModes: [
      {
        name: "No Matching Route",
        description:
          "A request's route doesn't match any downstream target's configured route, and no target is set as the catch-all. The Reverse Proxy fails it immediately, the same 'local, observable problem' shape as any other entity's no_downstream_connection.",
        reproduce: [
          "Connect the Reverse Proxy to one API Server and give it a specific route, e.g. /orders.",
          "Set the Client's Route Pool Size to 3 or more (so traffic also generates /users, /payments, etc.) with no catch-all target configured.",
          "Run the simulation.",
        ],
        observe:
          "The Results bar shows failures with reason no_matching_route, and the Reverse Proxy's node-health dot turns red — even though the one configured route (/orders) is working perfectly.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, Client at 300
        // req/s, Route Pool Size 8 (the field's own max — ROUTE_LABELS in
        // TrafficGenerator.ts has exactly 8 entries) -> Reverse Proxy,
        // routes: { "api-orders": "/orders" }, one specific route, no
        // catch-all -> a generously-capacitied API Server + Database so
        // neither is ever the bottleneck being measured):
        //   BROKEN: Reverse Proxy's own failure rate 88.55% (200 routed,
        //     1547 rejected no_matching_route), overall success 11.4%.
        //   REMEDY Configure a Catch-all Target (routes.api-orders:
        //     "/orders" -> "*"): failure rate 0.0% (1747/1747 routed),
        //     overall success 100.0% — fully healthy. Re-verified through
        //     getFailureModeDemo() itself, not just a standalone tuning
        //     config.
        // Worth knowing before re-tuning: 88.55% is close to this demo's
        // real ceiling, not an undertuned broken state. With exactly one
        // legitimately-matching route, the miss fraction is bounded by
        // (Route Pool Size - 1) / Route Pool Size, and Route Pool Size
        // maxes out at 8 (ROUTE_LABELS' fixed length) — so the highest
        // achievable miss rate here is 7/8 = 87.5%, no matter the traffic
        // rate (routing here has no capacity/queueing component to push
        // higher under load, unlike every bounded-processor entity). That
        // stays under this app's 90% "Crashed" threshold — the Reverse
        // Proxy's own node status reads "error" (steady red), not pulsing
        // "Crashed", on both sides of this failure mode's reproduce steps,
        // structurally, not from undertuning. Still an honest, dramatic
        // failure (fewer than 1 in 8 requests gets anywhere) — just not
        // this app's most extreme visual state.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 300, keyPoolSize: 50, routePoolSize: 8 },
            },
            {
              id: "rp",
              type: "reverse_proxy",
              label: "Reverse Proxy",
              position: { x: 340, y: 160 },
              config: { routes: { "api-orders": "/orders" } },
            },
            {
              id: "api-orders",
              type: "api",
              label: "API Server (Orders)",
              position: { x: 600, y: 160 },
              config: {
                maxConcurrent: 50,
                maxQueueLength: 200,
                processingTimeMs: 5,
                processingJitterMs: 1,
              },
            },
            {
              id: "db-orders",
              type: "database",
              label: "Database (Orders)",
              position: { x: 860, y: 160 },
              config: {
                maxConnections: 1000,
                maxQueueLength: 1000,
                processingTimeMs: 1,
                failureProbability: 0,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "rp", latencyMs: 5 },
            { source: "rp", target: "api-orders", latencyMs: 5 },
            { source: "api-orders", target: "db-orders", latencyMs: 2 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "configure-catch-all",
              label: "Configure a Catch-all Target",
              nodeId: "rp",
              configOverride: { routes: { "api-orders": "*" } },
              description:
                "The production fix that guarantees nothing gets dropped: mark this target as the catch-all (nginx's default_server pattern) instead of a specific route, so it receives anything no other target's specific route claims. The real tradeoff, named honestly: this target now loses its precise '/orders only' identity and absorbs every kind of traffic instead — the right call when availability matters more than routing precision, not a free upgrade.",
            },
          ],
        },
      },
      {
        name: "Route Misconfiguration (Silent Starvation)",
        description:
          "Unlike a typo in a normal config field, a route that doesn't match anything doesn't error — it just means that target quietly never receives traffic. The Reverse Proxy has no way to know a configured route was a mistake.",
        reproduce: [
          "Connect the Reverse Proxy to two API Servers; give one the route /orders and the other a route outside the Client's actual traffic (e.g. /shipping, while Route Pool Size only generates /orders and /users).",
          "Run and check each API Server's request count in the Inspector.",
        ],
        observe:
          "The misconfigured target shows zero requests and zero errors of its own — nothing points at the mistake except comparing it against the traffic actually being generated, which is exactly why this is worth trying deliberately once.",
        simulated: true,
      },
    ],
  },
  kafka: {
    tagline: "A durable, partitioned log — producers and consumer groups move at their own pace.",
    summary:
      "Kafka splits a topic into partitions — a message's partition is a hash of its key, so ordering is guaranteed within a partition and nowhere else. Every downstream connection is an independent consumer group, each getting every message, but a group's real parallelism is capped by how many partitions exist to read.",
    industryExamples: ["Apache Kafka, Amazon MSK, Confluent Cloud, Redpanda"],
    usage: {
      whereItGoes:
        "Sits between a producer (Client or API Server) and one or more consumer group targets — connect several downstream targets to see independent groups each consume the full stream.",
      typicalTopology:
        "Client → API Server → Kafka → [Analytics Service, Notification Service, Audit Log Service] — three independent consumer groups, each reading everything.",
      normal:
        "Partition Count sized generously above any one group's Consumers per Group (so parallelism isn't the bottleneck), Max Queue Length sized for the burstiness of the producer. A healthy run shows every consumer group's Inspector distribution roughly matching total message volume, and the Partition Distribution section spread close to evenly across partitions.",
      extremes: [
        {
          title: "Partition Count → 1",
          description:
            "Every message goes to the same partition regardless of key — perfect global ordering, but zero within-topic parallelism no matter how many consumers a group runs. Isolates the ordering-vs-parallelism tradeoff at its most extreme end.",
        },
        {
          title: "Consumers per Group far above Partition Count",
          description:
            "Confirms the parallelism cap directly: raising Consumers per Group past Partition Count should stop changing a group's effective drain rate at all, since the extra consumers have no partition left to read.",
        },
        {
          title: "One consumer group with a tiny Max Queue Length under bursty traffic",
          description:
            "That group alone falls behind and starts rejecting its own copies — every other connected group, reading the identical stream, is completely unaffected. The clearest single demonstration that groups are independent.",
        },
      ],
      edgeCases: [
        "A small Client Key Pool Size (e.g. 3) against a high Partition Count (e.g. 12) — most partitions stay empty, since there are only 3 distinct keys to hash. Compare the Partition Distribution section here against a large key pool to see partition balance depend on key cardinality, not just partition count.",
        "Two consumer groups with very different Consumers per Group connected to the same Kafka — confirm one group's higher parallelism drains faster than the other's while both still receive the full, identical message stream (fan-out, not a split).",
        "Partition Count changed between two otherwise-identical runs with a fixed Key Pool Size — watch the Partition Distribution section reshape while the Request Distribution across consumer groups stays the same, proof the two are genuinely independent dimensions.",
      ],
    },
    tradeoffs: [
      {
        title: "Kafka vs Message Queue",
        description:
          "Same fan-out shape as Message Queue's Topic mode at the consumer-group level, but a different storage model underneath: Message Queue is a transient in-memory buffer, discarded once dispatched. Kafka is a durable, partitioned log — the partition/parallelism tradeoff and independent per-group backlogs don't have an equivalent in Message Queue at all.",
      },
      {
        title: "Partition Count vs Consumers per Group",
        description:
          "Partition Count sets the ceiling on ordering granularity and total possible parallelism; Consumers per Group spends up to that ceiling per group. Raising consumers past the partition count is pure waste — raising partitions is the only way to buy more real parallelism for every group at once.",
      },
      {
        title: "Fan-out (fixed) vs Retention/Replay (not simulated)",
        description:
          "Every consumer group here exists from the start and reads live — there's no modeled way to add a group mid-run and have it replay from an earlier offset, which is one of Kafka's most-cited real capabilities. A bounded per-group backlog stands in for consumer lag against a retention window instead.",
      },
    ],
    pros: [
      "Makes the ordering-vs-parallelism tradeoff something you can watch happen — the Partition Distribution and per-group Request Distribution sections are two genuinely independent views of the same run.",
      "Consumer groups are truly independent: one group's backlog filling up never touches another's, visible directly by comparing their Inspector sections side by side.",
    ],
    cons: [
      "No replay or offset modeling — every group reads live from when the simulation starts, not from an arbitrary earlier point.",
      "No true unbounded retention — a group that falls behind eventually rejects new messages outright rather than accumulating unbounded lag.",
      "Partition reassignment / rebalancing (what happens when a consumer joins or leaves a group mid-stream) isn't modeled — this entity's consumer count per group is fixed for the whole run.",
    ],
    failureModes: [
      {
        name: "Wasted Consumers Past the Partition Ceiling",
        description:
          "Raising Consumers per Group beyond Partition Count buys nothing — the extra consumers have no partition left to read. A common real misconfiguration, made directly measurable here.",
        reproduce: [
          "Build a Kafka with Partition Count 3 and one consumer group (one downstream target).",
          "Run with Consumers per Group set to 3 and note the group's drain rate / backlog behavior under sustained load.",
          "Raise Consumers per Group to 10 with everything else identical and run again.",
        ],
        observe:
          "The group's effective throughput and backlog behavior are statistically indistinguishable between the two runs — proof the extra consumers past Partition Count did nothing, even though the config value tripled.",
        simulated: true,
        // Verified against the real engine (seed 42, 6s run, Client at 720
        // req/s -> Kafka -> a downstream "Analytics Service" API Server
        // given generous capacity so it's never the bottleneck being
        // measured). Story: Consumers per Group already generous (12) —
        // a team that already tried "add more consumers" — but Partition
        // Count=1 caps real parallelism at 1, wasting 11 of those 12.
        //   BROKEN (partitionCount=1, consumerCountPerGroup=12): Kafka's
        //     own failure rate 90.05% (422 admitted, 3818 rejected) —
        //     crosses this app's 90% "Crashed" threshold on the Kafka
        //     node itself.
        //   REMEDY "wasted" attempt — Raise Consumers per Group further
        //     (12 -> 20), Partition Count left at 1: failure rate 90.05%
        //     (422 admitted, 3818 rejected) — bit-for-bit identical to
        //     broken. This is the demo's whole point, not a tuning miss:
        //     effective parallelism is min(consumers, partitions), so
        //     raising consumers past a partition ceiling of 1 changes
        //     nothing, deterministically.
        //   REMEDY Raise Partition Count (1 -> 12, the field's own max),
        //     Consumers per Group left unchanged at 12: failure rate 0.0%
        //     (4240 admitted, 0 rejected) — the real fix. Consumers per
        //     Group was never the problem; it was already sized right and
        //     sitting idle waiting for a partition to read.
        // One more thing this demo makes visible, true in every run above:
        // the Client's own success rate stays 100% throughout, broken and
        // fixed alike — Kafka acknowledges a producer the instant a
        // message is durably admitted to the log, never gated on any
        // consumer group's readiness (see Kafka.ts's own class doc). The
        // failure here is real, but it's invisible to the producer by
        // design — only Kafka's own node status and its Inspector's
        // Consumer Group Distribution section show it. A different, and
        // genuinely important, shape than every earlier demo: "the write
        // succeeded" and "every consumer group is keeping up with it" are
        // two separate claims in a real log-based system, and conflating
        // them is its own common mistake.
        demo: {
          startingEntities: [
            {
              id: "client",
              type: "client",
              label: "Client",
              position: { x: 80, y: 160 },
              config: { requestRate: 720, keyPoolSize: 200 },
            },
            {
              id: "kafka",
              type: "kafka",
              label: "Kafka",
              position: { x: 360, y: 160 },
              config: {
                partitionCount: 1,
                consumerCountPerGroup: 12,
                maxQueueLength: 20,
                dispatchTimeMs: 15,
                dispatchJitterMs: 3,
              },
            },
            {
              id: "analytics-service",
              type: "api",
              label: "Analytics Service",
              position: { x: 640, y: 160 },
              config: {
                maxConcurrent: 50,
                maxQueueLength: 500,
                processingTimeMs: 5,
                processingJitterMs: 1,
              },
            },
          ],
          startingConnections: [
            { source: "client", target: "kafka", latencyMs: 2 },
            { source: "kafka", target: "analytics-service", latencyMs: 2 },
          ],
          durationMs: 6000,
          seed: 42,
          remedies: [
            {
              kind: "config",
              id: "raise-consumers-per-group",
              label: "Raise Consumers per Group",
              nodeId: "kafka",
              configOverride: { consumerCountPerGroup: 20 },
              description:
                "The instinctive but wrong fix — and the whole lesson of this failure mode: this changes nothing, literally. A group's real parallelism is capped at min(Consumers per Group, Partition Count), and Partition Count is still 1, so the extra consumers still have no partition to read. Compare below and confirm the numbers are bit-for-bit identical to the broken run, not just similar.",
            },
            {
              kind: "config",
              id: "raise-partition-count",
              label: "Raise Partition Count",
              nodeId: "kafka",
              configOverride: { partitionCount: 12 },
              description:
                "The real fix — and it needs no change to Consumers per Group at all, because those 12 consumers were already provisioned and idle, waiting for partitions to read. Raising Partition Count is the only lever that actually raises a group's parallelism ceiling; it's shared by every consumer group reading this topic, not sized per group.",
            },
          ],
        },
      },
      {
        name: "One Consumer Group Falling Behind",
        description:
          "A consumer group with too little capacity for the traffic it's receiving falls behind and starts rejecting its own copies of messages — its own local problem, invisible to every other group reading the identical stream.",
        reproduce: [
          "Connect Kafka to two consumer groups; give one a small Max Queue Length and Consumers per Group, the other generous values.",
          "Drive enough Request Rate that the constrained group can't keep up.",
          "Run and compare each group's Inspector — errorCount, queue length, and Request Distribution share.",
        ],
        observe:
          "The constrained group shows rejections and a growing backlog; the generously-sized group shows neither, despite both receiving the exact same published stream — independence made visible, not asserted.",
        simulated: true,
      },
    ],
  },
};

export function getEntityDeepDive(type: EntityType): EntityDeepDive {
  return ENTITY_DEEP_DIVE[type];
}

/** URL slugs are kebab-case for readability; EntityType values use snake_case. Reversible 1:1 for every current type. */
export function slugFromEntityType(type: EntityType): string {
  return type.replace(/_/g, "-");
}

export function entityTypeFromSlug(slug: string): EntityType | undefined {
  const type = slug.replace(/-/g, "_") as EntityType;
  return type in ENTITY_DEEP_DIVE ? type : undefined;
}

/** "Cache Stampede" -> "cache-stampede". Derived from the name rather than
 * a separate stored field, so adding a `demo` never requires touching
 * every other FailureMode object just to satisfy a required slug. */
export function slugFromFailureModeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Looks up a failure mode's "Try It" demo by entity type + failure-mode
 * slug. Returns undefined for an unknown slug, or a real failure mode that
 * simply has no `demo` yet — both cases the route treats as a 404.
 */
export function getFailureModeDemo(
  type: EntityType,
  failureModeSlug: string
): { failureMode: FailureMode; demo: FailureModeDemo } | undefined {
  const failureMode = ENTITY_DEEP_DIVE[type].failureModes.find(
    (mode) => slugFromFailureModeName(mode.name) === failureModeSlug
  );
  return failureMode?.demo ? { failureMode, demo: failureMode.demo } : undefined;
}
