# LEARNING-PARITY.md

# Closing the Gap: Studio vs. Course

> Someone who only plays with Engineering Studio should learn the same things as someone who only read the course chat.

---

# Purpose

This document tracks where Engineering Studio's entities fall short of the
depth taught in the source System Design course, and what closes each gap.

It exists because a gap analysis was run — comparing the course chat
lesson-by-lesson against every built entity — and found real, specific
shortfalls. This is the working checklist for closing them.

Read `ENTITIES.md` first. This document assumes you know what each entity
currently does.

---

# Source

The course: a shared Claude.ai conversation, "Chapter 1 beginning."
61 lessons across 6 phases. As of this audit, the course has taught
**Lessons 1–18** (Phase 1 — Foundations, still in progress).

Only lessons the course has actually reached are in scope below. Lessons
the course hasn't taught yet can't be checked for alignment — see
**Built Ahead of the Course** at the end.

---

# Principle

Every gap below is a place where the course teaches 2–5 named variants,
patterns, or failure modes, and the Studio currently teaches fewer.

The fix is not always new simulation mechanics. Often the fastest, cheapest
close is naming the missing concept in `entityEducation.ts` or
`docs/Entities.md` even before it's simulated — a student should never learn
less from the tool than from the text describing the tool.

Where a gap *is* worth simulating, prefer the existing pattern already used
for algorithm-comparison entities (Load Balancer's Round Robin vs. Least
Connections): ship two comparable options, not one hardcoded default.

---

# Database

Course: `Lessons 8–11` — Databases, SQL Deep Dive, NoSQL Deep Dive, Indexing.

## Gap

ACID, indexing mechanics (B-trees, composite index order, when an index
silently stops being used), and NoSQL's four internal types (Document,
Key-Value, Column-Family, Graph) never surface anywhere — not in simulated
behavior, not in education text. The SQL/NoSQL toggle is a single multiplier
with no acknowledgment of what it's standing in for.

## Tasks

- [x] Name ACID explicitly in `entityEducation.ts`'s Database entry — what
      it means, and which parts this simulation does and doesn't enforce
- [x] Name indexing explicitly as the thing "Processing Time" abstracts over
- [x] Note NoSQL's four real subtypes (document, key-value, column-family,
      graph) in `entityEducation.ts` — one generic "nosql" profile is still
      what's simulated, but the vocabulary is no longer silently absent
- [x] Point to Replica Pool from Database's own "read replicas" mention in
      `entityEducation.ts`, now that it's no longer purely hypothetical
- [x] Name the four NoSQL subtypes in the Database Type field's description
      in `entityConfigSchema.ts` too, not just the Inspector's education
      panel — the field description a student sees while actually
      choosing SQL vs NoSQL now names document/key-value/column-family/
      graph and says explicitly that this simulation collapses all four
      into one profile, not just the education panel reached separately

## Definition of Done

A student reading Database's Inspector panel recognizes ACID, indexing, and
NoSQL's four types as named concepts — even where the simulation
deliberately simplifies them. **Met.** **Section closed.**

---

# Load Balancer

Course: `Lesson 13` — Load Balancers.

## Gap

The course teaches 5 algorithms (Round Robin, Weighted Round Robin, Least
Connections, IP Hash, Least Response Time), active/passive health checks,
Layer 4 vs. Layer 7, and that the load balancer itself is a single point of
failure needing its own redundancy. The Studio ships 2 algorithms and
nothing else.

## Tasks

- [x] Add Weighted Round Robin as a third algorithm — reuses the existing
      round-robin cursor, cycled over a target sequence expanded by each
      target's configured `weights` entry instead of the bare downstream
      list. Weights live on the Load Balancer's own config (Local
      Knowledge — it can't know a target's own "capacity"), edited via a
      new per-target Inspector section (`LoadBalancerWeightsSection`)
      since `ENTITY_CONFIG_SCHEMA` has no notion of one field per graph
      edge. Observable via the existing Request Distribution section. See
      `LoadBalancer.ts`, `entityConfigSchema.ts`, `InspectorPanel.tsx`
