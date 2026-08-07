# ENTITIES.md

# Engineering Studio Infrastructure Entities

> Infrastructure components are autonomous actors that cooperate through events to create the behavior of an entire distributed system.

---

# Philosophy

Engineering Studio does not simulate architectures.

It simulates interactions between infrastructure components.

Every node that users place onto the canvas represents an independent software entity.

Each entity owns:

- State
- Configuration
- Behavior
- Decision making
- Metrics

The simulator never contains infrastructure logic.

Instead,

the simulator simply delivers events.

Entities decide what those events mean.

This mirrors real distributed systems.

A database knows how databases behave.

A cache knows how caches behave.

A load balancer knows how load balancers behave.

The simulation engine merely coordinates communication.

---

# Universal Entity Model

Although every infrastructure component behaves differently,

they all follow the same conceptual lifecycle.

```

Configuration

↓

Receive Event

↓

Inspect Current State

↓

Make Decision

↓

Update Internal State

↓

Generate New Events

↓

Return Control

```

Because every entity follows this lifecycle,

new infrastructure components can be introduced without changing the simulator itself.

---

# Entity Responsibilities

Every entity should answer five questions.

## 1. What am I?

What infrastructure concept does this entity represent?

---

## 2. What do I know?

Internal state.

Examples

Connections

Queue length

Cache entries

Replica health

Current load

---

## 3. What can happen to me?

Incoming events.

Examples

Request arrived

Timeout

Failure

Retry

Cache lookup

Database query

---

## 4. What can I do?

Outgoing events.

Examples

Forward request

Reject request

Generate response

Retry later

Replicate data

---

## 5. What should users learn?

Every entity exists to teach an engineering concept.

Learning is the primary responsibility.

Simulation is the mechanism.

---

# Design Principles

Every entity should follow these rules.

---

## Single Responsibility

An entity should model exactly one infrastructure concept.

The database should not perform load balancing.

The cache should not perform routing.

Responsibilities should remain obvious.

---

## Local Knowledge

Entities only know what they reasonably could know.

A database does not know the state of a CDN.

A cache does not know the internal queue of another cache.

Communication occurs through events.

Never shared global state.

---

## Autonomous Decisions

Entities choose their own behavior.

The simulator never forces an outcome.

Instead,

the simulator asks

"What happens when this event reaches you?"

The entity answers.

---

## Observable Behavior

Every decision made by an entity should eventually become visible.

Users cannot learn from invisible behavior.

If a queue becomes full,

users should observe it.

If a cache saves latency,

users should observe it.

Behavior without visibility has little educational value.

---

## Deterministic Decisions

Given identical state,

identical configuration,

and identical events,

an entity must always behave identically.

Randomness must be explicit,

never accidental.

---

# Core Entities

---

# Client

## Purpose

The Client represents users interacting with the system.

It is the origin of every request.

Clients do not understand infrastructure.

They simply attempt to complete work.

Their perspective defines the user experience.

---

## Engineering Concept

Users judge systems by outcomes.

Not architecture.

The Client therefore measures

- latency
- success
- failure
- responsiveness

Everything else exists only to improve these outcomes.

---

## Internal State

The Client remembers

- requests created
- responses received
- failed requests
- retry attempts

The Client does not know

- database utilization
- cache contents
- server load

Those concerns belong elsewhere.

---

## Incoming Events

Response received

Timeout

Retry complete

Failure notification

---

## Outgoing Events

Generate request

Retry request

Cancel request

---

## Configuration

Request Rate

Concurrent Users

Retry Policy

Timeout

Think Time

---

## Metrics

Average Latency

Completed Requests

Failed Requests

Success Rate

Retry Count

---

## Visualization

Requests originate visually from the Client.

The Client is the only component that creates new work.

Every request begins here.

---

## Learning Goal

The Client teaches that users experience systems only through latency and reliability.

Everything else in the architecture ultimately exists to improve these two outcomes.

