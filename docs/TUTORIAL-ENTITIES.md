# TUTORIAL-ENTITIES.md

# Rolling Out the Tutorial to Every Component

> Read this before touching `src/lib/tutorialPlanner.ts`, `TutorialPanel.tsx`,
> or anything under `src/app/tutorial/`.

---

# The short version

There is no per-component tutorial to "build" the way Client → API →
Database was built. That work already generalized: `/tutorial` picks its
steps from `TUTORIAL_RECIPES` (`src/lib/tutorialPlanner.ts`), one entry
per `EntityType`, and every entity already has one. Picking Cache, Load
Balancer, or Kafka from `TutorialPanel`'s picker already produces a real,
live-adapting walkthrough today — no new step-machine, no new overlay
code, no new page.

What's actually left is a **verification and refinement pass per
entity**, not new plumbing. This doc is the checklist for that pass, and
the reference for what to do if a future entity needs adding.

**Six real bugs already found this way, all fixed — read §1 before
trusting any recipe you haven't personally clicked through:**

1. Picking "API Server" with a Client → API → Database already on the
   canvas asked to delete the Database, just because the API recipe
   alone doesn't mention it — even though that Database was exactly
   where API's own story naturally continues, not clutter. Fixed by
   `extendsRecipe` (below): a node only counts as extraneous if no
   recipe in the whole table treats it as further progress past the
   current target.
2. Message Queue, Replica Pool, and Kafka's recipes ended *on* that
   entity with nothing wired downstream of it. All three fail every
   request they dispatch — for real, in the simulation engine, not a
   tutorial-engine bug — the instant `ctx.downstream` is empty (see
   `no_downstream_connection` in their own source files). The walkthrough
   was leading students to build something that's broken by
   construction. Fixed by giving each a real downstream in its own
   recipe (§1 below has the details).
3. Load Balancer's recipe (and, same root cause, Replica Pool's) ended
   with exactly one downstream target — a real, connected, non-broken
   architecture, but one that can't demonstrate the one thing the entity
   exists to teach: a *choice* between multiple downstream peers, reported
   live as "why does it just tell me to add one client, one server, and a
   load balancer — that's not how you'd actually use one." Fixed via
   `TUTORIAL_FAN_OUT` (§1c below has the details).
4. **§1b's own "only Client/API/Database are safe to end a recipe on"
   claim was wrong about API Server** — `APIServer.ts`'s
   `onProcessingComplete` unconditionally tried to forward every
   `direction: "request"` unit of work to `ctx.downstream[0]` and failed
   with `no_downstream_connection` the instant that was empty, exactly
   the §1b failure mode the doc claimed API was exempt from. Since four
   other recipes (`load_balancer`, `cdn`, `rate_limiter`, `reverse_proxy`)
   all deliberately end on `api` per §1a, and API's own bare recipe is
   `[client, api]`, this meant **five separate tutorial walkthroughs
   failed 100% of their requests by construction** — not one, like each
   of bugs 1–3. Reported live as "why are packets discarded at the
   client?" on the Load Balancer walkthrough (the failure surfaces on the
   Client↔first-hop edge/status regardless of where it actually
   originated — see `responseRouting.ts`: only the entity directly
   adjacent to Client ever emits the terminal `REQUEST_FAILED`). Fixed by
   giving `APIServer.ts` a `respond()` helper (mirrors `Cache.ts`'s
   identically-shaped one) that answers directly — a real
   `REQUEST_COMPLETED`, not a failure — when there's nothing downstream,
   the same way a cache hit answers from local state without forwarding
   further.
5. Found while verifying fix #4: **Reverse Proxy's recipe correctly ends
   on `api` (not a §1b violation), but the entity fails 100% of requests
   anyway** until an operator explicitly configures at least one route —
   `ReverseProxy.ts`'s `routes` config defaults to `{}`, and nothing in
   `tutorialPlanner.ts` (or anywhere else) ever pre-populates it, so
   `selectTarget` matched nothing and every request died with
   `no_matching_route` on a freshly-wired, still-default Reverse Proxy.
   Every other entity in the table is useful the instant it's wired up
   (Load Balancer defaults to round_robin, Cache to LRU, ...) — Reverse
   Proxy was the one exception. Fixed in `ReverseProxy.ts`'s
   `selectTarget`: when `routes` is still completely empty, it falls back
   to the first downstream target instead of matching nothing. The
   moment an operator configures even one real route, that fallback stops
   applying and the documented "unmatched routes get nothing" semantics
   take over exactly as before — this only covers the untouched-default
   state, not a real misconfiguration.