- [x] Note Layer 4 vs. Layer 7 in `entityEducation.ts`, even without
      simulating the distinction (the Studio's Load Balancer is implicitly
      Layer 7 — now says so)
- [x] Note the "load balancer is itself a SPOF" lesson in
      `entityEducation.ts` — common interview content the Studio previously
      never mentioned
- [x] Lower priority: IP Hash and Least Response Time as further
      algorithms. IP Hash hashes `meta.key` (the closest available stand-in
      for a client IP this simulation has, the same substitution CDN
      already makes) mod target count for session affinity — a shared
      `hashStringToIndex` extracted to `hashRouting.ts` once CDN's
      key→edge hash became a second real use case for it. Least Response
      Time tracks each target's response latency as an exponential moving
      average, with a periodic forced-round-robin "exploration" dispatch
      (`LEAST_RESPONSE_TIME_EXPLORE_EVERY`) so a target that loses one
      early, jitter-driven comparison doesn't go stale and lock out
      permanently — caught by a flaky-feeling test failure, not by
      inspection; a real correctness bug in the first pass, not just a
      test calibration issue. See `LoadBalancer.ts`.
- [x] Lower priority: health checks as a failure mode. **Decision:
      deferred, deliberately, not implemented.** Circuit Breaker already
      *is* this Studio's "detect a struggling target and stop routing to
      it" entity. Building a second, overlapping health-check state
      machine directly into LoadBalancer would duplicate Circuit
      Breaker's job and violate ENTITIES.md's Single Responsibility
      principle — the same reasoning that already keeps LoadBalancer from
      modeling its own capacity. The intended composition is
      architectural: put a Circuit Breaker in front of each target a
      LoadBalancer routes to. Documented in `LoadBalancer.ts`'s class doc,
      `entityEducation.ts`, and `docs/Entities.md` so the decision is
      visible, not silently dropped.

## Definition of Done

At least 3 algorithms are comparable side by side, and the education text
acknowledges L4/L7 and LB redundancy as real concepts even if unsimulated.
**Met** — all 5 course-named algorithms (Round Robin, Least Connections,
Weighted Round Robin, IP Hash, Least Response Time) are real, comparable,
and observable in the Inspector. Health checks are explicitly deferred
with reasoning, not silently missing — see above. **Section closed.**

---

# Cache

Course: `Lessons 14–15` — Caching, Redis Deep Dive.

## Gap

The course teaches 4 write strategies (Cache-Aside, Write-Through,
Write-Behind, Read-Through) and three named "production killer" failure
modes (Cache Stampede, Cache Penetration, Cache Avalanche), each with a
named fix. The Studio only implements Cache-Aside and has no equivalent for
any of the three failure modes.

This is the **highest-priority gap in the whole audit** — these failure
modes are the course's most practical, most memorable caching content.

## Tasks

- [x] Document Cache Stampede, Cache Penetration, and Cache Avalanche in
      `entityEducation.ts`, ahead of any being simulated