---

# Database

## Purpose

The Database persists state and answers queries through a bounded connection pool.

Every query it runs competes with every other query for the same limited connections.

It can fail independently of anything upstream.

---

## Engineering Concept

A database is usually the tightest bottleneck in any architecture.

It can't be casually duplicated the way a stateless server can — protecting it (caching, connection limits, read replicas) matters more than protecting anything else.

Two types ship, so the tradeoff between them can be felt, not just read about:

- **SQL (relational)** — a fixed schema, joins, ACID transactions. Strong consistency, but query-planning and locking overhead caps how much concurrent write throughput a single instance handles, and joins make horizontal sharding hard.
- **NoSQL (document / key-value)** — a flexible schema, data partitioned across nodes by key. Much higher concurrent write throughput and easier horizontal scaling, at the cost of joins and (usually) strong consistency.

This is not modeled as a strict upgrade. NoSQL's higher throughput here comes with consistency guarantees this simulation doesn't check — exactly the tradeoff a real choice between them involves.

**What's simulated:** `type` applies a fixed multiplier on top of whatever Max Connections / Processing Time is configured — NoSQL roughly triples the effective connection ceiling and roughly halves query time, standing in for horizontal partitioning and simpler key-based access relative to a relational engine's query-planning/locking overhead.

**What's deliberately not simulated:** schemas, joins, partition keys, replication, and consistency (ACID vs eventual) — those need query-shape and data-versioning modeling this engine doesn't have. A documented simplification, not a bug.

---

## Internal State

Bounded concurrency and queue (the connection pool), same shape as the API Server.

---

## Incoming Events

Request arrived (run the query).

---

## Outgoing Events

Forward a response back toward its origin.

Query failed (independently of load, at a configured probability) or database busy (the connection pool and its queue are both full).

---

## Configuration

Database Type — SQL or NoSQL.

Max Connections — queries the connection pool can run at the same time.

Max Queue Length — queries allowed to wait once at capacity, before being rejected.

Processing Time — time spent executing a single query.

Failure Probability — chance a query fails independently of load.

---

## Optimization Techniques

These aren't individually simulated as separate knobs — they're the real-world levers this entity's config abstracts over, worth understanding regardless:

- **Indexing** — trade write cost and storage for read speed, by maintaining a lookup structure alongside the data itself. Modeled here only as a faster configured Processing Time.
- **Connection pooling** — share a limited number of expensive connections across many requests instead of opening one per request. This *is* modeled directly, as Max Connections.
- **Read replicas** — scale reads horizontally by copying data to additional read-only instances; writes still go to one place. Modeled by placing a second Database node behind a Load Balancer configured for reads only — not automatic.
- **Sharding / partitioning** — split data by key across multiple instances so no single one holds everything (or takes every query). This is closer to what selecting NoSQL represents here than a literal simulated shard map.

---

## Learning Goal

A database is a shared, limited resource — every query it runs concurrently competes for the same connection pool, and it can fail independently of anything upstream. SQL vs NoSQL is a design tradeoff decided by access pattern and consistency needs, not a strict upgrade in either direction.

---

# Load Balancer

## Purpose

The Load Balancer sits in front of multiple downstream servers and decides which one handles each incoming request.

It has no capacity of its own.

It makes an instant routing decision and forwards.

---

## Engineering Concept

A load balancer does not create capacity.

It only spreads existing capacity more evenly.

Putting one in front of a single overloaded server changes nothing — the servers behind it are what actually need to scale.

Five routing algorithms ship — every algorithm the course names for this lesson — specifically so their behavior can be compared:

