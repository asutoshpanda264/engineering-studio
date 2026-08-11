# PRIMER-GAP.md

# Closing the Gap with system-design-primer

> This is a planning document only. Nothing here is implemented yet — it
> exists to lay out *what* needs to change and *why*, so the work can be
> picked up one piece at a time without re-deriving the reasoning.
>
> Scope: this doc covers three of the four gaps identified when comparing
> Engineering Studio against
> [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer):
>
> - **Part A** — deepen the 3 existing scenario write-ups
> - **Part B** — build the scenarios that are catalogued but not implemented
> - **Part C** — add new entities/topics the primer covers that we don't
>
> **Explicitly out of scope here:** documenting the 4 entities that are
> implemented but undocumented (`APIServer`, `CircuitBreaker`,
> `RateLimiter`, `ReplicaPool`). That's a smaller, self-contained task
> deferred by choice, not forgotten — see the note at the end.

---

# Why this gap exists

The primer teaches through **written exposition**: read a topic, read a
worked solution, memorize with Anki. Engineering Studio teaches through
**consequence**: build it, run it, watch it fail, fix it
([[philosophy.md]]). That difference is the whole point of this project
and isn't something to close.

What *is* a real gap: the primer's worked solutions (e.g. the
[Pastebin design doc](https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md))
carry a written reasoning trail — capacity estimates, why this component
before that one, what the numbers actually say — that our scenarios
currently skip in favor of jumping straight to "here's the starting
graph, here's the pass/fail bar." The simulation *proves* the numbers;
we just don't *narrate* them anywhere. And the primer's topic list is
simply wider than our entity roster. Both are closeable without
compromising the "consequences, not lectures" thesis — if anything,
narrating the reasoning *after* a run (not before) is more in line with
[[philosophy.md]]'s "Reflection is where learning occurs" than the
primer's upfront-exposition style is.

---

# Part A — Deepen the 3 existing scenario write-ups

**Scenarios:** `movieTicketBooking.ts`, `flashSale.ts`, `urlShortener.ts`
(`src/scenarios/`).

## What each one already has