- [x] Simulate Cache Stampede: a new `stampedeMode` config axis
      (`naive`/`coalesced`, the same two-comparable-options pattern as
      Load Balancer's algorithms) — Naive lets every concurrent miss for a
      key independently re-fetch downstream; Coalesced makes the first
      miss the leader and has every other concurrent miss for that key
      wait on and share its result (request coalescing / single-flight).
      Observable via a new Inspector "Stampede" section (independent vs.
      coalesced misses) backed by `MetricsCollector`'s `cacheStampede`
      metric — see `Cache.ts`, `entityConfigSchema.ts`, `InspectorPanel.tsx`
- [x] Investigate whether Write-Through / Write-Behind belong as a second
      "strategy" config axis on Cache, mirroring Load Balancer's
      algorithm-comparison pattern. **Decision: deferred, deliberately,
      not implemented — this one doesn't cleanly fit the "cheap toggle"
      pattern the way Cache Stampede did.** Cache Stampede was a real
      comparable-options fit because both modes react to the exact same
      kind of event (a miss) the engine already models. Write-Through and
      Write-Behind are coordination protocols for a fundamentally
      different kind of request — a *write* — and this engine has no
      concept of a write distinct from a read anywhere: not in
      `RequestLifecycleMetadata`, not in the traffic generator, not in
      any entity's admission logic (Cache.ts's own class doc has said as
      much since before this audit). A config toggle that doesn't change
      simulated behavior would be worse than no toggle — it would *look*
      simulated and teach the wrong lesson. Doing this properly means
      modeling reads vs. writes as a first-class engine concept (Client,
      traffic generation, every downstream entity's request handling) —
      a foundational change with a blast radius well beyond Cache, and a
      legitimate future milestone in its own right, not a Cache-scoped
      add-on. Recorded here rather than silently dropped.
- [x] Name-drop Redis and Memcached explicitly in `entityEducation.ts` —
      the course's entire Lesson 15 is Redis-specific and the Studio's
      Cache previously never connected back to it
- [x] **Beyond the original stretch goal:** simulate Cache Penetration and
      Cache Avalanche too, not just name them — the same
      two-comparable-options pattern Stampede already established. Cache
      Penetration: the Client gets a `missingKeyRate` config generating
      traffic for a small, fixed pool of permanently nonexistent keys
      (`RequestLifecycleMetadata.exists`, `TrafficGenerator.assignPhantomKey`);
      Cache gets a `negativeCaching` toggle (off/on) that, on, caches the
      resulting "not found" so a repeat lookup for the same missing key is
      answered locally instead of hitting downstream again. Cache
      Avalanche: Cache gets a `ttlJitterPercent` config that randomizes
      each stored entry's own effective TTL (`CacheStore` now tracks TTL
      per entry, not one global value) so a batch cached together doesn't
      expire together. Both observable via new Inspector sections
      ("Penetration", "Avalanche") backed by `MetricsCollector`'s new
      `cachePenetration`/`cacheAvalanche` metrics (the latter includes a
      sliding-window "peak burst" count — the quantified size of an
      avalanche's wave). See `Cache.ts`, `CacheStore.ts`,
      `TrafficGenerator.ts`, `entityConfigSchema.ts`, `InspectorPanel.tsx`.

## Definition of Done

At minimum, all three failure modes and all four write strategies are named
and explained in the Studio, even if only one of each is simulated.
Stretch goal: Cache Stampede is directly triggerable and observable. **Met,
and exceeded** — all three failure modes (Stampede, Penetration, Avalanche)
are real, comparable config toggles with a measured before/after in the
Inspector, not just Stampede. Write-Through/Write-Behind as a config axis
was investigated and explicitly deferred (see above) — the investigation
itself is the deliverable this task asked for, and it's now resolved.
**Section closed.**

---

# Message Queue

Course: `Lessons 16–17` — Message Queues, Kafka Deep Dive.

## Gap

**The largest gap found in this audit.** The course treats "queue" and
"Kafka" as two lessons of comparable weight, because they're
architecturally different tools: Queue (point-to-point, one consumer per
message) vs. Topic (pub-sub, every subscriber gets every message). The
Studio only implements the Work Queue pattern — one of the course's five
named queue patterns — and has zero equivalent for partitions, consumer
groups, or replay, which the entire Kafka lesson is built around.

## Tasks

- [x] Add a delivery-model config to Message Queue: `deliveryMode`
      `"queue"` (point-to-point, unchanged default behavior) vs. `"topic"`
      (fan-out/pub-sub — every downstream connection is an independent
      subscriber with its own consumer pool, and gets its own copy of
      every message) — mirrors the Load Balancer precedent of shipping
      comparable algorithms. Observable via the Inspector's Request
      Distribution section (reused from Load Balancer/Replica Pool) under
      Topic mode, showing per-subscriber delivery counts. See
      `MessageQueue.ts`, `entityConfigSchema.ts`, `InspectorPanel.tsx`
- [x] Name Dead Letter Queue behavior in `entityEducation.ts` — the course
      calls it "non-negotiable" for production; the Studio still has no
      simulated equivalent, but the concept is no longer unmentioned
- [x] Name at-least-once delivery and idempotent consumers in
      `entityEducation.ts`
- [x] Longer-term: consider whether Kafka's partition/replay model is a
      distinct future entity rather than a Message Queue config toggle.
      **Decision: yes — a distinct future entity, not a MessageQueue
      toggle. Not built this pass.** Queue-vs-Topic was a clean toggle fit
      because both modes are variations on the same question ("who
      receives a message") over the same transient, in-memory buffer
      model MessageQueue already has. Partitions + consumer-group offsets
      + replay are a different *storage* model entirely — a durable,
      replayable log where messages aren't discarded on consumption,
      ordering guarantees are scoped per-partition, and independent
      consumer groups each track their own read position over the same
      retained data. None of that fits MessageQueue's current
      "admit → dispatch → done" lifecycle without changing what a message
      *is* to this engine, not just how many copies of it get made.
      Cramming it in as a third `deliveryMode` would strain one entity
      past Single Responsibility the way health checks would have
      strained LoadBalancer (see that section) — this is a real,
      separate future entity (something like a Kafka/EventLog entity),
      tracked here so the recommendation isn't lost.

## Definition of Done

A student using Message Queue understands that "queue" is one of (at least)
two fundamentally different delivery models, not the only one — whether
that's from a config toggle or from clearly-written education text. **Met**
— `deliveryMode` is a real, simulated, observable toggle, not just text.
Kafka's partition/replay model was considered and explicitly resolved as
future, separate-entity scope (see above), not silently left open.
**Section closed.**

---

# CDN

Course: `Lesson 18` — CDN (Content Delivery Network).

## Gap

Smallest gap of the five. The core lesson — physical distance is latency,
as physics, not just capacity — is not only present but demonstrated with a
measured before/after comparison the course itself never shows. Missing:
Pull vs. Push CDN, invalidation strategy choice, origin shield.

## Tasks

- [x] Note Pull vs. Push CDN in `entityEducation.ts` — the Studio is
      implicitly pull-only; now says so, and explains what push buys you
      (pre-positioning a release before any request) that pull can't
- [x] Lower priority: an invalidation-strategy config (TTL vs. explicit
      purge vs. versioned key). **Decision: TTL is what's simulated
      (unchanged); explicit purge and versioned key are named, not built,
      for two different reasons — not a uniform "not yet got to it."**
      Explicit purge would need a scheduled/timer event capability this
      engine doesn't have anywhere — every entity is purely reactive to
      events a real request generates, and introducing a free-running
      clock independent of traffic for CDN alone would be a new engine
      primitive, not a CDN-scoped config add. Versioned key needs *no*
      new simulation at all: a new release getting a new key is already
      exactly what happens today the instant traffic shifts to a
      different key, since every key is already an independent cache
      entry — the course's own punchline ("cache versioning beats
      invalidation") is demonstrated by what this entity already does,
      not by a toggle. Named and explained in `entityEducation.ts` and
      `docs/Entities.md`.

## Definition of Done

Pull vs. Push is named even if only Pull is simulated. Everything else here
is a stretch goal, not a requirement — CDN is already the strongest match.
**Met** — invalidation strategy investigated and resolved: TTL simulated,
explicit purge deferred (needs a timer primitive this engine lacks),
versioned key needs no new code (already how key-based caching behaves).
**Section closed.**

---

# Below the Simulated Layer

Course: `Lessons 1–7` — What is System Design, How the Internet Works,
Browser Request Lifecycle, Client-Server Architecture, DNS, HTTP/HTTPS,
REST APIs.

## Gap

These seven lessons are about protocols and network mechanics — DNS
resolution, TCP/TLS handshakes, HTTP methods and status codes, tier
architecture. Engineering Studio's stated philosophy is to simulate
**interactions between infrastructure components**, not protocols
underneath them. There is no entity-shaped way to represent "what happens
between typing a URL and a packet leaving your machine."

This is very likely the correct scope boundary — building protocol
mechanics into a component-level simulator would be a different product.
But it is a real gap against the stated goal ("same learning as the chat"),
and it should be an explicit, acknowledged non-goal rather than a silent
absence.

## Tasks

- [x] Add a short, non-interactive note — a docs page, an onboarding
      tooltip, or a line in the Workshop's empty state — acknowledging that
      DNS/TCP/TLS/HTTP happen below what's simulated here, before the first
      event a Client entity ever sees. Added as a third, visually
      de-emphasized line (border-top divider, smaller/subtler text) below
      the existing "Start building" empty-canvas message — seen once,
      before any node exists, never competing with the primary CTA. See
      `ArchitectureCanvas.tsx`; queued in `docs/BROWSER-CHECKS.md` for
      visual verification (light/dark theme, doesn't crowd the primary
      message, disappears once a node is dropped).
- [x] Do **not** attempt to simulate these as entities — held throughout;
      no protocol-mechanics entity was added anywhere in this pass

## Definition of Done

A first-time user is told, once, clearly, that Lessons 1–7's material lives
outside what they're about to interact with — not left to assume the tool
covers everything the course does. **Met.** **Section closed** (pending
routine browser verification, tracked in `docs/BROWSER-CHECKS.md`).

---

# Built Ahead of the Course

Three entities exist for lessons the course hasn't taught yet. They cannot
be checked for alignment until the course catches up — tracked here so
they aren't forgotten once it does.

- **Rate Limiter** — maps to `Lesson 47` (Phase 5, not reached). The course
  has only touched rate limiting in passing (a Redis pattern in `Lesson 15`,
  a queue-buffering pattern in `Lesson 16`) — never its own
  token-bucket-vs-sliding-window lesson, which the Studio already teaches
  more rigorously than the course has so far.
- **Circuit Breaker** — not a named lesson anywhere in the 61-lesson
  roadmap. Only implied under `Lesson 40` ("Reliability & Availability...
  failure modes"), not reached. Worth confirming the course ever teaches
  this explicitly.
- **Replica Pool** — read replicas are introduced briefly in `Lesson 12`
  (Scaling); a full treatment is scheduled for `Lesson 42`/`57`
  (Replication). The core idea already matches: writes to one leader, reads
  spread across replicas, lag as an acknowledged but unsimulated cost.

## Tasks

- [ ] Re-diff these three entities against the course once it reaches
      `Lesson 40`, `42`/`57`, and `47` — confirm terminology and framing
      stay consistent with how the course ends up teaching them

---

# Priority Order

1. ~~**Cache**~~ — **Closed.** Stampede simulated (`stampedeMode`);
   Write-Through/Write-Behind investigated and deferred with reasoning.
2. ~~**Message Queue**~~ — **Closed.** Pub-sub/fan-out simulated
   (`deliveryMode`); Kafka partition/replay resolved as future
   distinct-entity scope, not a toggle here.
3. ~~**Load Balancer**~~ — **Closed.** All 5 course algorithms simulated;
   health checks deferred in favor of composing with Circuit Breaker.
4. ~~**Database**~~ — **Closed.** ACID, indexing, and NoSQL's four types
   named in both `entityEducation.ts` and the config field itself.
5. ~~**CDN**~~ — **Closed.** Pull vs. Push named; invalidation strategy
   investigated — TTL simulated, explicit purge and versioned key deferred
   with distinct reasoning each.
6. ~~**Below the Simulated Layer**~~ — **Closed.** Onboarding note live in
   the Workshop's empty state.
7. **Built Ahead of the Course** — the only section still open, by design:
   revisit once the course reaches Lessons 40 / 42 / 47 / 57

---

# Definition of Done (this document)

Every checkbox above is either checked, or explicitly deferred with a
reason recorded in this file — not silently dropped.
