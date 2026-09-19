# explain_simulation.md — how the discrete-event simulation engine actually works

Everything here lives under `src/simulation/` and has zero React/DOM
dependencies by design (every file says so in its own header comment) —
the engine is a pure function `SimulationConfig -> SimulationResult`
(`src/simulation/engine/Simulator.ts`'s `runSimulation`), and the
workshop UI is just one consumer of it. `src/simulation/examples/
client-api-database.ts` is the smallest possible caller — `npm run
sim:example` runs it with no UI at all.

## The core loop — EventQueue + Clock + Simulator

`runSimulation` (`Simulator.ts:110`) does exactly what
`Simulator.ts`'s own header describes: "take the next event, advance
virtual time, deliver it, record whatever new events result, repeat."
(§8, "The Simulation Loop," of the original `SIMULATION-ENGINE.md` design
doc — now `docs/simulation_engine.md`, see the last section below).

```
while (queue.hasEvents()) {
  event = queue.dequeue()       // smallest timestamp, FIFO on ties
  clock.advanceTo(event.timestamp)
  entity = entities.get(event.destination)
  newEvents = entity.handleEvent(event, ctx)
  newEvents.forEach(e => queue.enqueue(e))
}
```

- **`EventQueue`** (`engine/EventQueue.ts`) is a binary min-heap keyed
  on `(timestamp, insertion sequence)` — O(log n) enqueue/dequeue. The
  sequence number is what makes same-timestamp events process in the
  order they were scheduled, not arbitrarily.
- **`Clock`** (`engine/Clock.ts`) holds a single `_time` field that can
  only move forward (`advanceTo`/`advanceBy` throw if you try to go
  backwards). Time is virtual — the engine never reads the real system
  clock; it only ever asks "what's the timestamp of the next event,"
  never "what time is it right now." This is what makes a run
  reproducible independent of how fast your machine executes it.
- There's a hard safety valve: `maxSteps` (default `DEFAULT_MAX_STEPS =
  200_000`, `Simulator.ts:57`) stops the loop and appends a warning
  instead of looping forever if a misconfigured architecture creates
  events faster than it retires them.

Before the loop starts, `runSimulation` seeds the queue with one
`SIMULATION_STARTED` marker at t=0, then generates every request's
arrival timestamp up front via `TrafficGenerator.generateArrivalTimestamps`
(constant/burst/ramp — see "Traffic generation" below) and enqueues a
`REQUEST_STARTED` event per arrival, addressed to the (single, currently)
`client` entity. After the loop drains, it pushes a `SIMULATION_FINISHED`
marker and calls `collectMetrics` once over the full event log. Every
event enqueued anywhere in the engine — the two markers, every
`REQUEST_STARTED`, everything an entity hands back from `handleEvent` — is
built through `events/EventFactory.ts`'s typed constructors
(`createRequestRoutedEvent`, `createRequestFailedEvent`, etc.), never a
raw object literal; that's what guarantees every event gets a unique,
monotonic id (`_eventIdCounter`) and the required fields, and is the
reason `resetEventIds()` exists — a fresh id sequence per run, so re-running
the same config twice doesn't leak counter state from the previous run into
this one.

## Traffic generation — turning a scenario into request arrivals

`TrafficGenerator.ts` (`engine/TrafficGenerator.ts`) is a pure, zero-React
module pulled out of `Simulator` specifically to be unit-testable in
isolation ("a constant rate produces roughly rate\*seconds arrivals," per
its own header). `generateArrivalTimestamps` switches on
`TrafficPattern.type` (`types/index.ts:260` — exactly the three variants
below, no others):

| Pattern | Shape | How |
|---|---|---|
| `constant` | Poisson arrivals | `generateConstant`: repeatedly draws an exponential inter-arrival gap (`rng.nextExponential(lambdaPerMs)`, `lambdaPerMs = rate/1000`) and accumulates `t` until it passes `durationMs` |
| `burst` | `rate` arrivals packed into each `duration`-ms window, windows repeating every `interval` ms | `generateBurst`: for each window `[windowStart, windowStart+duration)`, drops `rate` timestamps uniformly at random inside it, then sorts the full result — arrivals are windowed, not evenly spaced within a window |
| `ramp` | Rate interpolates linearly from `startRate` to `endRate` over `duration` ms | `generateRamp`: walks 100ms buckets, computes each bucket's expected count (`rate * bucketMs / 1000`), takes the integer part and rounds the fractional remainder up probabilistically (`rng.next() < fractional`) so the *expected* count across many buckets matches the true rate even though any single bucket's count must be a whole number |

All three are seeded through the same shared `RNG` — see "Determinism and
randomness" below — so re-running a scenario's traffic pattern with the
same seed reproduces the exact same arrival timestamps.

Once an arrival timestamp exists, `Simulator` calls four more
`TrafficGenerator` exports (all imported directly into `Simulator.ts`) to
decide what that one request actually *is*, each an independent RNG draw
attached to the request's `RequestLifecycleMetadata` before it's dispatched:

- **`assignRequestKey(rng, poolSize)`** — which resource (of the Client's
  configured Key Pool Size) the request targets. Not true Zipfian sampling
  — squaring a uniform draw (`Math.floor(poolSize * rng.next() ** 2)`) is a
  cheap approximation of the same qualitative shape: a small set of "hot"
  keys dominate. This skew is *why* a Cache's hit rate means anything —
  under a uniform draw every key would be equally rare and no cache would
  help.
- **`assignRequestExistence(rng, missingKeyRate)`** /
  **`assignPhantomKey(rng, keyPoolSize)`** — cache-penetration traffic.
  When a Client's Missing Key Rate is above 0, some fraction of requests
  target a key drawn uniformly from a small, permanently-nonexistent
  `missing_*` pool (sized by `phantomKeyPoolSize`: `round(keyPoolSize *
  0.1)`, clamped to `[2, 20]` — small enough that phantom keys repeat
  often, the shape a negative cache actually protects against). Both
  functions skip drawing from `rng` entirely when their rate is 0 — the
  default — so every existing scenario/test that never touches these
  settings keeps drawing the exact same RNG sequence it always has for
  `assignRequestKey`/`assignRequestRoute`; this is purely additive.
- **`assignRequestRelationshipQuery(rng, relationshipQueryRate)`** — same
  skip-at-rate-0 shape, decides whether a request needs multi-hop
  relationship reasoning rather than a single similarity-matched chunk;
  read by `Retriever.ts`'s GraphRAG mode, which specifically wins on this
  traffic.
- **`assignRequestRoute(rng, poolSize)`** — for a Reverse Proxy, which of a
  fixed 8-entry `ROUTE_LABELS` pool (`/orders`, `/users`, `/payments`,
  `/search`, `/checkout`, `/notifications`, `/inventory`, `/reviews`) the
  request is addressed to — uniformly, unlike `assignRequestKey`'s skew,
  since routes aren't "hot vs. cold" the way cache keys are. The label set
  is a small closed pool on purpose: a dropdown, not free text, keeps this
  deterministic and typo-proof.

## What an Entity actually is

The whole contract is four lines (`entities/Entity.ts`):

```ts
interface Entity {
  readonly id: EntityId;
  handleEvent(event: SimulationEvent, ctx: SimulationContext): SimulationEvent[];
}
```

`handleEvent` must be **deterministic** given the same state/config/event
— the only source of randomness it's allowed to touch is `ctx.rng`. An
entity is only allowed to know:

- `ctx.now` — the current virtual time
- `ctx.rng` — the shared seeded RNG
- `ctx.downstream` — this entity's own outgoing connection ids
- `ctx.latencyTo(targetId)` — configured link latency

This is called "Local Knowledge" throughout the codebase comments: an
entity never sees other entities' internal state, never touches the
queue directly, never knows the full topology — only its own neighbors.
`Simulator.createEntity` (a switch over `EntityType`) is the only place
that maps a config's `type` string to a concrete class; 20 entity types
are wired there (`client`, `api`, `database`, `load_balancer`, `cache`,
`cdn`, `message_queue`, `rate_limiter`, `circuit_breaker`,
`replica_pool`, `reverse_proxy`, `kafka`, plus the 8 agentic-AI types
added for the Agentic pillar). An unrecognized type is skipped with a
warning, not a hard failure.

Five shared building blocks most entities compose (not inherit) rather
than reimplement — each pulled out only once a *second* real caller
needed the identical logic, not speculatively:

- **`BoundedProcessor`** (`entities/BoundedProcessor.ts`) — the
  "how many things can I do at once, and what happens to the rest"
  admission logic (`admit()` → `"started" | "queued" | "rejected"`,
  `complete()` pops the next queued item). Purely a counter + array; it
  has no notion of simulated time itself — the owning entity schedules
  the `PROCESSING_COMPLETED` wake-up and calls `complete()` when that
  fires.
- **`findResponseTarget`** (`entities/responseRouting.ts`) — given an
  entity's own id and the request's accumulated `path`, figures out who
  to send a response (or failure) back to: one hop back along `path` if
  this entity forwarded the request onward, or straight back to whoever
  called it if it answered from local state without appending itself
  (a cache hit, an API server with no downstream). Every entity that can
  sit between the Client and a terminal responder routes its response
  leg through this — skipping it means anything upstream (a Cache trying
  to observe a response so it knows what to store, a Circuit Breaker
  counting failures) never sees the traffic pass by.
- **`CacheStore`** (`entities/CacheStore.ts`) — the actual keyed store
  behind both `Cache.ts` (one instance, `Cache.ts:179/203`) and `CDN.ts`
  (one instance *per edge*, `CDN.ts:244/268` — each edge is a
  geographically distributed copy of the same idea). Owns the LRU/LFU/
  FIFO/MRU eviction logic (`isMoreEvictable`, keyed off `insertedAt`/
  `lastAccessedAt`/`accessCount` depending on policy, with a deterministic
  insertion-order tie-break rather than leaving it to `Map` iteration
  happenstance) and per-entry TTL, including a per-entry TTL *override*
  (`set`'s optional third argument) that `Cache.ts` uses for TTL jitter
  without touching every other entry's expiry. `lookup()` distinguishes
  `"cold"` (never cached, or evicted for capacity) from `"expired"` (TTL
  passed) — only the latter feeds Cache's own Avalanche accounting, since
  `CacheStore` has no eviction *event* of its own to distinguish the two
  otherwise.
- **`hashStringToIndex`** (`entities/hashRouting.ts`, FNV-1a mod bucket
  count) — deterministic "same input always lands on the same target"
  hashing. Currently used by `LoadBalancer.ts`'s IP Hash algorithm
  (session affinity: a given client keeps landing on the same server) and
  `Kafka.ts`'s partition assignment (a message's partition is
  `hashStringToIndex(key, partitionCount)`). Its own header comment says
  it originally lived only in `CDN.ts` for key→edge routing (mirroring
  anycast/geo-DNS); CDN's edge selection is proximity-weighted now (via
  `buildWeightedSequence`, below) rather than hash-based, so despite the
  comment, `CDN.ts` is no longer an actual caller today — confirmed by
  grep, not assumed from the comment alone.
- **`buildWeightedSequence`** (`entities/weightedRouting.ts`) — expands a
  list of positive integer weights into a repeated-index sequence (e.g.
  `[3, 1] → [0, 0, 0, 1]`) that a plain round-robin cursor can cycle over
  to dispatch in proportion to weight. Originally `LoadBalancer.ts`'s own
  private `weightedSequenceFor` (Weighted Round Robin); extracted once
  `CDN.ts` needed the identical property for proximity-weighted edge
  routing (`CDN.ts:283`, cycling `edgeRoutingSequence` via
  `edgeSelectionCursor` — a plain cursor, not an RNG draw, so edge
  selection stays deterministic even though it's derived from the User
  pin's real geometric distance to each edge). The function only expands
  an already-computed weight list; "what counts as a valid weight" is left
  to each caller (LoadBalancer treats an unconfigured target as weight 1,
  CDN derives weight from distance).

Both extractions' own header comments cite the same repo convention:
"don't introduce an abstraction before two use cases require it"
(`docs/Entities.md`).

## A traced example: Client → API → Database

This is exactly `examples/client-api-database.ts`'s config: `client1 →
(5ms) → api1 → (2ms) → db1`, `seed: 42`. Walking one request through
`handleEvent` calls:

1. **`REQUEST_STARTED`** arrives at `Client` (`Client.ts:37`). It reads
   `ctx.downstream[0]` (`api1`), builds a fresh
   `RequestLifecycleMetadata` (`startedAt: ctx.now`, `direction:
   "request"`, `path: ["client1"]`, plus the request's `key`/`route`/
   `exists` drawn once by `TrafficGenerator`), and emits one
   `REQUEST_ROUTED` event timestamped `ctx.now + 5` (the link latency),
   addressed to `api1`.
2. **`REQUEST_ROUTED`** arrives at `APIServer` (`APIServer.ts:80` →
   `onArrival`). It calls `this.processor.admit(event)`. If capacity is
   free: `beginProcessing` stashes the metadata in `this.inFlight`, rolls
   jitter from `ctx.rng.nextInt(-2, 3)` on top of the default
   `processingTimeMs: 5`, and emits **two** events at the *same*
   `ctx.now` — `PROCESSING_STARTED` — and at `ctx.now + duration` —
   `PROCESSING_COMPLETED`, both self-addressed (`api1 → api1`). This
   self-addressed "wake myself up later" event is *the* mechanism by
   which a discrete-event engine models "this takes time" without ever
   blocking or sleeping.
3. **`PROCESSING_COMPLETED`** arrives back at the same `APIServer`
   (`onProcessingComplete`). It looks up the stashed metadata,
   pops the next queued request (if any) via `processor.complete()`,
   and since `meta.direction === "request"` and `ctx.downstream[0]` is
   `db1`, emits one more `REQUEST_ROUTED` at `ctx.now + 2` (the
   api1→db1 link latency) with `path: ["client1", "api1"]` and
   `direction` still `"request"`.
4. **`REQUEST_ROUTED`** arrives at `Database` (`Database.ts:121`) — same
   admit/beginProcessing/PROCESSING_COMPLETED shape, using its own
   defaults (`maxConnections: 5`, `processingTimeMs: 15`,
   `failureProbability: 0`). On completion, it rolls
   `ctx.rng.next() < failureProbability` for an independent failure,
   then calls `findResponseTarget("db1", ["client1", "api1"])` → `api1`
   (not the client, since `api1` is the element right before `db1`'s own
   position... except `db1` was never appended to `path`, so `selfIndex
   === -1` and the target is simply `path[path.length - 1]` = `api1`).
   It emits a `REQUEST_ROUTED` back to `api1` with `direction:
   "response"`.
5. **`REQUEST_ROUTED`** (response) arrives back at `APIServer`
   (`onArrival` again — it doesn't distinguish request vs. response at
   admission, both go through the same `BoundedProcessor`). After its
   own processing delay, `onProcessingComplete` sees `direction ===
   "response"` this time and calls `respond()`, which calls
   `findResponseTarget("api1", ["client1", "api1"])` → `client1`,
   `isClient: true` — so it emits the terminal event directly:
   `REQUEST_COMPLETED` (or `REQUEST_FAILED` if `meta.failed` got set
   anywhere along the chain), with `duration: ctx.now - meta.startedAt`.
6. That `REQUEST_COMPLETED` is delivered to `Client.handleEvent`, which
   just returns `[]` — "the lifecycle simply ends at the client, nothing
   left to do" (`Client.ts:43`).

Every hop rescheduled itself through the same
`queue.enqueue`/`clock.advanceTo` mechanism in `Simulator`'s while-loop
— nothing here is a callback, a promise, or a timer; it's all just
events with a timestamp sitting in a heap.

## Metrics are derived, never tracked live

`collectMetrics` (`metrics/MetricsCollector.ts:28`) is a pure function:
`(events[], entityIds[], durationMs, clientIds?, agentOrchestratorIds?,
guardrailValidatorIds?) -> MetricsSnapshot`. Nothing during the
event loop increments a running "requestCount" or "hitRate" anywhere —
every number in the final snapshot is recomputed by sweeping the
complete, immutable event array once the run is over (or, for playback,
once per visible slice — see below). This buys reproducibility: run the
same events through `collectMetrics` twice and you get bit-identical
output, and it's independently testable without running a simulation at
all (just construct a fake event array).

The sweep is mostly a big `switch (event.type)` accumulating into
per-entity maps, then a second pass turns those maps into the typed
`EntityMetrics` fields (`cacheHitRate`, `routingDistribution`,
`circuitBreaker`, `rateLimiter`, `memoryContext`, `kafkaPartitions`,
etc. — each only populated `if` that entity type produced the relevant
events, so a plain API/DB run's `EntityMetrics` objects stay mostly
`undefined` on the specialized fields). Two techniques worth knowing if
you're extending this:

- **`computeUtilization`** — a sweep-line over
  `PROCESSING_STARTED`(+1)/`PROCESSING_COMPLETED`(−1) markers so
  *overlapping* concurrent work doesn't double-count busy time; a target
  is "busy" for any interval where concurrency > 0, no matter how many
  requests overlap in it.
- **`computeCurrentCount`** — same idea but a running net sum (not a
  fraction of the window) over `REQUEST_QUEUED`(+1)/`REQUEST_DEQUEUED`(−1)
  pairs — the queue length *as of the last event swept*, which is why
  playback (scoped to "everything up to now") gets a correct point-in-time
  queue length for free.

Latency percentiles (`p50`/`p95`/`p99`) are computed by sorting every
`REQUEST_COMPLETED` event's `duration` and indexing at `ceil(p * n) - 1`
(`percentile()`, `MetricsCollector.ts:539`) — nearest-rank, not
interpolated.

`countsTowardClientOutcome` (`MetricsCollector.ts:62`) exists because a
`MessageQueue` acknowledges its caller immediately and then separately,
independently simulates a dispatch to its own downstream consumer under
the *same* `requestId` — without filtering by `clientIds`, that second
completion would double-count against totals sized for "one event per
client-issued request."

## Determinism and randomness

`RNG` (`engine/RNG.ts`) is a from-scratch linear congruential generator
(`state = (state * 1664525 + 1013904223) & 0xffffffff`) seeded from
`config.options.seed` — not `Math.random()`. Same seed → byte-identical
event sequence, every time; different seeds → a different world. Every
place randomness is needed (traffic arrival gaps, processing-time
jitter, cache-key skew, independent failure rolls) draws from this one
shared `RNG` instance via `ctx.rng`, never a fresh `Math.random()` call
anywhere in an entity. This determinism is what several higher-level
tools in `engine/` build on directly:

- **`compareArchitectures.removeEntityAndReroute`** — splices one
  entity out of a config (rewiring its inbound connections straight to
  its own outbound target, reusing that entity's *outgoing* latency, not
  its incoming one — see the file's own comment on why that matters for
  a CDN specifically) so a caller can run the same seed with and without
  that entity and get a genuine, apples-to-apples "what does this
  component actually save" comparison rather than an estimate.
- **`reliabilityScore.computeReliabilityScore`** — re-runs one config
  across `N` consecutive seeds (default 10, starting at the config's own
  seed) and reports the fraction whose `successRate` clears a threshold
  (default 0.95) — a `pass^k`-style reliability score (named after
  τ-bench's metric) made honestly answerable *because* the engine is
  deterministic: this is a real re-run per seed, not a statistical
  guess.

## Playback vs. live simulation

`runSimulation` computes a `SimulationResult` (the full `events[]` array
plus one final `MetricsSnapshot`) exactly once. `PlaybackController`
(`playback/PlaybackController.ts`) never re-simulates anything — it only
decides which prefix of that already-computed, immutable `events[]`
array is "visible" at a given virtual timestamp, then re-derives metrics
for exactly that slice by calling the *same* `collectMetrics` the engine
itself used:

- `getVisibleEvents()` binary-searches (`eventsUpTo`) for the cutoff
  index in the timestamp-sorted array — O(log n) per frame instead of a
  linear scan, since this runs every animation frame during playback.
- `getMetrics()` calls `collectMetrics(visibleEvents, ...)` fresh each
  time (not cached/incremental) — deliberately simple until it's
  measured to be too slow.
- `play()`/`pause()`/`seek()`/`setSpeed()` (clamped to 0.5x–4x) drive
  `currentTime` forward via a `PlaybackScheduler` abstraction
  (`requestFrame`/`cancelFrame`) that's injected rather than calling
  `requestAnimationFrame` directly — that's what keeps this file
  browser-independent and unit-testable the same way `Clock`/`EventQueue`/
  `RNG` are (`createBrowserScheduler()` is the real implementation the
  app actually uses).
- Each `tick(nowMs)` measures the *real* wall-clock delta since the last
  frame and advances `currentTime` by `realDeltaMs * speed` — so 2x
  playback genuinely means "twice as much virtual time per real second,"
  not "half as many frames."

Because both live simulation and playback ultimately call the identical
`collectMetrics`, scrubbing straight to timestamp T and playing forward
to T produce bit-identical metrics and visible events — nothing about
*how* you arrived at a point in the timeline changes what's true at that
point.

`otelTraceFormatter.ts` is a separate, one-way export path, scoped to the
agentic-AI domain only (`components/workshop/TracePanel.tsx`, which
otherwise renders nothing if the canvas has no agentic entity — see
`explainDoc/batman-mode/explain_batman-mode.md`'s closing note on that
same file). `formatOtelTraces` maps each agentic `EntityType` to one
OpenTelemetry GenAI span name (`agent_orchestrator → invoke_agent`,
`llm_call → chat`, `tool_call → execute_tool`, `retriever → retrieve`,
`guardrail_validator → evaluate`, `memory_context_store →
context_compact`, `model_router → route`, `human_in_loop_gate →
approve` — only 3 of these 8 are real OTel GenAI operation names per spec,
the rest are this project's own informative extensions) and reconstructs
parent/child *nesting from time containment*, not from parsing `path`: a
`PROCESSING_STARTED`/`PROCESSING_COMPLETED` pair always fully encloses
every span it caused (for `AgentOrchestrator` specifically, that interval
spans the *whole session* — every dispatch, retry, and worker — per its
own `finalizeSession`), so a standard sort-by-start/pop-closed interval-
stack algorithm rebuilds the real call tree without ever needing to know
*why* one entity called another. It doesn't feed back into the engine or
playback.

## Where this diverges from the older design docs

`docs/simulation_engine.md` and `docs/simulation-implementation-guide.md`
describe the same architecture at the plan stage and are still accurate
at that level (event-driven loop, Local Knowledge, deterministic RNG,
metrics-are-emergent). Implementation details worth knowing weren't
fully fixed at plan time and are only correct as read from the code
above: the exact `EntityType` roster (20 types, not just the original
distributed-systems set — 8 more were added for the Agentic AI pillar),
the specific `BoundedProcessor`/`responseRouting`/`CacheStore`/
`hashRouting`/`weightedRouting` shared helpers, and the
`compareArchitectures`/`reliabilityScore` tools, none of which the
original docs mention.

One field went the other way — planned but never wired up:
`ScenarioDefinition.failureEvents?: FailureEvent[]` (`types/index.ts:257`)
still exists in the type, but nothing in `Simulator.ts`, any entity, or
any shipped scenario ever reads or populates it (confirmed by grep across
`src/simulation` and `src/scenarios`) — scripted mid-run failure injection
was planned but isn't implemented. The engine's actual failure mechanics
today are all per-entity `failureProbability`-style config rolled against
`ctx.rng` at processing time (as in the traced Database example above),
not a scenario-scripted timeline.