- **Round Robin** — cycles through targets in order, regardless of load. Deterministic, needs no state beyond a counter.
- **Least Connections** — routes to whichever target currently has the fewest in-flight requests.
- **Weighted Round Robin** — the same round-robin cursor, cycled over a target sequence expanded by each target's configured weight instead of the bare downstream list, so over any full cycle each target's share of dispatches matches its weight's share of the total.
- **IP Hash** — hashes a per-request identifier mod target count, so the same identifier always lands on the same target (session affinity). This simulation has no modeled client IP; the closest available stand-in is the request's resource key, the same identity CDN already hashes for edge affinity — a documented substitution, not a literal IP.
- **Least Response Time** — Least Connections' generalization from request count to actual observed latency: routes to whichever target has the lowest recent average response time, tracked as an exponential moving average updated every time that target's response passes back through. A target with no observed latency yet defaults to being treated as fastest, so it gets an initial chance instead of being starved by targets with a head start on data.

Round Robin and Least Connections behave identically when every target is equally fast, and only diverge once one target is slower or overloaded — Least Response Time is the same idea, generalized to reacting to a target that's technically available but just slow, not only one that's saturated. Weighted Round Robin and IP Hash instead diverge from plain Round Robin immediately, by design (a configured weight, a routing key) rather than by load.

Weights live on the Load Balancer's own config, keyed by target entity id — Local Knowledge: a load balancer can't know a target's own configured capacity, only what an operator tells it to prefer. A target with no configured weight defaults to 1, so partially-specified weights degrade gracefully instead of dropping a target from rotation.

**Health checks (active/passive)** — the course's other named concept for this lesson — are a deliberate non-goal, not an oversight. Detecting a struggling target and routing around it is exactly what Circuit Breaker already teaches as its own entity; duplicating that state machine inside Load Balancer would violate Single Responsibility for the same reason Load Balancer doesn't model its own capacity. The intended composition is architectural: put a Circuit Breaker in front of each target a Load Balancer routes to.

---

## Internal State