6. **Client's own `[client]` recipe — the single simplest tutorial there
   is — still ended by asking the student to click "Run" on one
   disconnected node.** Not the same mechanism as bugs 2/4/5 (nothing in
   `Client.ts` is mis-declared "safe"; a lone Client genuinely has no
   architecture to simulate yet), but the same visible symptom: a
   100%-`REQUEST_FAILED("no_downstream_connection")` results panel, this
   time on literally the first thing a new user can ever do here. Fixed
   in `computeCurrentStep` (`tutorialPlanner.ts`): a `hasSomethingToRun =
   recipe.length > 1` check skips the run/results phase entirely for any
   recipe that's just one entity long (only `client` today) and goes
   straight to a completion step with a body explaining *why* — "nothing
   downstream yet, add something after it and the loop continues" —
   instead of silently skipping a step the generic completion text still
   claims happened. Every multi-entity recipe is unaffected (see
   `src/lib/__tests__/tutorialPlanner.test.ts`'s new
   "single-entity recipe" describe block, plus the explicit
   "multi-entity recipe is unaffected" case in the same block).

---

# How the mechanism works (context, not a how-to — see `tutorialPlanner.ts`'s own comments for the how)

`TUTORIAL_RECIPES[type]` is a single ordered chain of entity types from
Client to that entity — e.g. `cache: ["client", "api", "cache",
"database"]`. It encodes two things at once: what has to exist first, and
(for anything that inserts into an existing link rather than extending
the chain) which link it sits inside of.

`computeCurrentStep` diffs that chain against the *live* canvas
(`nodes`/`edges` from `workshopStore`) every time it's called and returns
the one next thing to do — remove something extraneous, add a missing
node, connect two nodes, remove a stale edge that now bypasses an
inserted entity, select it, read its config, run, read results, or a
terminal "done" step. There's no stored progress to keep in sync; that's
also what makes pausing genuinely resumable ([[BROWSER-CHECKS.md]] has
the bug report this fixed).

"Extraneous" doesn't mean "not in this target's own recipe" — it means
"not explained by *any* recipe as progress past this target."
`extendsRecipe` checks whether a node's own type has a recipe that's this
target's recipe plus more (Database's chain is API's chain plus one more
step, so a Database is never extraneous while touring API) before ever
proposing to remove it. Only true clutter — a node whose recipe doesn't
continue from here at all — gets a removal step.

Because `TUTORIAL_RECIPES` is typed `Record<EntityType, EntityType[]>`,
adding a new `EntityType` anywhere else in the app is a **compile error**
until it also gets a recipe entry here — the type system already
guarantees no entity can silently ship without one.

---

# What "doing" a component actually means

For each entity, four things — none of them new code in the typical case:

## 1. Sanity-check its recipe

Two separate things to check — both have already caught a real bug (see
above), so don't skip either just because the other one passes.

