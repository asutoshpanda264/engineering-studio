# How the System Design Simulations Are Actually Built

> An implementation walkthrough, not a spec. `simulation_engine.md` and
> `Entities.md` describe *what* the engine should do; this document
> explains *how the code that exists today does it*, down to the
> algorithms and data structures, with cache stampede (and its lock-based
> fix) as the running worked example.
>
> Everything here is explained independent of programming language first
> — as data structures and pseudocode — with real TypeScript snippets
> afterward as "here is what that looks like in this codebase." You could
> rebuild this in Python, Go, Java, whatever, from the pseudocode alone.

---

## Table of contents

1. [The core idea: discrete-event simulation](#1-the-core-idea-discrete-event-simulation)
2. [The five building blocks](#2-the-five-building-blocks)
3. [The main loop](#3-the-main-loop)
4. [A generic entity: the request lifecycle contract](#4-a-generic-entity-the-request-lifecycle-contract)
5. [Shared building block: bounded capacity + a queue](#5-shared-building-block-bounded-capacity--a-queue)
6. [Worked example: the Cache entity](#6-worked-example-the-cache-entity)
7. [Deep dive: Cache Stampede and the lock (coalescing) fix](#7-deep-dive-cache-stampede-and-the-lock-coalescing-fix)
8. [Deep dive: Cache Penetration (negative caching)](#8-deep-dive-cache-penetration-negative-caching)
9. [Deep dive: Cache Avalanche (TTL jitter)](#9-deep-dive-cache-avalanche-ttl-jitter)
10. [A repeating pattern: shipping *multiple* algorithms per component](#10-a-repeating-pattern-shipping-multiple-algorithms-per-component)
11. [Metrics: derived, not tracked](#11-metrics-derived-not-tracked)
12. [Generating realistic traffic](#12-generating-realistic-traffic)
13. [Edge cases that show up in almost every entity](#13-edge-cases-that-show-up-in-almost-every-entity)
14. [How a browser UI sits on top of this](#14-how-a-browser-ui-sits-on-top-of-this)
15. [Testing strategy](#15-testing-strategy)
16. [Glossary / mental model cheat sheet](#16-glossary--mental-model-cheat-sheet)

---

## 1. The core idea: discrete-event simulation

There is no game loop ticking every 16ms and no `setTimeout` chain. The
engine is a **discrete-event simulation (DES)**: a technique for
modeling systems where "interesting things" happen at specific instants
in time, and nothing happens in between.

The classic DES recipe, independent of any language:

```
maintain a virtual clock, starting at 0
maintain a priority queue of pending events, ordered by timestamp
seed the queue with the initial events (e.g. "first request arrives at t=12ms")

while the queue is not empty:
    event = remove the event with the smallest timestamp
    clock = event.timestamp          # jump the clock forward, don't tick it
    deliver `event` to whichever component it targets
    that component may produce zero or more *new* events, each with a
      timestamp >= clock (never earlier — you cannot schedule the past)
    insert those new events into the queue
```

This buys three things that matter for a *learning* tool specifically:

- **Determinism.** Given the same seed and the same architecture, the
  exact same sequence of events happens every time — essential for "run
  it broken, then run it fixed, and compare," which is the whole product.
- **Speed.** Simulating an hour of traffic doesn't take an hour, or even
  close to it — it takes as long as processing however many events that
  hour produced (usually milliseconds).
- **A perfect audit log for free.** Every event that fires is
  independently appended to a flat array as it happens. That array — not
  any live/mutable state — is later replayed for animation and mined for
  metrics. See [§11](#11-metrics-derived-not-tracked).

---

## 2. The five building blocks

| Piece | Responsibility | Analogy |
|---|---|---|
| **Clock** | Holds "now." Can only move forward. | A wall clock that jumps instead of ticking |
| **Event Queue** | A min-heap keyed by timestamp; "what happens next" | A hospital triage queue, but sorted by *when*, not severity |
| **RNG** | A seeded pseudo-random generator — same seed → same numbers forever | A shuffled deck you can re-deal identically |
| **Entities** | The actual infrastructure components (Cache, Database, Load Balancer, …) — pure functions of *(event, own state) → new events* | Actors in an actor model / independent state machines |
| **Metrics Collector** | A pure post-processing pass over the finished event log | A forensic analyst reading black-box flight recorder data after the fact |

### 2.1 Clock

Trivial by design — it exists so nothing else needs to reach for a
system clock, and so "now" is always one unambiguous, mockable value.

```
class Clock:
    now = 0
    function advanceTo(timestamp):
        now = max(now, timestamp)   # monotonic — never runs backward
```

### 2.2 Event Queue — a min-heap, and why

Events must come out in timestamp order, and thousands of them can be
in flight at once (every in-progress request has at least one event
scheduled for its next step). The naive approach — keep a sorted array,
insert in the right place — costs O(n) per insert because every
insertion may have to shift the rest of the array down. A **binary
min-heap** gets both insert and remove-minimum down to O(log n), which
is the standard answer to "give me the next thing to happen, repeatedly,
fast":

```
# binary min-heap, 0-indexed array representation
# parent(i)      = floor((i-1)/2)
# left_child(i)  = 2i+1
# right_child(i) = 2i+2

function enqueue(event):
    heap.append(event)
    bubble_up(heap.last_index)     # swap upward while smaller than parent

function dequeue():
    root = heap[0]
    heap[0] = heap.pop_last()
    sink_down(0)                   # swap downward while larger than a child
    return root
```

One subtlety worth naming: **ties**. Two events can share the exact
same timestamp (e.g. two requests admitted at t=100 because both were
already queued and released back-to-back). A heap alone doesn't
guarantee which of two equal keys comes out first. The fix is a
monotonic **sequence number** attached at insertion time, used as a
tiebreaker — first-in, first-out for same-timestamp events, so a run is
reproducible bit-for-bit, not merely "reproducible up to tie order."

```
compare(a, b):
    if a.timestamp != b.timestamp: return a.timestamp - b.timestamp
    return a.sequence - b.sequence   # stable: earlier insert wins ties
```

*(Actual code: `src/simulation/engine/EventQueue.ts`.)*

### 2.3 RNG — seeded, not "real," randomness

Real randomness (reading OS entropy) would make two runs of the
identical scenario produce different results — useless for teaching,
since "did switching this setting actually help, or did I just get
lucky this time?" needs an apples-to-apples comparison. The fix is a
**pseudo-random number generator (PRNG)** seeded with an integer: the
same seed always produces the same sequence of "random" numbers.

A linear congruential generator (LCG) is the simplest correct choice —
one multiply, one add, one mask, per call:

```
state = seed

function next() -> float in [0, 1):
    state = (state * A + C) mod M      # A, C, M are fixed magic constants
    return state / M

# everything else is built on next():
function nextInt(min, max):      return floor(next() * (max - min)) + min
function nextExponential(lambda): return -ln(1 - next()) / lambda   # inverse-transform sampling
function nextNormal(mean, sd):    # Box-Muller transform, needs two draws
    u1, u2 = next(), next()
    z = sqrt(-2 * ln(u1)) * cos(2*pi*u2)
    return z * sd + mean
```

Two rules make this actually work end to end:

1. **Every entity draws from the *same shared* RNG instance**, threaded
   through as part of the context each event handler receives — never a
   fresh RNG per entity, never `Math.random()`/`rand()` anywhere. One
   shared stream is what makes "seed 42 → this exact run" a promise the
   *whole* simulation keeps, not just one component of it.
2. **Nothing else is allowed to be a source of nondeterminism.** No
   wall-clock reads, no unordered-map iteration relied on for behavior,
   no `Promise`/async race conditions. An entity's output must be a
   deterministic function of `(incoming event, own accumulated state,
   next few draws from the RNG)`.

### 2.4 Entities

Covered in depth in [§4](#4-a-generic-entity-the-request-lifecycle-contract).
The short version: every simulated component — Client, Load Balancer,
Cache, Database, Rate Limiter, Circuit Breaker, … — implements one
method: *given an event addressed to me, and my own private state, what
happens next?*

### 2.5 Metrics Collector

Covered in [§11](#11-metrics-derived-not-tracked). The short version:
nothing is tallied live, mid-simulation. Every number shown in the UI —
hit rate, p99 latency, error rate, how many requests coalesced during a
stampede — is *recomputed from scratch* by scanning the finished event
array once the run is over.

---

## 3. The main loop

Putting the building blocks together, independent of language:

```
function runSimulation(architecture, scenario, seed):
    clock = new Clock()
    queue = new EventQueue()
    rng   = new RNG(seed)
    all_events = []                     # the append-only log
    entities = instantiate_one_object_per(architecture.components)
    downstream_map = build_adjacency_list(architecture.connections)
    latency_map     = build_latency_lookup(architecture.connections)

    for each simulated request arrival (from the traffic generator, §12):
        queue.enqueue(a "REQUEST_STARTED" event at that arrival time)

    while queue is not empty and step_count < safety_limit:
        event = queue.dequeue()
        clock.advanceTo(event.timestamp)
        all_events.append(event)                 # log it, unconditionally

        entity = entities[event.destination]
        if entity is null: continue              # e.g. system-wide events

        context = {
            now: clock.now,
            rng: rng,                             # the one shared stream
            downstream: downstream_map[entity.id],
            latencyTo: (target) -> latency_map[entity.id][target] or 0,
        }

        new_events = entity.handleEvent(event, context)
        for e in new_events: queue.enqueue(e)

    metrics = collectMetrics(all_events, ...)      # §11, purely post-hoc
    return { events: all_events, metrics }
```

A `maxSteps` safety valve (200,000 in this codebase) exists purely as a
circuit breaker against runaway configurations — e.g. two entities that
keep bouncing an event back and forth forever — not as part of the
simulation's actual semantics.

*(Actual code: `src/simulation/engine/Simulator.ts`.)*

---

## 4. A generic entity: the request lifecycle contract

Every entity — regardless of what real infrastructure it represents —
implements exactly one operation:

```
interface Entity:
    id: EntityId
    function handleEvent(event, context) -> list of new Events
```

That's the entire contract. No entity is ever told "how a database
works" from the outside; the *Database* entity's own `handleEvent`
**is** the definition of how a database behaves in this simulation. This
is deliberate: it means adding a new failure mode to, say, Cache never
requires touching the Simulator, the Event Queue, or any other entity —
the blast radius of a change is exactly the file for that entity plus
its tests.

Two design rules apply to **every** entity, and explain a lot of "why is
it written this way" throughout the codebase:

- **Local Knowledge.** An entity may only see what's in the event it was
  just handed, plus its own private state, plus the read-only `context`
  (current time, RNG, and *its own* outgoing connections/latencies). It
  can never reach into another entity's internals or "ask" the queue what
  else is pending. A Load Balancer tracking "least connections," for
  instance, has to maintain its own local in-flight counter — incremented
  when it dispatches, decremented when that target's response passes back
  through it — rather than querying each target for its load, because
  querying isn't a thing Local Knowledge allows.
- **Observable Behavior.** Anything that matters for teaching has to show
  up as an event a human can see in a timeline — a cache hit/miss, a
  circuit breaker tripping, a queue filling up — never as invisible
  internal bookkeeping. If a state transition can't be pointed at in the
  event log, from this tool's point of view it didn't happen.

### 4.1 Requests carry their own context (no shared session state)

Since entities can't share memory, a request has to carry everything
downstream entities might need about it as **metadata attached to the
event itself**, copied forward at every hop:

```
RequestLifecycleMetadata:
    startedAt: timestamp        # when the client first sent it — for computing total duration later
    direction: "request" | "response"   # which leg of the round trip this is
    path: [entity ids visited so far, starting with the client]
    key: string                 # which resource this is for (what makes a cache's hit rate meaningful)
    exists: boolean             # does this key actually exist downstream? (drives cache penetration)
    failed: boolean             # is this response leg carrying a failure back?
    failureReason: string
```

`path` is the trick that lets a response find its way back without a
routing table: whoever answers a request just walks `path` **backward**
to figure out who to hand the response to next (see
`responseRouting.ts`'s `findResponseTarget`). It also gives every entity
along the way a way to detect "is the next hop back the originating
client, or another entity?" — because the client is never itself an
entry in the downstream connection graph.

---

## 5. Shared building block: bounded capacity + a queue

Real infrastructure — an API server, a database connection pool, a
cache's own lookup threads — can only do so many things *at once*.
Model that once, share it everywhere, rather than re-deriving admission
logic per entity. This shared unit is the piece that turns "how many
requests can this thing handle concurrently" into two config knobs:
**max concurrent** and **max queue length**.

```
class BoundedProcessor(maxConcurrent, maxQueueLength):
    activeCount = 0
    queue = []

    function admit(request):
        if activeCount < maxConcurrent:
            activeCount += 1
            return STARTED
        if queue.length < maxQueueLength:
            queue.push(request)
            return QUEUED
        return REJECTED                 # this is what "capacity exceeded" means

    function complete():                # called when one unit of work finishes
        activeCount -= 1
        if queue is empty: return null
        next = queue.shift()
        activeCount += 1                # immediately promote the next queued item
        return next
```

Every capacity-bound entity (API Server, Database, Cache, …) composes
one of these rather than inheriting from a shared base class — the
entity owns *what* happens on admit/reject/complete (which events fire,
what a rejection means for that specific kind of component), while
`BoundedProcessor` owns only *whether there's room*.

The three outcomes map onto observable events directly:
`STARTED` → begin processing now; `QUEUED` → emit "request queued," wait;
`REJECTED` → emit "queue full" and fail the request immediately. That
third branch is what a load spike actually looks like in this
simulation: not "everything gets slower uniformly," but "past a hard
line, outright rejections start."

*(Actual code: `src/simulation/entities/BoundedProcessor.ts`.)*

---

## 6. Worked example: the Cache entity

Everything above is infrastructure. The Cache entity is where it gets
interesting, because it's the entity with the most named production
failure modes built in: **stampede**, **penetration**, and
**avalanche**. This section covers its base shape (cache-aside); the
next three sections go deep on each failure mode in turn.

### 6.1 The pattern being modeled: cache-aside

Cache-aside (a.k.a. "lazy loading") is the read pattern where the
*caller* — not the cache — is responsible for checking the cache first
and populating it on a miss:

```
function handleRead(key):
    value = cache.lookup(key)
    if value is present:
        return value                          # HIT — never touches the database
    value = database.fetch(key)               # MISS — fall through
    cache.store(key, value)                   # populate on the way back
    return value
```

The simulated Cache entity folds both directions of that round trip
into one state machine: a **request leg** (arriving, checking the
store) and a **response leg** (the fetched value coming back from
whatever's downstream, on its way to being stored and forwarded to the
original caller). Both legs go through the *same* `BoundedProcessor` —
because even "just a memory lookup" and "storing a value that just came
back" both take some finite processing capacity in reality.

### 6.2 Hit/miss decision

```
function onArrival(request, now):
    admission = processor.admit(request)
    if admission == REJECTED: fail("capacity_exceeded"); return
    if admission == QUEUED:   emit("queued"); return          # picked up later, see below
    beginProcessing(request, now)

function beginProcessing(request, now):
    if request.direction == "request":
        lookup = store.lookup(request.key, now)     # "hit" | "cold" | "expired"
        hit = (lookup == "hit")
        if hit: store.touch(request.key, now)        # recency/frequency bookkeeping for eviction
    ...
    duration = hit ? hitTimeMs : missOverheadMs
    schedule "processing complete" at now + duration
```

A deliberate detail: **the hit/miss decision is made at admission time,
not when processing finishes.** If it were decided later, a burst of
requests for the same key arriving back-to-back could each see a
*different* snapshot of the cache mid-burst, in ways that depend on
processing order rather than on what a real cache would do — a real
cache's contents don't change just because a lookup takes a few
microseconds to return.

### 6.3 The store itself: capacity + eviction policy

The keyed storage (separate class, `CacheStore`, shared verbatim between
Cache and CDN — a CDN edge is "one more copy of the exact same
capacity-bound key/value store with an eviction policy") tracks, per
key: when it was inserted, when it was last accessed, how many times
it's been accessed, and its own effective TTL.

```
function lookup(key, now):
    entry = entries[key]
    if entry is absent: return COLD
    if entry.ttl > 0 and now - entry.insertedAt >= entry.ttl:
        delete entries[key]
        return EXPIRED
    return HIT

function set(key, now, ttlOverride):
    if key is new and entries.size >= capacity:
        evictOne()
    entries[key] = { insertedAt: now, lastAccessedAt: now, accessCount: 1, ttl: ttlOverride or defaultTtl }

function evictOne():
    victim = the entry that scores "most evictable" under the configured policy:
        FIFO: smallest insertedAt
        LRU:  smallest lastAccessedAt
        MRU:  largest  lastAccessedAt      (evict the one just touched)
        LFU:  smallest accessCount, tie-broken by smallest insertedAt
    delete entries[victim]
```

Four eviction policies exist side by side specifically so a student can
compare them under identical traffic, rather than the tool asserting
"LRU is best" — see [§10](#10-a-repeating-pattern-shipping-multiple-algorithms-per-component)
for why that's a recurring design choice, not just a Cache thing.

*(Actual code: `src/simulation/entities/CacheStore.ts`, `Cache.ts`.)*

---

## 7. Deep dive: Cache Stampede and the lock (coalescing) fix

This is the example the rest of the document has been building toward.

### 7.1 What the failure actually is

**Cache stampede** (a.k.a. "dog-piling" or "thundering herd"): a
popular key's cached value disappears — TTL expiry, a cold start, an
explicit eviction — at a moment when many requests for that *same* key
are still arriving. Under the naive cache-aside pattern above, **every
one of those requests independently treats it as its own private
miss**, and every one of them independently re-fetches from downstream.
A cache that exists specifically to protect the database from repeated
identical work ends up, for one brief window, doing the exact opposite:
multiplying identical load onto it, all at once, at the worst possible
moment (right when the key was popular enough to matter).

The two ingredients that reproduce it in simulation:

1. **Skewed traffic** — a small pool of "hot" keys getting requested far
   more often than everything else (see [§12](#12-generating-realistic-traffic)).
   Without skew, no single key is popular enough for its expiry to be a
   real event; every key would be equally cold.
2. **Concurrency** — more than one in-flight request for the same hot
   key at the instant it goes missing. A low TTL relative to the request
   rate is what forces that: the key keeps expiring while the request
   stream for it hasn't let up.

### 7.2 Naive mode: the bug, modeled faithfully

"Naive" isn't a strawman — it's simply *not having the fix yet*, which is
exactly what a real cache-aside cache does before someone adds
stampede protection to it:

```
function onMiss_naive(request, key):
    # nothing shared between concurrent misses for the same key —
    # each one just falls through on its own.
    fetchFromDownstream(key)
    on downstream response:
        store(key, value)
        respond(request, value)
```

If three concurrent requests for `"hot"` all miss before any of them
gets an answer back, this fires **three independent downstream fetches**
for the identical key. That's the entire bug, and it needs zero extra
machinery to reproduce — it's what happens when you *don't* add
anything.

### 7.3 The fix: request coalescing / single-flight (the "lock")

The production fix — often called **request coalescing**,
**single-flight**, or informally "the lock" — is: the *first* miss for a
key becomes that key's leader and is the only one allowed to actually
go fetch. Every other miss for the *same* key that shows up while the
leader's fetch is still outstanding doesn't fetch at all — it registers
itself as a **waiter** and gets woken up with whatever the leader
eventually got (a value, or a failure), instead of doing its own trip.

This is functionally a **mutex / critical-section pattern**, just
applied to "fetching key K from downstream" instead of to a shared
memory location:

```
in_flight = {}      # key -> list of waiting followers (empty list = "someone is fetching, nobody's waiting yet")

function onMiss_coalesced(request, key):
    if key in in_flight:
        # SOMEONE ELSE IS ALREADY FETCHING THIS KEY — don't refetch.
        # Register as a follower and stop here; do nothing else.
        in_flight[key].append(request)
        return
    # FIRST miss for this key — become the leader.
    in_flight[key] = []                 # claim the lock *before* the fetch even starts
    fetchFromDownstream(key)

function onDownstreamResponse(key, outcome):        # outcome: value, or a failure
    followers = in_flight[key]
    delete in_flight[key]               # release the lock
    if outcome is success:
        store(key, outcome.value)
    respond(leaderRequest, outcome)
    for follower in followers:
        respond(follower, outcome)      # every waiter gets the SAME outcome the leader got
```

The critical ordering detail — the part that actually makes this a
correct lock rather than a race — is that **`in_flight[key] = []` is set
*before* the fetch is dispatched, in the very same step that decides
"I am the leader."** If it were set only *after* the fetch call
returned, a second miss arriving in that gap would see no lock yet and
incorrectly become a second leader — exactly the bug this is supposed
to prevent. Registering the placeholder first is what guarantees the
very next concurrent miss for the same key, arriving at any point before
the leader's fetch resolves, finds the lock already held.

### 7.4 What this actually looks like in the codebase

```typescript
// src/simulation/entities/Cache.ts (trimmed to the stampede-relevant lines)

private readonly stampedeInFlight = new Map<string, StampedeFollower[]>();

private beginProcessing(requestId, meta, ctx) {
  ...
  if (isRequestLeg && !hit && this.config.stampedeMode === "coalesced") {
    const followers = this.stampedeInFlight.get(meta.key);
    if (followers) {
      // Another fetch for this key is already in flight — wait on it
      // instead of triggering a second one.
      followers.push({ requestId, meta });
      return [
        createProcessingStartedEvent(ctx.now, this.id, requestId),
        createCacheAccessEvent("CACHE_MISS", ctx.now, this.id, requestId,
          meta.key, false, { coalesced: true }),
      ];
      // Note: no PROCESSING_COMPLETED is scheduled here. A follower does
      // no work of its own — it just waits to be woken later.
    }
    // First miss for this key — this request becomes its leader.
    this.stampedeInFlight.set(meta.key, []);
  }
  ... // leader falls through to the normal miss path below and fetches
}

private releaseStampedeFollowers(key, ctx, failed, failureReason) {
  const followers = this.stampedeInFlight.get(key);
  this.stampedeInFlight.delete(key);          // release the lock
  for (const follower of followers ?? []) {
    const outcome = failed
      ? { ...follower.meta, failed: true, failureReason }
      : follower.meta;
    events.push(...this.respond(outcome, ctx, follower.requestId));
  }
  return events;
}
```

`releaseStampedeFollowers` is called from exactly one place: the branch
in `onProcessingComplete` that handles a **response**-direction event for
a request that just fetched from downstream (i.e., the leader's own
fetch resolving) — the moment the lock's holder is done is the moment
the lock is released and every waiter gets woken, in one step.

### 7.5 The edge cases this has to get right

A stampede fix that only handles the happy path (three misses, one
fetch, everyone gets the value) isn't actually done. The ones this
implementation handles, and why each one matters:

- **The leader itself fails.** If the downstream fetch the leader
  triggered comes back as a failure (or there's no downstream connection
  at all), every follower waiting on that key has to fail too — with the
  *same* failure, not a generic one. A follower has no independent
  fetch of its own to fall back on; sharing the leader's fate is the
  entire deal it made by waiting instead of fetching. Concretely: an
  `onMiss` outcome that's a failure calls
  `releaseStampedeFollowers(key, ctx, /* failed */ true, reason)`,
  the exact same call as the success path, just with `failed: true`
  threaded through.
- **A follower still occupies real capacity while it waits.** This is
  the tradeoff coalescing doesn't get for free, and the codebase is
  explicit about not hiding it: a follower's request already claimed a
  slot in the Cache's own `BoundedProcessor` (concurrency/queue) the
  moment it arrived, admitted the normal way, before it discovered it
  was going to wait rather than fetch. That slot stays occupied for
  the *entire* wait, only freed when `releaseStampedeFollowers` finally
  calls `processor.complete()` for it. In other words: coalescing turns
  "N downstream fetches" into "1 downstream fetch," but it does **not**
  turn "N requests held open" into "1 request held open" — the cache
  itself still has to have enough concurrency/queue headroom to hold
  every follower for the duration of the leader's fetch, or those
  followers queue or get rejected exactly like any other admission
  would. A lock that's free to acquire but not free to hold.
- **What gets cached is exactly what the leader got — never re-derived
  per follower.** All followers observe the *one* real fetch's outcome,
  not their own reconstruction of it, which is what makes this "single
  flight" rather than merely "fewer flights." A phantom-key request
  (see [§8](#8-deep-dive-cache-penetration-negative-caching)) that
  happens to be the leader still resolves every follower to the exact
  same "not found," which is the *correct* outcome for a phantom key —
  no special-casing needed, because "share the leader's result" already
  covers it.
- **Naive vs. coalesced must diverge *only* in this one respect.**
  Nothing else about the two modes' behavior is allowed to differ,
  because the entire pedagogical point is an apples-to-apples
  comparison — same traffic, same seed, same downstream, flip one
  config flag, see downstream load and error rate change. If coalescing
  quietly changed hit-rate accounting or timing for hits, a learner
  couldn't isolate "this changed because of the lock" from "this changed
  because something unrelated also moved."

### 7.6 How the fix is *measured*, not just implemented

Every `CACHE_MISS` event under coalesced mode is tagged
`{ coalesced: true }` when it's a follower's miss, and left untagged for
a leader's real miss (see the snippet above). The Metrics Collector
later does nothing more than count these tags across the whole event
log:

```
for event in all_events:
    if event.type == "CACHE_MISS":
        misses += 1
        if event.metadata.coalesced: coalescedMisses += 1

independentMisses = misses - coalescedMisses - negativeHits
report { coalescedMisses, independentMisses }
```

`independentMisses` is, by construction, exactly the number of real
downstream fetches a stampede caused — the number that visibly drops
once naive is switched to coalesced, for identical traffic and seed.
That's the "before/after" a learner actually sees in the Cache
Inspector panel: not a claim that coalescing helps, but a real count,
from a real run, of downstream trips saved.

*(Actual code: `src/simulation/metrics/MetricsCollector.ts`, the
`cacheStampede` block.)*

---

## 8. Deep dive: Cache Penetration (negative caching)

A different failure, easy to confuse with stampede because it also
shows up as "too many downstream trips for keys that shouldn't need
them" — but the mechanism and the fix are unrelated to locking.

**The failure:** repeated lookups for a key that will *never* exist — a
typo'd id, a deleted record, an attacker probing for valid ids. A cache
can only ever protect keys it's allowed to store, and a plain
cache-aside cache has no concept of "this key is confirmed to not
exist" — so every single lookup for a phantom key is a guaranteed miss,
forever, each one paying the full downstream round trip for a "no"
that will never change.

**The fix:** cache the *absence* too. The first confirmed "not found"
for a key gets its own entry, in a **separate** map from real values
(never reusing the positive cache's capacity/eviction semantics — a
"this doesn't exist" fact isn't a value), with its own TTL:

```
negative_cache = {}   # key -> expiresAt (0 = never expires)

function onArrival(key):
    if key in negative_cache and not expired(negative_cache[key]):
        return respond(NOT_FOUND)          # answered locally — no downstream trip, no lock needed either
    ... # falls through to a normal miss / stampede-coalescing path as usual

function onDownstreamResponse(key, outcome):
    if outcome == NOT_FOUND and negativeCachingEnabled:
        negative_cache[key] = now + negativeCacheTtl
    ...
```

The engine doesn't model per-key existence anywhere downstream (no
entity knows what "exists" even means for a key) — so the Cache is
deliberately the *one* place a phantom request's outcome is decided,
overriding whatever downstream itself reports, the same simplification
already made for query correctness generally. Real production systems
have the actual data source be the source of truth for existence; this
simulation collapses that down to "the Cache knows," which is enough to
teach the pattern without modeling a whole schema layer just for this.

*(Actual code: `Cache.ts`'s `negativeCache` map and the
`negativeCaching`/`negativeCacheTtlMs` config.)*

---

## 9. Deep dive: Cache Avalanche (TTL jitter)

A third, again-distinct failure that happens to share the same entity.

**The failure:** many *unrelated* keys all expire at nearly the same
moment — typically because they were all first cached around the same
moment (a cold start warming many keys at once, a deploy that flushed
the cache). Even with a perfectly working cache and no single "hot key"
stampede, a synchronized wave of independent expiries produces a
synchronized wave of downstream re-fetches, right when the cache should
be smoothing load out, not bursting it.

**The fix:** never let a batch of entries share one *exact* expiry. When
storing an entry, randomize its own effective TTL by up to a configured
fraction above or below the configured value:

```
function jitteredTtl(baseTtl, jitterPercent, rng):
    if jitterPercent <= 0: return baseTtl        # off by default — exact behavior preserved
    spread = rng.uniform(-jitterPercent, +jitterPercent)
    return round(baseTtl * (1 + spread))
```

Ten keys all cached at t=0 with `ttl=1000ms, jitter=0.2` now expire
somewhere across roughly `[800ms, 1200ms]` instead of all at exactly
`1000ms` — the same total cache "freshness" on average, but the
re-fetch load gets spread across a window instead of landing in one
spike.

**How it's measured:** every miss caused by an entry's TTL actually
expiring (as opposed to a cold key that was simply never cached) is
tagged `expired: true`. The metrics pass then runs a classic **sliding
window / two-pointer sweep** over the sorted timestamps of those
expiry-driven misses to find the single largest burst — literally, "the
most expiries that ever fell within any 100ms window of each other":

```
function peakBurst(timestamps, windowMs):
    sorted = sort(timestamps)
    left = 0
    peak = 0
    for right in 0..sorted.length:
        while sorted[right] - sorted[left] > windowMs:
            left += 1
        peak = max(peak, right - left + 1)
    return peak
```

Without jitter, that peak equals however many keys were originally
cached together (a real synchronized wave). With jitter on, for
identical traffic and seed, the peak drops — a measured, not asserted,
before/after.

*(Actual code: `MetricsCollector.ts`'s `computePeakBurst`, O(n log n)
for the sort plus O(n) for the sweep.)*

---

## 10. A repeating pattern: shipping *multiple* algorithms per component

Cache isn't the only entity that ships more than one policy side by
side on purpose. The same shape shows up in **Load Balancer** (five
routing algorithms) and **Rate Limiter** (two admission algorithms), and
it's a deliberate house rule, not incidental: a component whose whole
job *is* a policy decision has to expose more than one selectable
policy, with a way to see them diverge under identical traffic —
otherwise a learner is just told "load balancers balance load," which
teaches nothing about the actual tradeoffs.

Two smaller patterns worth naming because they recur in every algorithm
implementation here:

**Tie-breaking has to fall back to something fair.** "Least
connections" and "least response time" both pick "whichever target
currently looks best" — but early in a run (or whenever multiple
targets are genuinely tied), *everything* is tied. Naively picking
`targets[0]` on a tie would pile every request onto one target and make
the algorithm look broken. The fix used throughout: fall back to the
*same round-robin cursor* on ties, so a tie splits evenly instead of
collapsing onto one target:

```
function selectTarget_leastConnections(targets):
    minLoad = min(load[t] for t in targets)
    tied = [t for t in targets if load[t] == minLoad]
    target = tied[cursor % tied.length]     # round-robin *within* the tied set
    cursor += 1
    return target
```

**A losing target must still occasionally get sampled.** "Least response
time" tracks each target's latency as a **running average** (an
exponential moving average — each new sample nudges the average instead
of replacing it outright, so one slow outlier doesn't cause thrashing):

```
newAverage = oldAverage * (1 - alpha) + newSample * alpha    # alpha in (0,1), small = smoother
```

But an algorithm that *only ever* picks the current best has a trap: a
target that loses one early, noise-driven comparison stops receiving
traffic entirely — and since it stops receiving traffic, its latency
data goes stale forever, so it can never earn its way back in, even
against a target that's actually identical. The fix: force a plain
round-robin dispatch every Nth request, regardless of measured latency,
purely to keep every target's data fresh. This is the classic
**explore vs. exploit** tension (as in multi-armed bandit problems),
solved here with the simplest possible policy — a fixed periodic
explore step — rather than anything more adaptive, because the teaching
goal is "notice this trap exists," not "implement an optimal bandit
algorithm."

The `Rate Limiter`'s two algorithms are a cleaner, more self-contained
pair to study for the same "ship two, let them diverge" idea:

```
# Token Bucket — allows bursts, using up "saved" idle capacity
function tryAdmit_tokenBucket(now):
    elapsed = now - lastRefillTime
    tokens = min(burstCapacity, tokens + elapsed * refillRatePerMs)
    lastRefillTime = now
    if tokens < 1: return false
    tokens -= 1
    return true

# Sliding Window — a hard, steady ceiling, no accumulation
function tryAdmit_slidingWindow(now):
    drop entries from admittedTimestamps older than (now - windowMs)
    if admittedTimestamps.length >= limit: return false
    admittedTimestamps.push(now)
    return true
```

Under smooth, steady traffic at or under the configured rate, these two
are indistinguishable. They only diverge once traffic *bursts* — which
is exactly the point: the divergence itself is the lesson, not either
algorithm in isolation.

---

## 11. Metrics: derived, not tracked

A design rule that shapes the whole codebase: **no entity increments a
running counter for a metric while the simulation is executing.**
Every number the UI shows — total requests, success rate, p50/p99
latency, per-entity utilization, cache hit rate, stampede's
coalesced-vs-independent split, avalanche's peak burst — is computed by
a single pure function that takes the finished, immutable event array
as its *only* input and produces a snapshot:

```
function collectMetrics(events, entityIds, durationMs) -> MetricsSnapshot:
    for event in events:
        match event.type:
            case REQUEST_COMPLETED: successfulRequests += 1; latencies.push(event.duration)
            case REQUEST_FAILED:    failedRequests += 1
            case CACHE_HIT:         entityMetrics[event.source].hits += 1
            case CACHE_MISS:        entityMetrics[event.source].misses += 1; ...
            case PROCESSING_STARTED / PROCESSING_COMPLETED: ... # pair these to get per-entity utilization
            case REQUEST_QUEUED / REQUEST_DEQUEUED:          ... # pair these to get queue-depth-over-time
            ...
    return { totalRequests, successfulRequests, latencyPercentiles(latencies), entityMetrics, ... }
```

Why bother, instead of the obviously simpler "just increment a counter
in the Cache entity every time it hits"? Two reasons, both load-bearing
for a tool whose entire premise is "trustworthy, replayable
experiments":

- **Reproducibility and testability.** A metric derived from the event
  log can be independently recomputed, in a unit test, from a hand-built
  array of events — no simulation run required, no risk of the live
  counter and the "real" count silently drifting apart.
- **The event log is the single source of truth.** Playback/animation,
  every chart in the UI, and every metric all read from the exact same
  array. There's no second, parallel bookkeeping path that could ever
  disagree with what the timeline visibly shows.

`PROCESSING_STARTED`/`PROCESSING_COMPLETED` and
`REQUEST_QUEUED`/`REQUEST_DEQUEUED` are a good example of the general
technique: rather than an entity exposing "my current queue length" as
a number, it just emits paired bracket events around a stretch of time,
and any consumer of the log can integrate over those pairs afterward to
reconstruct concurrency, queue depth, or utilization at any point in
time — a generic device, reused for every capacity-bound entity, not
Cache-specific.

*(Actual code: `src/simulation/metrics/MetricsCollector.ts`.)*

---

## 12. Generating realistic traffic

None of the failure modes above matter under uniformly random,
evenly-spaced traffic — a stampede needs a hot key; an avalanche needs a
synchronized batch. Traffic generation is therefore itself doing real
modeling work, not just "fire N requests":

**Arrival timing** — three patterns, each a different real-world load
shape:

```
# constant: Poisson arrivals — the standard model for "independent random
# arrivals at a steady average rate" (customers arriving, API calls from
# many independent clients, etc.)
function generateConstant(ratePerSecond, durationMs, rng):
    lambda = ratePerSecond / 1000
    t = 0
    while t < durationMs:
        t += rng.exponential(lambda)     # inter-arrival gaps, not uniform gaps
        emit arrival at round(t)

# burst: `rate` arrivals packed into a short window, repeating periodically
# — models traffic spikes (a cron job, a flash sale, a cache flush)

# ramp: rate increases linearly from a start value to an end value over
# the run — models gradual load growth
```

**Which key a request targets** — deliberately *not* uniform:

```
function assignRequestKey(rng, poolSize):
    # squaring a uniform draw skews the distribution toward 0 — cheap
    # stand-in for Zipfian ("a few keys are very hot, most are rare"),
    # without needing a precomputed cumulative distribution.
    index = floor(poolSize * rng.uniform()^2)
    return "key_" + min(index, poolSize - 1)
```

Squaring a uniform `[0,1)` draw is a well-known trick for cheaply
approximating a power-law-shaped distribution: values near 0 become
*more* likely (since `x²` compresses the low end less than the high
end gets stretched out — think of it as most draws landing in the first
narrow slice). The *qualitative* shape — a small number of hot keys,
a long tail of rare ones — is what actually matters here, not an exact
Zipf fit; it's this skew, not the raw request rate, that makes a
cache's hit rate meaningful at all. Uniform traffic would make every
key equally rare and no cache would ever help.

**Which keys don't exist** (cache penetration traffic) is decided
*before* which key, from a completely separate, small, uniformly-drawn
pool with a disjoint namespace (`missing_0`, `missing_1`, …) — disjoint
by construction, so a phantom id can never accidentally collide with a
real one.

*(Actual code: `src/simulation/engine/TrafficGenerator.ts`.)*

---

## 13. Edge cases that show up in almost every entity

A handful of edge cases aren't specific to any one component — they're
the shape every entity has to handle, and they're worth naming
separately since they'd otherwise look like unrelated one-off checks
scattered through the code:

- **Zero downstream connections.** Any entity that's supposed to
  forward somewhere but has nothing wired up downstream must fail the
  request immediately and explicitly (`no_downstream_connection`) —
  never silently drop it, never throw an unhandled error. A dangling
  wire in a drawn architecture is itself something to learn from.
- **A response has to find its way back without a routing table.**
  Solved once (`findResponseTarget`, walking `path` backward) and reused
  by every entity's response-leg handling, rather than each entity
  inventing its own "who do I answer" logic — including identifying "am
  I about to hand this to the client, or to another entity" the same
  way everywhere.
- **Queue-full is a real, distinct outcome from "slow."** Every
  capacity-bound entity distinguishes "admitted, but waiting" from
  "rejected outright" (`BoundedProcessor`'s three admission outcomes,
  §5) — collapsing them would hide the exact moment a system stops
  degrading gracefully and starts dropping traffic.
- **A response leg still gets forwarded through entities that don't
  need to react to it.** Load Balancer's round-robin, for instance,
  never looks at a response — but it still passes the response leg
  through itself unconditionally, because *other* algorithms on the same
  entity (least-connections) do need to observe it, and anything wired
  up further downstream (a Cache placed behind the load balancer) needs
  the response to keep flowing regardless of which algorithm happens to
  be active.
- **Determinism has to survive every one of the above.** Every branch
  that consumes randomness reads from the one shared, seeded RNG passed
  in via context — never a fresh RNG, never real wall-clock time — so
  "same seed, same architecture → identical run" holds even through
  rejections, coalescing, retries, and failures, not just the happy
  path.

---

## 14. How a browser UI sits on top of this

Briefly, since this document is about the simulation itself: the engine
above (`src/simulation/**`) has **zero UI dependencies** — it's pure
data-in, data-out, independently testable and independently portable to
any other environment. A separate "bridge" layer
(`src/lib/failureDemoBridge.ts` and its Workshop-side sibling) converts
whatever a student has drawn on the visual canvas (nodes + edges) into
the `SimulationConfig` shape `runSimulation` expects, runs it, and hands
the resulting event log + metrics to:

- a **Playback Controller** that replays the event array on a
  scrubber/timeline, so a student can watch a stampede happen
  event-by-event rather than only see an end-state number, and
- **Inspector/Metrics panels** that render the `MetricsSnapshot` (hit
  rate charts, per-entity utilization, the stampede/penetration/
  avalanche breakdowns from §11) as the UI a learner actually interacts
  with.

Nothing about that boundary is specific to Cache or to stampede — any
entity's behavior reaches the screen through this exact same
event-log → metrics/playback pipeline.

---

## 15. Testing strategy

Two levels of test exist for a component like Cache, and the split maps
directly onto how the entity is meant to be used:

- **Direct entity harness tests** call `cache.handleEvent(...)` by hand,
  one event at a time, with a hand-built `SimulationContext` — no
  `Simulator`, no traffic generator involved. This is what lets a test
  assert something as precise as "exactly one `REQUEST_ROUTED` event
  comes out of resolving the leader's fetch, despite three concurrent
  misses for the same key" (§7's coalescing test) — a claim about a
  single entity's internal decision, independent of everything else in
  the system.
- **Full-simulator tests** run a real `SimulationConfig` through
  `runSimulation` end to end and assert on the resulting
  `MetricsSnapshot` — e.g. "coalesced mode forwards strictly fewer
  requests downstream than naive, for byte-for-byte identical traffic
  and seed." This is the level that actually exercises determinism
  itself (`is deterministic for a given seed` tests re-run the same
  config twice and diff the results) and the level closest to what a
  learner experiences.

Both levels lean on the same trick: because the RNG is seeded and
nothing else is nondeterministic, a test can assert on *exact* event
sequences and *exact* metric values — not "roughly," not "eventually,"
not with retries or timing slop. That's rare for tests of concurrent-ish
behavior in most systems, and it's a direct payoff of the discrete-event
+ seeded-RNG architecture from §1–§2, not something the tests had to
work around.

*(Actual code: `src/simulation/__tests__/Cache.test.ts`.)*

---

## 16. Glossary / mental model cheat sheet

| Term used here | What it means | Where it shows up |
|---|---|---|
| Discrete-event simulation | Model time as a sequence of instants where something happens, skip everything in between | The whole engine, §1 |
| Min-heap / priority queue | Data structure giving O(log n) "insert" and "remove smallest" | Event Queue, §2.2 |
| Seeded PRNG / LCG | A deterministic sequence of "random" numbers, reproducible from an integer seed | RNG, §2.3 |
| Local Knowledge | An entity may only use its own state + the event it was just given + its own outgoing connections | Every entity, §4 |
| Cache-aside | Caller checks cache first, falls through and populates on miss | Cache's base behavior, §6.1 |
| Cache stampede | Many concurrent misses for one key, all independently re-fetching | §7 |
| Request coalescing / single-flight / "the lock" | First miss for a key becomes the leader; everyone else waits and shares its result | §7.3–7.5 |
| Cache penetration | Repeated lookups for a key that will never exist | §8 |
| Negative caching | Caching the fact "this key doesn't exist," not just values | §8 |
| Cache avalanche | Many unrelated keys expiring in the same synchronized instant | §9 |
| TTL jitter | Randomizing each entry's own expiry so a batch doesn't expire in lockstep | §9 |
| Sliding window (two-pointer) sweep | Scan sorted timestamps to find the densest cluster within a fixed window | `computePeakBurst`, §9 |
| Exponential moving average (EMA) | A running average where new samples matter more than old ones, without storing full history | Least-response-time load balancing, §10 |
| Explore vs. exploit | Occasionally trying a non-best option so its data doesn't go stale forever | Least-response-time's periodic round-robin, §10 |
| Token bucket / sliding window (rate limiting) | Two different admission policies — accumulate-then-burst vs. hard steady ceiling | Rate Limiter, §10 |
| Derived metrics | Every reported number recomputed from the immutable event log, never tracked live | §11 |