A rotating index (Round Robin's, Weighted Round Robin's, and Least Response Time's shared cursor).

In-flight request count per downstream target (Least Connections only) — incremented on dispatch, decremented when that target's response passes back through.

The expanded weighted target sequence (Weighted Round Robin only) — rebuilt only when the downstream list or weights actually change.

Average response latency per downstream target (Least Response Time only) — an exponential moving average, updated on every response.

---

## Incoming Events

Request arrived (route it onward).

Response passing through (decrement that target's in-flight count and fold its latency into that target's average, then continue toward the client).

---

## Outgoing Events

Route request to a chosen target.

Forward a response back toward its origin.

---

## Configuration

Algorithm — Round Robin, Least Connections, Weighted Round Robin, IP Hash, or Least Response Time.

Target Weights — per-target relative weight (Weighted Round Robin only); a target with no entry defaults to 1.

---

## Metrics

Per-target request distribution — how many requests each downstream target actually received.

---

## Visualization

A per-target distribution bar in the Inspector, so the algorithm's effect is something a student can see, not just a setting they toggled. A per-target weight editor (Weighted Round Robin only).

---

## Learning Goal

Different routing algorithms achieve "spread requests evenly" differently once replicas aren't identical. A load balancer with a single hardcoded algorithm can't teach that — comparison is the point.

---

# Cache

## Purpose

The Cache sits in front of slower storage (typically a Database) and answers requests from memory when it can.

A hit skips the expensive path entirely.

A miss falls through, and the fetched value is stored on the way back.

---

## Engineering Concept

This implements the cache-aside pattern: check the cache first, fall through on a miss, store the result afterward.

A cache only helps when the same key is requested often enough to be worth remembering.

Hit rate is a property of both the cache (capacity, eviction policy) and the traffic (how repetitive it actually is) — not something a cache can force on its own.

Like the API Server and Database, both directions — the inbound request and the returning response on a miss — go through the same bounded concurrency and queue admission. A cache has finite throughput even though its work is fast.

All three of production caching's well-known failure modes are directly simulated, each as its own comparable config axis (the same pattern used for algorithm-comparison entities elsewhere):

**Cache stampede** — a popular key's value disappearing (TTL expiry, cold start) while many requests for it are still arriving — via Stampede Protection:

- **Naive** — every concurrent miss for the key independently re-fetches from downstream. This is what happens without protection: a hot key's expiry multiplies load on the database at exactly the wrong moment.
- **Coalesced** — the first miss for a key becomes that key's leader and fetches; every other miss for the same key that arrives before the leader's fetch resolves waits on it instead of fetching independently, then shares whatever the leader got. This is request coalescing / single-flight, the standard production fix. The tradeoff: a waiting follower still occupies its own admitted concurrency/queue slot for the whole wait — coalescing trades "downstream sees fewer fetches" for "this cache holds the waiting request open," a real cost, not a free lunch.

**Cache penetration** — repeated lookups for a key that will never exist (a typo'd id, a deleted record, an attacker probing for valid ids) — via Negative Caching. This engine's downstream entities have no concept of per-key existence, so the Client marks a configurable fraction of its own traffic (Missing Key Rate) as targeting a small, fixed pool of permanently nonexistent keys, and Cache is the one place that resolves such a request as "not found" — deterministically, regardless of what downstream itself reported, once its round trip completes:

- **Off** (default) — every request for a permanently-missing key makes its own full downstream round trip, forever. This is the vulnerability itself: nothing ever gets remembered about a key that "doesn't exist," so the cache offers zero protection against repeated lookups for it.
- **On** — the first "not found" result is cached too (Negative Cache TTL, independent of the positive TTL above — production keeps this shorter, since too long risks masking a resource created later), so a repeat lookup for the same missing key is answered straight from Cache instead of hammering downstream again.

**Cache avalanche** — many entries, cached around the same moment (typically a cold start), sharing one exact TTL and therefore expiring together as a synchronized wave — via TTL Jitter, a percentage (0–50%) randomizing each entry's own effective TTL above/below the configured value at the moment it's stored:

- **0%** (default) — every entry shares the exact same TTL, so a batch cached together expires together — a burst of downstream re-fetches landing all at once, right when the cache should be absorbing load, not adding to it.
- **>0%** — expiries stagger across a window instead of landing on one instant, the standard production fix.

A fourth named production technique, the Bloom filter (a probabilistic "definitely doesn't exist, don't even check the cache" pre-filter for penetration), is a further, distinct fix beyond negative caching — named here, not simulated.

---

## Internal State

Cached entries, up to capacity — each with its own effective TTL (see TTL Jitter).

A separate, much smaller table of confirmed-nonexistent keys and when that confirmation expires — populated and consulted only when Negative Caching is on.

Bounded concurrency and queue, same as any other processing entity.

Under Coalesced stampede protection: which keys currently have a fetch in flight, and which requests are waiting on each one.

---

## Incoming Events

Request arrived (look up the key — or, for a key already confirmed nonexistent under Negative Caching, answer "not found" immediately without a downstream trip at all).

Response returning from downstream after a miss (store it, then continue responding — or, for a request targeting a nonexistent key, record the negative result instead and respond "not found").

---

## Outgoing Events

Cache hit / cache miss — a coalesced miss, a negative-cache hit, and a miss for a confirmed-nonexistent key are each tagged distinctly, on top of whether it was also an outright expiry.

Forward request downstream (on a miss that isn't coalescing onto an existing fetch and isn't already answered from the negative cache).

Forward response back toward its origin, including to every request that coalesced onto a shared fetch.

---

## Configuration

Capacity — distinct keys the cache can hold before it must evict one.

Eviction Policy — LRU, LFU, FIFO, or MRU.

TTL — how long an entry stays valid after being stored (0 = never expires on its own).

TTL Jitter — randomizes each entry's own TTL by up to this fraction above/below TTL, so entries cached together don't all expire together (see Cache avalanche above).

Stampede Protection — Naive or Coalesced (see Cache stampede above).

Negative Caching — Off or On, plus Negative Cache TTL (see Cache penetration above).

(On the Client: Missing Key Rate — fraction of traffic targeting a permanently nonexistent key, what Negative Caching protects against.)

---

## Metrics

Hit rate.

Under a miss: independent fetches vs. coalesced (avoided) fetches, so Stampede Protection's effect is something a student can see, not just a setting they toggled.

Under a miss for a nonexistent key: downstream round trips vs. negative-cache hits (avoided), so Negative Caching's effect is equally visible.

Under an expiry-driven miss: how many, and the largest number that landed within the same 100ms window — the quantified size of an avalanche's "wave," so TTL Jitter's effect is visible too, not just described.

---

## Learning Goal

The lesson isn't "use Redis." It's that repeated, identical work is wasteful — a cache only pays off when the same data is requested often enough to be worth remembering. All three failure modes are directly triggerable and observable here. Cache stampede: keep TTL low relative to traffic on a hot key, run it under Naive and watch downstream fetches spike with every expiry, then switch to Coalesced and watch that spike flatten. Cache penetration: give the Client a nonzero Missing Key Rate, run it with Negative Caching off and watch every lookup for the same missing key hit downstream again, then switch it on and watch those repeats get absorbed instead. Cache avalanche: cache a batch of keys around the same moment with TTL Jitter at 0% and watch them expire as one synchronized burst later, then raise Jitter and watch that burst spread out.

---

# CDN

## Purpose

The CDN is a cache with geography: several independent edge caches, each closer to some users than a single origin server could be, falling through to the origin on a miss.

---

## Engineering Concept

Same cache-aside idea as Cache, replicated across edges.

The User and the Origin are real, placeable points on a schematic (not geographic) 0–100 plane, dragged directly on the Edge Map — not just an assertion that "closer is faster." Edges sit at fixed, auto-arranged positions on the same plane (evenly spaced on a ring; not independently placeable, so the diagram stays readable at a glance). Where the User pin sits drives two things directly: each edge's latency-to-user is that edge's real distance to the pin, linearly mapped into [Min, Max] Edge Latency — and which edge answers a given request is proximity-weighted (each edge's share of dispatches is proportional to `1 / distance` from the pin, expanded into a repeating sequence and cycled the same deterministic way Load Balancer's Weighted Round Robin already works). The nearest edge doesn't just answer faster — it answers *more often*, and so builds a hotter cache too, a second, compounding benefit of proximity.

This replaced an earlier design where a request's edge was chosen by hashing its content key, so the same key always landed on the same edge — mirroring real anycast/geo-DNS stickiness. That's a real, deliberate tradeoff of the pin-based model: a given key can now land on different edges across requests, since routing no longer depends on the key at all. In exchange, "proximity decides" becomes a literal, draggable fact instead of a fixed, evenly-spread number.

The Origin pin's position is context for the diagram — *why* a miss costs what it costs — not a second latency model. The miss path's actual simulated travel time still comes from the downstream graph connection's own configured latency, same as every other entity's downstream hop.

Each edge has its own latency-to-user (closer edges are faster) and its own independent cache — content warmed at one edge isn't visible at another, exactly like real CDN edges.

More edges mean better worst-case latency, since some user is always closer to *an* edge. But each edge caches independently, so splitting the same traffic across more edges can mean each one is individually colder. Proximity and hit rate pull in different directions — a CDN is a bet that proximity wins.

This CDN is implicitly **pull**-only — content is fetched into an edge on demand, the first time it's asked for there. Real CDNs can also **push** content to every edge ahead of any request, for known high-demand releases (a new show, a game patch) — pre-positioning content before the first user ever asks for it. Not simulated here.

**Invalidation strategy** — TTL is the strategy this entity actually simulates: an entry expires and gets re-fetched. Two other named strategies aren't simulated, for different reasons. Explicit purge (an operator actively evicts a key everywhere, on demand) would need a scheduled/timer event capability this engine doesn't have — every entity here is purely reactive to events a request actually generates, and no entity self-schedules a free-running clock independent of traffic. Versioned keys (a new release gets an entirely new key, so nothing needs invalidating — the old key just goes cold and ages out) need *no* special support at all: it's already exactly what happens the moment traffic shifts to a new key, since each key is already an independent cache entry. That's the course's own punchline — cache versioning beats invalidation — made literal by what this entity already does without being told to.

---

## Internal State

N independent edge caches, each with its own entries and its own distance-to-user latency. A proximity-weighted routing sequence and cursor, rebuilt whenever the User pin moves.

---

## Incoming Events

Request arrived (route it proximity-weighted to an edge, look it up there).

Response returning from the origin after a miss (store it at the edge that missed, then continue responding).

---

## Outgoing Events

Cache hit / cache miss, per edge.

Forward request to the origin (on a miss).

Forward response back toward its origin.

---

## Configuration

Edge Count — how many geographically distributed edges the CDN operates.

Min / Max Edge Latency — one-way latency to the nearest and farthest edge (nearest/farthest determined by real distance to the User pin).

User / Origin position — set by dragging their pins directly on the Edge Map (or the numeric X/Y fields beneath it), not through the generic config field list — the same reasoning Load Balancer's per-target Weights use for a bespoke Inspector control instead of a schema field.

Capacity, Eviction Policy, TTL — same knobs as Cache, applied per edge.

---

## Metrics

Per-edge hit rate, request count, and miss count.

---

## Visualization

An interactive schematic plane — not a real map — with the User and Origin as real, draggable pins and edges at fixed, auto-arranged positions. Request count and hit rate are printed under every edge rather than hidden behind hover; any edge with at least one miss gets a visible line back to the Origin pin (opacity scaled by that edge's miss count), so a miss reads as a round trip, not just a colder dot. As playback plays or scrubs, whichever edge the CDN's most recent request landed on pings live — green for a hit, red plus a brightened Origin line for a miss. Dragging the User pin updates both the per-edge latency numbers and the routing weights live, so "proximity decides" is something a student does, not just reads. Plus a measured "with vs. without this CDN" latency comparison, so the CDN's benefit is demonstrated rather than asserted.

---

## Learning Goal

Latency is partly a physics problem, not just a capacity problem. No amount of server scaling fixes a request that has to travel halfway around the world — proximity does. Now literal: drag the User pin toward an edge and watch that edge's latency drop *and* its hit rate climb, at the same time — proximity wins twice.

---

# Message Queue

## Purpose

The Message Queue buffers work between a producer and one or more downstream consumers, so the two can run at different speeds — and, depending on Delivery Mode, so a message reaches either exactly one consumer or every subscriber.

---

## Engineering Concept

Not every request needs an immediate answer.

A message queue replies the instant a message is durably admitted — accepted into the queue, or picked up right away — regardless of whether a consumer is free yet. Producers never wait on consumers.

It then dispatches to its downstream consumer(s) as a separate, independently-simulated request under the same request id: same visual packet, decoupled outcome. That second leg is a real request/response — the downstream entity reacts to it with full capacity checks and real latency, and it ends the same way any other request does, just addressed back to the queue instead of the original client.

Backpressure doesn't have to mean "reject immediately." A queue trades that for "reject only once the buffer itself is full," absorbing bursts a downstream consumer alone couldn't keep up with — at the cost of the consumer seeing work later than the producer sent it.

The course treats point-to-point and pub-sub as two architecturally different tools, not two settings of the same tool. Delivery Mode models both as one comparable config axis, the same pattern used for Load Balancer's algorithms:

- **Queue (point-to-point, the default)** — a single shared consumer pool competes for each message; only the first downstream connection ever receives anything, and each message goes to exactly one consumer. A task queue.
- **Topic (fan-out / pub-sub)** — every downstream connection is treated as an independent subscriber with its own consumer pool (sized by the same Consumer Count / Max Queue Length config, applied per subscriber). Every subscriber gets its own copy of every message. Admission to the topic itself is never gated by any subscriber's backlog — there's no shared backlog to overflow, which is the core decoupling pub/sub buys over point-to-point. A slow subscriber only ever drops its own copy; it never blocks the publish or any other subscriber. The flip side: fan-out multiplies dispatch load by subscriber count for the same producer rate, so a topic backs up faster than a queue unless capacity is sized for that.

---

## Internal State

The backlog of messages waiting for a free consumer — one shared backlog under Queue mode, one independent backlog per subscriber under Topic mode.

Consumers currently dispatching a message.

---

## Incoming Events

Request arrived (admit it — under Queue mode, reject if the shared backlog is full; under Topic mode, always admit, then offer each subscriber its own copy).

Dispatch complete (a consumer finished handing a message off; pull the next one off that backlog if any is waiting).

---

## Outgoing Events

Acknowledge the producer, immediately on admission.

Queue full (rejection) — under Topic mode, scoped to whichever one subscriber fell behind, never the publish itself.

Dispatch to the downstream consumer(s), each as its own independent request.

---

## Configuration

Delivery Mode — Queue (point-to-point) or Topic (fan-out / pub-sub).

Consumer Count — consumers pulling messages off the backlog at the same time (per subscriber, under Topic).

Max Queue Length — messages the backlog can buffer once every consumer is busy, before rejecting new ones (per subscriber, under Topic).

Dispatch Time — time a consumer takes to pick up and hand off one message.

---

## Metrics

Under Topic mode: per-subscriber delivery counts (reusing the same distribution view Load Balancer and Replica Pool use), so fan-out is something a student can see, not just a setting they toggled.

---

## Learning Goal

Decoupling "accepted the request" from "finished the request" is how systems absorb traffic spikes without falling over. Queue vs. Topic is a real architectural choice, not a tuning knob: a work queue distributes work once across a pool; a topic broadcasts to everyone who cares. Kafka's partition/consumer-group replay model — a further, distinct layer over pub-sub — isn't simulated here.

---

# Reverse Proxy

## Purpose

The Reverse Proxy routes each request to a specific downstream service based on a named route, not to any of several interchangeable replicas of the same service.

It has no capacity of its own, same as the Load Balancer.

It makes an instant routing decision and forwards.

---

## Engineering Concept

Load Balancer and Reverse Proxy sit in the same spot in a graph and are easy to conflate, but they solve different problems: Load Balancer spreads identical work across a homogeneous pool — any target can serve any request. Reverse Proxy sends different kinds of work to different, heterogeneous destinations — an API-gateway / nginx `location` block pattern, `/orders` to the Orders service, `/users` to the Users service.

Real reverse proxies route on the actual HTTP request path. This engine has no path-shaped request data — every request only carries a `key` (a resource id, deliberately skewed so a Cache has something to hit on) — so routing needed its own, independent request dimension: `RequestLifecycleMetadata.route`, drawn uniformly from a small fixed pool of realistic-looking service names (`TrafficGenerator.ROUTE_LABELS`) via the Client's Route Pool Size config. A documented substitution for a real path, the same way Load Balancer's IP Hash substitutes `key` for a real client IP.

Routes live on the Reverse Proxy's own config (target entity id → the one route label that target owns) — Local Knowledge, same reasoning as Load Balancer's weights: a proxy can't know what a target serves except what an operator tells it. A target with no configured route, or a route that never matches, simply never receives traffic. A target explicitly configured as the catch-all (`*`) receives whatever no other target's specific route claimed, mirroring nginx's `default_server`.

---

## Internal State

None beyond its own config — no cursor, no counters, no per-target bookkeeping. Every routing decision is a stateless lookup against the configured routes table.

---

## Incoming Events

Request arrived (match its route against the routes table, forward or fail).

Response passing through (forward back toward its origin, unchanged).

---

## Outgoing Events

Route request to the target that owns its route.

No matching route (rejection) — when no target's specific route matches and no target is the catch-all.

Forward a response back toward its origin.

---

## Configuration

Routes — per downstream target, the one route label it owns, or the catch-all (`*`).

(On the Client: Route Pool Size — how many named services traffic is spread across, uniformly.)

---

## Metrics

Per-target request distribution — how many requests each downstream target actually received (same view Load Balancer and Replica Pool use).

---

## Learning Goal

Routing and load-spreading are different problems that happen to sit in the same spot in an architecture. A Load Balancer with enough config sections could theoretically also do path-based routing, but bolting it on would blur exactly the line Single Responsibility exists to keep sharp. Two entities, two jobs, composable in the same graph — often a Reverse Proxy sits in front of several Load Balancers, one per service, not the other way around.

---

# Kafka

## Purpose

Kafka is a durable, partitioned log — a genuinely different storage model from Message Queue's transient in-memory buffer, not just another delivery-mode toggle on it.

---

## Engineering Concept

The topic is split into partitions. A message's partition is a deterministic hash of its key — the same hash CDN uses for key→edge and Load Balancer's IP Hash uses for key→target — so every message for a given key always lands in the same partition. That's the real ordering guarantee, made concrete: strict order *within* a partition, no ordering promise *across* partitions.

Every downstream connection is an independent consumer group — same fan-out shape as Message Queue's Topic mode, each with its own consumer pool and backlog. What's different: a group's *useful* parallelism is capped at `min(consumers configured for that group, partition count)` — a consumer beyond the partition count has no partition left to read and sits idle. This is the single most commonly cited Kafka fact, made directly measurable rather than just asserted.

The producer is acknowledged the instant a message is durably admitted to the log — never gated on any consumer group's readiness, and recorded (as a partition assignment) even before any consumer group is connected. Stronger decoupling than Message Queue's Topic mode, since there's no shared backlog to overflow at all, only each group's own.

**What's deliberately not simulated:** replay (a consumer group joining later and reading from an earlier offset) and true unbounded retention. Every consumer group configured on the graph exists from the start of the run and reads the live stream. A group that falls too far behind has its own dispatch rejected — a bounded-backlog stand-in for consumer lag against a retention window, the same simplification Message Queue's Max Queue Length already makes for backpressure elsewhere.

---

## Internal State

Which partition each message hashed to (recorded as a diagnostic marker, independent of consumer state).

One independent consumer pool and backlog per consumer group (downstream connection) — never shared across groups.

---

## Incoming Events

Request arrived (hash its key to a partition, acknowledge the producer immediately, then offer every connected consumer group its own copy).

Dispatch complete (a consumer group's consumer finished handing a message off; pull the next one off that group's own backlog if any is waiting).

---

## Outgoing Events

Partition assignment (diagnostic marker — which partition a message landed in).

Acknowledge the producer, immediately on admission.

Queue full (rejection) — scoped to whichever one consumer group fell behind, never the publish itself.

Dispatch to each consumer group, each as its own independent request.

---

## Configuration

Partition Count — how many partitions the topic is split into; also the ceiling on any one group's useful parallelism.

Consumers per Group — consumers each connected consumer group runs; capped in effect at Partition Count.

Max Queue Length — messages a group's own backlog can buffer before that group starts rejecting, independent of every other group's.

Dispatch Time — time a consumer takes to pick up and hand off one message.

---

## Metrics

Partition Distribution — how many messages hashed to each partition.

Consumer Group Distribution — how many messages each consumer group received (reusing the same distribution view Load Balancer, Replica Pool, and Reverse Proxy use).

---

## Learning Goal

Partition count is one decision that trades ordering against parallelism for every consumer group at once — more partitions, more room for consumers to work in parallel, but ordering is only ever guaranteed within one partition, never across them. Consumer groups are genuinely independent: one group falling behind never touches another's backlog, since each reads the same durable log at its own pace.