All three follow the `Scenario` type (`src/scenarios/types.ts`) faithfully:
`story` (2–4 sentences, technology-free), a deliberately undersized
`startingEntities`/`startingConnections` graph, `constraints`
(success-rate + p95 latency thresholds), Socratic `hints`, and
`learningGoals`. Each file's header comment even records the *measured*
failure rate at its seed (e.g. "fails at ~88% success, verified against
the real engine") — so the reasoning trail exists in code comments, just
not anywhere a user sees it.

## What's missing, mapped to the pastedbin doc's structure

| Pastebin doc section | Our equivalent today | Gap |
|---|---|---|
| Use cases & constraints | `story` (prose only) | No explicit traffic/user assumptions a student can check their own reasoning against |
| **Capacity estimation** (QPS, storage, bandwidth math) | None | Biggest gap. The header comments quote a measured failure rate, but never show *how you'd predict that from the numbers before running it* — which is the actual skill the primer's math teaches |
| High-level design diagram | The canvas itself, live | Already better than the primer here — ours is interactive, not a static image |
| Component design (schema, API shape, algorithms) | None | e.g. URL Shortener never discusses key generation/hashing even though `Client.keyPoolSize` already models a key space |
| Scaling discussion | `hints` (Socratic, deliberately vague) | Intentional per [[scenarios.md]] ("Bad Hint: Add Redis. Good Hint: which component is doing repeated work?") — **do not** import the primer's directness here, this is a real design choice, not an oversight |
| Reflection / what happened & why | None post-run | [[scenarios.md]] §5 "Reflection" is speced but never built for any scenario |

## Proposed shape of the fix

Add a new, optional field to each scenario — a **post-run reflection**,
not upfront exposition, to stay consistent with "consequences teach
more than instructions":

1. **Capacity estimation as a pre-flight exercise, not a lecture.** Add
   a short "estimate before you run" prompt to each scenario (e.g.
   "Client sends 150 req/s, each DB query takes 40ms, connection pool =
   4 — how many requests/sec can that pool actually drain?"), answerable
   with arithmetic the student already has. This is the primer's
   capacity-estimation habit, reframed as prediction-before-observation
   rather than exposition — a closer fit to [[philosophy.md]] than
   copying the primer's format verbatim would be.
2. **A `reflection` field on `Scenario`** (types.ts) — populated *after*
   a run, referencing the actual measured metrics, not a canned
   explanation. Likely needs a small template system (e.g.
   `"{{bottleneckEntity}} hit {{utilization}}% utilization while
   {{downstreamEntity}} stayed under {{otherUtilization}}%"`) rather than
   static prose, so it stays honest to the specific run's seed/config
   instead of drifting from what actually happened — same spirit as the
   CDN "Why This Helps" comparison feature already does for architecture
   trade-offs.
3. **Component-design footnotes** — one or two sentences per scenario
   tying its config to a real-world analog (URL Shortener's `keyPoolSize`
   ↔ Base62 key space; Movie Ticket Booking's DB `maxConnections` ↔ a
   real connection pool size you'd actually configure). Prose, lives
   next to `learningGoals`, no new engine work.
4. **Where this content lives:** extend `docs/scenarios.md`'s per-scenario
   entries (currently just Story/Difficulty/Concepts/Challenge, ~10 lines
   each) rather than the `.ts` files — keeps runnable config and
   pedagogical narrative in separate places, matching this project's
   existing UI/domain/simulation layering discipline.

**Effort:** low. No simulation engine changes, no new entity types — this
is docs + one small `Scenario` type addition + a light templating helper.

---

# Part B — Build the missing scenarios

## Current state of the catalogue

`docs/scenarios.md` lists 7 scenarios; only 3 have a `src/scenarios/*.ts`
file. **Ride Sharing, Video Streaming, Banking System** are catalogued
(story, difficulty, concepts, challenge) but not implemented — no
`startingEntities`, no constraints, not selectable in the Workshop.

## Feasibility triage (do this before writing any scenario code)

Each scenario needs to be checked against what the engine can *actually*
simulate today — building one whose "challenge" secretly requires an
unbuilt entity just produces a scenario that can't be solved.

| Scenario | Needs (beyond Client/API/DB/LB/Cache/CDN/Queue) | Feasible now? |
|---|---|---|
| **Ride Sharing** | Real-time/continuous location updates, geospatial queries, partitioning by region | **Not feasible as catalogued.** The engine has no geospatial or continuous-update primitive — every entity here reacts to discrete request/response events, nothing self-schedules on a free-running clock independent of traffic (this exact constraint is already called out in [[Entities.md]]'s CDN section re: invalidation). Ride Sharing as written needs new engine capability, not just new entities — belongs in Part C's "assess feasibility" step, or needs a redefinition of the scenario's challenge to something event-driven (e.g. model location pings as a very high-frequency Client request stream instead of true continuous state) |
| **Video Streaming** | CDN with bandwidth/large-payload modeling, not just latency | **Mostly feasible.** CDN entity exists and already models edge proximity + hit rate. Gap: no bandwidth/payload-size dimension — everything today is modeled as latency-only, not bytes-transferred. Scenario could ship using latency as a proxy, with a documented simplification note (matching the project's existing pattern, e.g. Database's SQL/NoSQL multiplier) rather than blocking on a new bandwidth model |
| **Banking System** | Transactions, ACID consistency, replication correctness | **Not feasible as catalogued.** "Money must never disappear" implies a correctness check the engine doesn't have — nothing today verifies exactly-once semantics or transactional atomicity across entities. Would need either (a) a new consistency-focused entity from Part C first, or (b) redefining the scenario's constraint to something the engine *can* check (e.g. success rate under concurrent writes to the same key, using Database's existing connection-pool contention as a stand-in for a lock) |

## Primer's own scenario list, for reference

The primer's 8 worked problems are broader than our "Future Directions"
list in places and narrower in others:

1. Pastebin/Bit.ly (→ closest analog: our **URL Shortener**, already built)
2. Twitter timeline & search (→ listed in our Future Directions as
   "Social Media Feed" — not started)
3. Web crawler (→ not in our catalogue or Future Directions at all — a
   real gap if breadth matters)
4. Mint.com / data sync (→ not covered)
5. Social network data structures (→ overlaps "Social Media Feed")
6. Key-value store / search cache (→ closest to our **Cache**/CDN entity
   docs, not a scenario)
7. Amazon sales ranking (real-time ranking) (→ not covered)
8. Scale-to-millions-of-users overview (→ this is closer to what
   **Flash Sale** already teaches)

Worth deciding deliberately whether "Web Crawler" and "Sales Ranking"
join the catalogue — they're primer staples we currently have no analog
for, feasible or not.

## Recommended order

1. **Video Streaming** first — smallest new-capability gap (CDN already
   exists), ships with a documented latency-as-bandwidth-proxy
   simplification.
2. **Ride Sharing** and **Banking System** — hold until Part C determines
   whether the entities they actually need (geospatial/continuous-update
   primitive; a consistency-checking entity) are worth building, or
   whether the scenario's challenge should be redefined to fit what the
   engine already does well.

**Effort:** Video Streaming — medium (new scenario file + CDN payload-size
config, if that dimension gets added). Ride Sharing / Banking System —
blocked on Part C decisions, don't estimate yet.

---

# Part C — New entities/topics

Using [[Entities.md]]'s own 5-question framework (What am I? / What do I
know? / What can happen to me? / What can I do? / What should users
learn?) as a lightweight spec for each candidate, so picking one up later
doesn't require re-deriving its shape.

## Candidates, ranked by how directly they close a primer gap

### 1. Replication (promote `ReplicaPool.ts` from implemented-but-invisible to a taught concept)
Already exists in code, unlike the others below — this is the cheapest
win in Part C, closer in effort to Part A/documentation work than to a
new-entity build.
- **What am I?** A set of read replicas behind a primary, keeping copies
  of the same data.
- **Engineering concept:** reads scale horizontally, writes don't (single
  primary). Replication lag is the real cost — a replica can serve
  slightly stale data.
- **Feasibility:** high — `ReplicaPool.ts` already exists; this is
  primarily an [[Entities.md]] documentation task plus checking whether
  its current implementation actually models lag or just distributes
  reads (needs a code read before spec'ing further).

### 2. Sharding / Partitioning (as an explicit, teachable mechanism — not just Database's NoSQL multiplier)
- **What am I?** Multiple Database instances, each owning a disjoint
  key range or hash bucket.
- **Engineering concept:** [[Entities.md]]'s own Database section already
  says NoSQL's multiplier "is closer to what selecting NoSQL represents
  here than a literal simulated shard map" — this entity would *be* that
  literal shard map. Directly teaches the primer's "Federation" +
  "Sharding" sections.
- **Local Knowledge concern:** something upstream (Load Balancer? a new
  "Shard Router") needs to decide which shard owns a key —
  same deterministic key→target hashing pattern already used by CDN
  (key→edge) and Load Balancer's IP Hash. Likely reuses that existing
  primitive rather than inventing a new one.
- **Feasibility:** medium — no new engine capability needed, just a new
  entity that composes the hashing pattern already proven twice.

### 3. Consistency / Replication Lag as a first-class, observable metric
- **Engineering concept:** the primer leans hard on CAP theorem
  (consistency vs. availability). Currently no entity in this codebase
  exposes a consistency knob at all — every entity is implicitly
  strongly consistent.
- **Design tension to resolve before building:** [[Entities.md]]'s
  Deterministic Decisions principle requires identical state + config +
  events → identical behavior. Modeling "eventual consistency" means
  modeling *staleness as a function of replication lag*, which is
  straightforward (a replica read returns data from `now - lagMs`
  rather than `now`) — but designing what a student actually *observes*
  when consistency is violated (a stale read, made visible, not just
  asserted) needs real design work, not just a config flag. This is the
  one entity in this list that's genuinely a design problem, not just an
  implementation one — plan a dedicated design pass before writing code.
- **Feasibility:** medium-low — needs the design pass above before
  implementation estimate is meaningful. This is what Banking System
  (Part B) is actually blocked on.

### 4. DNS
- **Engineering concept:** the very first hop of every request; the
  primer opens with it. Teaches nothing this engine doesn't already
  imply (a request "just arrives" at Client today), so value is mostly
  completeness/parity with the primer rather than a new lesson.
- **Feasibility:** low priority — thin educational payoff for the
  modeling effort (would mostly be a fixed-latency pass-through node),
  unless framed around something with real behavior, e.g. DNS-based
  geo-routing as an alternative to CDN's pin-based proximity routing.
  Recommend deprioritizing below the other three.

### 5. Security / TLS
- Primer covers this narrowly (symmetric/asymmetric encryption, SSL
  termination point). Given [[philosophy.md]]'s "one exceptional
  simulation teaches more than twenty shallow ones," this is the weakest
  candidate — TLS handshake overhead could be a config multiplier
  somewhere (Load Balancer? Reverse Proxy?) but doesn't obviously teach
  a *decision* the way every other entity does. Recommend leaving this
  out unless a concrete teaching angle turns up.

## Recommended build order for Part C

1. **Replication** — cheapest, already half-built, unblocks nothing but
   itself.
2. **Sharding/Partitioning** — reuses proven hashing pattern, directly
   closes a primer topic, no design ambiguity.
3. **Consistency/Replication Lag** — do the design pass first; this one
   unblocks Banking System (Part B) once resolved.
4. DNS, Security — deprioritized, revisit only if a concrete teaching
   angle emerges.

---

# Sequencing across all three parts

```
Part A (deepen 3 scenarios)          ─── independent, start anytime
                                          ↓ low risk, no dependencies

Part C.1 Replication                 ─── independent, start anytime
Part C.2 Sharding                    ─── independent, start anytime

Part B: Video Streaming              ─── can start now (CDN already exists)

Part C.3 Consistency (design pass)   ───┐
                                         ├──→ Part B: Banking System
Part C.1 Replication (done first)   ───┘

Part B: Ride Sharing                 ─── blocked until a decision is made
                                          on continuous-update/geospatial
                                          capability (bigger than a single
                                          entity — may need an engine-level
                                          conversation, not just a new file)
```

**Suggested actual starting point:** Part A (all 3 scenarios) + Part C.1
(Replication) in parallel — both are low-risk, no-new-engine-capability
work that unblocks everything downstream.

---

# Deferred: the 4 undocumented entities

Not part of this doc's scope by the user's own call, but flagged here so
it isn't lost: `APIServer.ts`, `CircuitBreaker.ts`, `RateLimiter.ts`,
`ReplicaPool.ts` are implemented with zero [[Entities.md]] write-up.
`CircuitBreaker` is the most urgent of the four — [[Entities.md]]'s own
Load Balancer section already tells users to compose it in
("*put a Circuit Breaker in front of each target*") without the entity
it's pointing to having a page of its own. Small, self-contained,
doesn't block anything above — good filler task whenever one is needed.