**a. Does it match the entity's documented position?** Read the chain out
loud against `docs/Entities.md`'s `## Purpose` for that entity. ("Cache
sits in front of slower storage, typically a Database" → `api → cache →
database`. "The Reverse Proxy routes each request to a specific
downstream service" → `client → reverse_proxy → api`, same position as
Load Balancer.)

Three entities have **no** `docs/Entities.md` entry to check against —
Rate Limiter, Circuit Breaker, Replica Pool are flagged as undocumented
in `docs/LEARNING-PARITY.md` too. Their current recipes are reasoned from
`entityCatalog.ts`'s one-line description (Replica Pool's from its own
source file, once the downstream-leader issue below was found) rather
than a fuller written spec:

- `rate_limiter: [client, rate_limiter, api]` — gates traffic before it
  reaches the API, per "caps request rate, rejecting bursts beyond it."
- `circuit_breaker: [client, api, circuit_breaker, database]` — wraps the
  API's call to a downstream dependency, per "fails fast instead of
  hammering a struggling dependency."
- `replica_pool: [client, api, replica_pool, database]` — `ReplicaPool.ts`'s
  own header comment settles this one directly: "`ctx.downstream[0]` is
  the leader by convention... each is a real Database/APIServer node the
  user wires on canvas." The pool is a routing layer in front of the real
  data store, not a data store itself — same shape as Load Balancer, just
  with a leader/replica split instead of an even one.

These are the three worth a second opinion before calling them settled.
The other nine are grounded in explicit `docs/Entities.md` prose already.

**b. Does it end somewhere that doesn't require a downstream connection?**
Nine of the twelve entities emit a real, simulated
`REQUEST_FAILED("no_downstream_connection")` for every request they
handle if `ctx.downstream` is empty — Load Balancer, Cache, CDN, Message
Queue, Rate Limiter, Circuit Breaker, Replica Pool, Reverse Proxy, Kafka
(grep each one's own file for `no_downstream_connection` to confirm; only
Client/API/Database are safe to end a recipe on). A recipe that puts one
of those nine last teaches a walkthrough that fails by construction —
this is exactly what happened to Message Queue, Replica Pool, and Kafka
before this pass. If a recipe you're checking ends on one of the nine,
that's the bug, not a maybe.

**c. Does it need more than one instance of its own next step to teach
anything at all?** A third bug, found live the same way as §1a/§1b: Load
Balancer's recipe built a real, connected, non-broken architecture — but
with exactly one downstream API Server, its whole reason to exist (a
*choice* between multiple targets) had nothing to demonstrate. Round
robin, least connections, weighted round robin, IP hash, and least
response time are all indistinguishable with one target. Same root cause
one link later in Replica Pool: `ctx.downstream[0]` is the leader by
convention and everything after it is a read replica
(`ReplicaPool.ts`'s own header comment), so a single downstream Database
is a leader with no replicas, unable to demonstrate the read/write split
that's its entire reason to exist. Fixed generically via
`TUTORIAL_FAN_OUT` (`tutorialPlanner.ts`) — a target listed there gets
`computeCurrentStep` insisting on that many *directly connected* instances
of its recipe's very next step (currently `load_balancer: 2`,
`replica_pool: 2`) before moving on to select/config/run, with the
"extras" removal phase (§ above) updated to allow exactly that many
instead of flagging the second one for deletion. Any future entity whose
whole lesson is a comparison across multiple downstream peers — not a
config dropdown on itself, which Cache's LRU/LFU/FIFO/MRU eviction choice
already handles without fan-out — should get an entry here too; ask "can
a student see the thing this entity is supposed to teach with only one
node behind it?" the same way §1b asks "does it end somewhere real?"

## 2. Decide whether the generic config step is enough

The `config:<type>` step always says the same thing: "hover the ⓘ next to
any field." That's genuinely enough for entities whose whole config lives
in the standard `ENTITY_CONFIG_SCHEMA` field list. It's *not* enough to
surface the bespoke per-edge Inspector sections that don't come from that
schema:

| Entity | Bespoke section | File |
|---|---|---|
| Load Balancer (weighted) | Target Weights | `LoadBalancerWeightsSection`, `InspectorPanel.tsx` |
| Reverse Proxy | Routes | `ReverseProxyRoutesSection`, `InspectorPanel.tsx` |
| CDN | Edge Map (draggable User/Origin pins) | `CDNEdgeSection`, `InspectorPanel.tsx` |

A student following the generic config step today will never be told
these exist unless they scroll and notice. Whether that's worth a
dedicated step (a new branch in `computeCurrentStep`'s config phase,
gated on `target === "load_balancer" && config.algorithm ===
"weighted_round_robin"`, etc.) or a one-line addition to the existing
`config:<type>` step's body text is a per-entity call — the CDN's Edge
Map is the strongest case for it (it's the entity's primary interaction,
not a footnote).

## 3. Live-verify the four canvas states

Same four cases already listed in `docs/BROWSER-CHECKS.md`'s tutorial
entry, run once per entity:

- **Empty canvas** — picking the entity builds its whole chain from
  scratch, in order.
- **Canvas already has everything except the target** — jumps straight
  to "Add `<entity>`," then (for a mid-chain entity) correctly asks to
  remove the old direct link once both new connections exist.
- **Canvas has an unrelated extra node** — asks to remove it before
  anything else.
- **Canvas already fully built and connected** — goes straight to
  select → config → run → results.

## 4. Update `docs/BROWSER-CHECKS.md`

Either fold the entity into the existing tutorial entry's pending list,
or (if everything checked out) note it's covered and move on. Don't
re-verify an entity that already passed this pass — that's the whole
point of the checklist below.

---

# Status by entity

Recipe confidence: **doc** = matches explicit `docs/Entities.md` prose,
**reasoned** = inferred from `entityCatalog.ts`'s one-liner only (§1's
three undocumented entities).

| Entity | Recipe | Confidence | Ends on a downstream-required entity? | Bespoke section? | Verified live? |
|---|---|---|---|---|---|
| Client | `[client]` | doc | no (safe) | — | ☐ |
| API Server | `[client, api]` | doc | no (safe) | — | ☐ |
| Database | `[client, api, database]` | doc | no (safe) | — | ☐ |
| Load Balancer | `[client, load_balancer, api]`, fans out to 2 `api` (`TUTORIAL_FAN_OUT`) | doc | no — ends on api | Target Weights (weighted only) | ☐ |
| Cache | `[client, api, cache, database]` | doc | no — ends on database | — | ☐ |
| CDN | `[client, cdn, api]` | doc | no — ends on api | Edge Map | ☐ |
| Message Queue | `[client, api, message_queue, database]` | doc | no — ends on database (fixed, was broken) | — | ☐ |
| Rate Limiter | `[client, rate_limiter, api]` | reasoned | no — ends on api | — | ☐ |
| Circuit Breaker | `[client, api, circuit_breaker, database]` | reasoned | no — ends on database | — | ☐ |
| Replica Pool | `[client, api, replica_pool, database]`, fans out to 2 `database` (`TUTORIAL_FAN_OUT`) | reasoned | no — ends on database (fixed, was broken) | — | ☐ |
| Reverse Proxy | `[client, reverse_proxy, api]` | doc | no — ends on api | Routes | ☐ |
| Kafka | `[client, api, kafka, database]` | doc | no — ends on database (fixed, was broken) | — | ☐ |

Check a box only after an actual claude-in-chrome pass (per
`AGENTS.md`'s workflow), not after reading the code. The "ends on a
downstream-required entity" column should never read "yes" for any row —
that column exists so a future edit that reintroduces the bug is easy to
spot in a diff, not because it's expected to ever be true.

---

# If a recipe turns out wrong

Edit the one line in `TUTORIAL_RECIPES`. Nothing else in the planner,
overlay, or panel changes — the whole reason the chain lives in one
central table instead of scattered through step logic. Leave a short
comment on the entry explaining the correction if the old chain was
actively misleading (not just imprecise), the same way the file's own
header comment explains its reasoning today.

Before picking a replacement chain, run it through both checks in §1a/§1b
— the Message Queue/Kafka/Replica Pool bug happened because a recipe was
picked that satisfied "matches the entity's documented position" (§1a)
while silently failing "ends somewhere real" (§1b). Passing one check
isn't evidence the other one passes too.

If the fix means a node needs to be treated as extending another
target's chain instead of counting as clutter (the API Server/Database
bug), that's `extendsRecipe`'s job, not a new special case in the removal
phase — it already generalizes to any two recipes where one is a prefix
of the other, nothing entity-specific to add there.

---

# Adding a brand-new entity type later

Once a new `EntityType` exists (simulation entity, `entityCatalog.ts`,
`entityConfigSchema.ts`, `entityDeepDive.ts` — the usual entity-adding
checklist, unchanged by any of this), `tsc` will fail on
`TUTORIAL_RECIPES` until it gets an entry too. Add its chain following
§1's method above — both halves: place it relative to Client/API/Database
the way `docs/Entities.md`'s `## Purpose` describes (§1a), *and* check
its own `handleEvent`/arrival logic for a `ctx.downstream.length === 0`
guard before deciding it's safe to end a recipe on (§1b) — then run it
through §"What 'doing' a component actually means" once before checking
it off.

---

# Definition of Done

Every row in the status table has a live-verified checkmark, and the
three `reasoned`-confidence recipes have either been confirmed correct or
corrected. No new step-machine work is anticipated — if a particular
entity turns out to need one (a genuinely unique interaction the generic
four-phase planner can't express), that's a signal to come back and
extend `computeCurrentStep` itself, not to hand-roll a one-off script
outside it.
