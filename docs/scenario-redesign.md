# scenario-redesign.md

# Redesigning the remaining scenarios: given + budget + stars + legendary

> Movie Ticket Booking is the reference implementation of a new scenario
> model — blank canvas, a locked "given" demand, a real cost budget, a
> 0-3 star quality score, and a revealable "legendary" tier for beating a
> hand-tuned reference solution. This document is the recipe for applying
> the same model to the three scenarios still on the old model: **Flash
> Sale, URL Shortener, Parking Reservation Platform**. Written so another
> Claude session can pick this up cold, the same way
> `Learn-Problem-Solution.md` does for the "Try It" failure-demo pattern —
> read that document's own structure for the tone this one follows.

---

## 1. Origin — the two requests, quoted in full

This started as a direct complaint about the old scenario model:

> The Scenarios which we have are so dumb. Increading the number of
> concurrent server and all just solves it. Like what will one even learn
> from it. The scenarios should have a cost upper limit, no enties at the
> beggining (so that the student can start on fresh canvas. And the
> entities they fixed value for the scenario (example client req/sec,
> database latency, single server cofigs etc. THe changes should be such
> that it comes under the cost. this will encourage the students to think
> rather than a fixed set of rules. Students can even try to optimise by
> cutting more cost/ decreasing latency. We can have a total no of stars
> for the solution which would be a combination of minimum cost and
> minimum latency and minmum packet drop. MOST IMPORTANTLY THE USERS
> SHOULDNT BE ABLE TO CHANGE THOSE CONFIGURATIONS WHICH MAKE THE PROBLEM
> WHAT THEY ARE.

Followed, once Movie Ticket Booking was built and verified, by a second
request:

> Now add a optimised answer, which when clicked would give the best
> possible configuration, so that the user can learn if they can find a
> solution. If someone solves the scenario with a score more than the
> optimised, they get 5 stars and write LENGEDARY

Two rounds of live browser testing also surfaced two real bugs that
shaped the final model — both worth knowing before you start tuning a new
scenario, covered in detail in §5's gotchas:

1. A scenario tuned against too-low a fixed traffic rate is trivially
   solvable by dropping totally unconfigured default components — no
   design thinking required at all. Confirmed live: at 80 req/s,
   unconfigured API+Database defaults passed at 3★ with zero effort.
2. The star/pass readout was invisible whenever a node was still selected
   in the Inspector — which is almost always true right after a student
   finishes building. Fixed generically (not per-scenario), so this isn't
   something the next scenario needs to worry about.

---

## 2. What shipped, and where

| Piece | File | Generic (reuse as-is) or scenario-specific? |
|---|---|---|
| `givenNodeIds`/`lockedFields`/`budgetUsd`/`optimalSolution` on `Scenario` | `src/scenarios/types.ts` | Generic |
| Movie Ticket Booking itself | `src/scenarios/movieTicketBooking.ts` | **Scenario-specific — the reference implementation** |
| URL Shortener itself | `src/scenarios/urlShortener.ts` | **Scenario-specific** |
| Parking Reservation Platform itself | `src/scenarios/parkingReservationPlatform.ts` | **Scenario-specific — see §5.11, its lesson changed mid-tuning** |
| `isGivenNode`/`lockedFieldsForNode`/`isFieldLocked` | `src/lib/scenarioLocking.ts` | Generic |
| `scoreScenario` — budget gate, architecture gate, 0-3 star composite, legendary tier | `src/lib/scenarioScoring.ts` | Generic |
| `hasUnguardedBackendAccess` — the architecture gate: a Database/Cache/Message Queue/Kafka/Replica Pool must never be reachable from a Client without passing through an API Server first | `src/lib/architectureValidation.ts` | Generic — added while tuning URL Shortener, see §5.10 |
| Given-node delete/edit enforcement (`onNodesChange`, `removeNode`, `updateNodeConfig`) | `src/store/workshopStore.ts` | Generic |
| `loadOptimalSolution` action | `src/store/workshopStore.ts` | Generic |
| Lock glyph on given nodes | `src/components/workshop/nodes/ComponentNode.tsx` | Generic |
| Locked-field disabling + hint text | `src/components/workshop/InspectorPanel.tsx`'s `ConfigField` | Generic |
| Budget row, Solution Quality / legendary card, "Stuck?" reveal section | `src/components/workshop/InspectorPanel.tsx`'s `ScenarioBriefing`, `BudgetRow`, `ScoreCard`, `ReferenceSolutionSection` | Generic |
| Persistent star stat in the bottom bar | `src/components/workshop/SimulationResultsPanel.tsx`'s `ScenarioScoreStat` | Generic |
| Completion toast (incl. legendary variant) | `src/components/workshop/ScenarioCompletionToast.tsx` | Generic |
| Test coverage for the scoring mechanism | `src/lib/__tests__/scenarioScoring.test.ts` | Generic — covers the mechanism once, not per-scenario |
| Movie Ticket Booking's own scenario tests | `src/scenarios/__tests__/validator.test.ts` (the `describe("movieTicketBooking scenario data", ...)` block) | **Scenario-specific — write the equivalent block for your scenario** |

**If you find yourself editing anything in the "Generic" column to make a
new scenario work, stop and reconsider** — same principle
`Learn-Problem-Solution.md` §6/§7 already establish for the "Try It"
pattern. The whole point of building Movie Ticket Booking first was to
prove the machinery is generic; a scenario-specific need in a "generic"
file means either the machinery has a real gap (rare — flag it) or the
new scenario doesn't actually fit this model as cleanly as it looks (more
likely — reconsider the approach before forcing it).

---

## 3. The model, briefly

- **Blank canvas + a locked given.** `startingEntities` holds only the
  fixed "facts" of the problem — almost always just a Client, sometimes
  with more than one of its own fields locked (see §5's note on
  `keyPoolSize`). `startingConnections` is `[]`. Everything else is a
  blank canvas the student builds on, same free-build feel as the
  Workshop's own default. `givenNodeIds` names which starting node(s)
  can't be deleted; `lockedFields` names which of *that* node's config
  keys can't be edited.
- **Budget is a hard gate**, not a soft nudge — `budgetUsd`, checked
  alongside the existing `constraints` (success rate, p95 latency) in
  `scoreScenario`. Over budget means the scenario isn't solved, full
  stop, same tier as failing a latency constraint.
- **Stars are the optimization layer**, only ever computed once every
  gate already passes: a 0-1 composite over how far under the bare
  minimum a solution got on cost, latency, and drop rate, mapped to 1-3
  stars (0.5 and 0.8 are the tier boundaries — see `scenarioScoring.ts`).
- **Legendary (5★, skips 4)** — a `Scenario.optimalSolution` (a real,
  hand-tuned, verified architecture, not claimed to be provably maximal)
  gets scored by the exact same function. Beat its composite with your
  own build and `stars` jumps to 5, `legendary: true`. Revealing the
  reference (the "Stuck?" section) loads it onto the canvas directly —
  running it as-is scores whatever it scores, never legendary against
  itself, by construction.

Read `scenarioScoring.ts` and `movieTicketBooking.ts` in full before
starting — both are short, and every design decision below is explained
in their own comments, not just here.

---

## 4. Step-by-step recipe

Same shape as `Learn-Problem-Solution.md`'s §6/§7 recipes — mechanical
enough to follow without re-deriving the reasoning, but read §5's gotchas
first, they will save you real time.

1. **Read the target scenario's current file in full** —
   `src/scenarios/flashSale.ts`, `urlShortener.ts`, or
   `parkingReservationPlatform.ts`. Don't trust §6's numbers below (or
   any other summary) over the actual file — they may have drifted.

2. **Identify what's actually "given."** Almost always the Client's
   `requestRate`. Ask whether anything else about the Client's traffic
   *is* the problem, not a lever to solve it with — e.g. URL Shortener's
   entire lesson depends on traffic being skewed toward a small hot-key
   pool (`Client.keyPoolSize`); leaving that editable would let a student
   shrink the key pool to cheapen the caching lesson instead of actually
   caching. Lock it too, in that case.

3. **Strip `startingEntities` down to just the given node(s)**;
   `startingConnections` becomes `[]`. Delete everything else that was
   pre-built.

4. **Write a throwaway tuning script** —
   `src/simulation/examples/tmp-<scenario>-<n>.ts`, deleted before you're
   done (same discipline `Learn-Problem-Solution.md` §6 step 4 already
   established for failure demos, applied here to a scenario instead).
   It needs to, **in this order**:

   a. **Confirm unconfigured defaults genuinely fail.** Build whatever
      entities the scenario's own existing `hints`/hinted fix imply are
      needed (e.g. Flash Sale → API + Database; URL Shortener → API +
      Cache + Database), leave every field at its
      `entityConfigSchema.ts` default, wire them to the given Client, run
      it, and check the real success rate / p95 against the scenario's
      constraints. **If it passes, the fixed rate is too low — raise it
      and retry.** This is the single most important check in the whole
      recipe; skipping it is exactly the mistake Movie Ticket Booking's
      first pass made. See §5.1 for the mechanics of *why* and what
      "raise it" actually means numerically.

   b. **Find an "adequate" build** (2★-ish) and a **"well-optimized"
      build** (3★-ish, usually — but not always — involving a cache) —
      verified with the **real `scoreScenario` function**, imported
      directly into the script, never hand-computed. See §5.2 for why
      hand math is a trap here.

   c. **Push for the strongest "optimal" reference you reasonably can** —
      try several variants, not just the first thing that scores well.
      Movie Ticket Booking's own reference plateaued around composite
      0.83 after multiple attempts; that plateau is what makes "legendary"
      mean something. Don't ship the first working combo as
      `optimalSolution`.

   d. **Confirm a "lazy overprovisioning" build** (the old scenario's own
      hinted fix, cranked far past what's needed) still clears the
      *old* success-rate/latency constraints, but fails the new budget by
      a wide margin (Movie Ticket Booking's was >2x over).

5. **Pick `budgetUsd`**, and adjust the existing `p95Latency`/
   `successRate` constraint thresholds if needed, so the gradient reads
   cleanly: defaults fail hard (ideally on their own capacity, not just
   budget) → adequate build clears the gate at 2★ → optimized build
   reaches 3★ → lazy overprovisioning fails budget outright. See §5.3 for
   why "just barely clears" thresholds are worse than generous ones here.

6. **Write the final scenario file.** `givenNodeIds`, `lockedFields`,
   `budgetUsd`, `optimalSolution` (with a `summary` that hints at the key
   idea without handing over exact numbers). Rewrite `story`, `hints`,
   `learningGoals`, `capacityEstimate`, and `reflection` to match the new
   blank-canvas framing — none of them should reference "the starting
   database's connection pool" or similar language that assumes a
   pre-built graph exists. Record the verified numbers in the file's own
   header comment, same as `movieTicketBooking.ts` does — this is what
   lets a future editor re-verify instead of re-deriving from scratch.

7. **Write the scenario's test block** in
   `src/scenarios/__tests__/validator.test.ts` — there's already one
   `describe` block per scenario; replace the existing one for whichever
   scenario you're redesigning. Mirror Movie Ticket Booking's block
   shape: given/locked-field integrity, defaults-genuinely-fail,
   adequate-build-passes, lazy-overprovisioning-fails-budget. A
   scenario-specific legendary test isn't required —
   `scenarioScoring.test.ts` already proves that mechanism generically —
   but do add one assertion confirming the shipped `optimalSolution`
   itself scores 3★ and `legendary: false` against itself (regression
   guard for the numbers in your own header comment).

8. **Delete the tuning script.**

9. **Run `npx tsc --noEmit`, `npm run lint`, `npx vitest run`** — all
   three clean, no exceptions.

10. **Queue a `docs/BROWSER-CHECKS.md` entry** — copy the shape of Movie
    Ticket Booking's own entry in that file (search for
    "Scenarios redesigned" to find it) as a template. If you have browser
    access in your session, do the click-test pass yourself before
    marking it done: load the scenario → confirm the given lock + budget
    row → drop unconfigured defaults → confirm genuine failure → build
    something adequate → confirm 2★ and the completion toast → reveal the
    reference → confirm 3★, not legendary against itself.

11. **Update §6's status table below** — strike through the row, mark it
    done, one line, same courtesy `Learn-Problem-Solution.md` §8's "How to
    pick up a row" protocol already establishes for its own table. Don't
    touch other rows.

---

## 5. Gotchas — read before tuning, not after

### 5.1 — Defaults must not trivially solve it

`entityConfigSchema.ts`'s defaults are reasonable, broadly-sane values
(API: `maxConcurrent 10, processingTimeMs 5`; Database:
`maxConnections 5, processingTimeMs 15` → a **raw ceiling of
5 × 1000/15 ≈ 333 req/s**). If the scenario's fixed Client rate sits well
under whatever the relevant default entities' raw ceiling works out to,
a student can drag on unconfigured components, wire them up, and pass
with zero design decisions — confirmed live in the browser on Movie
Ticket Booking's first pass (rewritten from 80 req/s to 370 req/s to fix
this; see that file's own header comment for the exact numbers).

Before finalizing a rate, always run the check in step 4a. If defaults
pass, raise the rate until they genuinely fail the *existing*
success-rate/latency constraints — not just the budget. A build that only
fails on cost but would otherwise work is a weaker, more confusing
result than one that visibly can't keep up at all.

### 5.2 — Verify star tiers with the real `scoreScenario` function, never by hand

The composite formula
(`(costScore + latencyScore + dropScore) / 3`, each score a
0-1 "headroom" against its own pass bar) is simple, but hand-computing it
during tuning is a real trap — this is exactly the mistake made while
tuning Movie Ticket Booking's own numbers, caught only by writing a
script that imports and calls the actual function. Always do the same:
write a small script, import `scoreScenario` from `src/lib/
scenarioScoring.ts` directly, run it against your candidate builds, read
the real `composite`/`stars` fields off the result.

### 5.3 — Headroom scales counterintuitively; loosen the bar, don't over-tighten the build

`headroom(actual, bar) = (bar - actual) / bar`. A **more generous
(larger) bar produces a *higher* headroom score** for the same `actual`
— counterintuitive on first read. If your best legitimate builds are
stuck at 2★ and can't reach 3★ no matter how you tune them, the fix is
usually **raising `budgetUsd` or the latency threshold**, not squeezing
the architecture tighter — cost in particular has a real floor at
meaningful traffic volumes (usage cost, driven by request volume,
dominates over fine connection-count tuning — see §5.4), so there's only
so much squeezing possible before you're just chasing the same coarse
cost tier.

### 5.4 — Cost tiers are coarse; caching (not fine sizing) is usually the real 2★→3★ lever

`costEngine.ts` prices API concurrency in tiers of 5
(`ceil(maxConcurrent / 5) × $30.368/mo`) and Database connections in
tiers of 20 (`ceil(maxConnections / 20) × $51.1/mo`). "Tightly sized" and
"comfortably sized" numbers often land in the *same* tier and therefore
cost almost identically — don't expect fine-grained sizing tweaks to move
the cost score much. What actually moves it: staying out of a much higher
tier (blocking lazy overprovisioning), and — usually the real
2★→3★/legendary lever — a **cache reducing real downstream request
volume**, since usage cost is billed per request that actually reaches a
priced entity.

### 5.5 — Rendering stars: `.repeat(3 - stars)` breaks at `stars === 5`

`"☆".repeat(3 - score.stars)` throws a `RangeError` for `stars: 5` (a
negative repeat count). Every place stars currently render
(`ScoreCard`, `ScenarioScoreStat`, `ScenarioCompletionToast`) already
special-cases `legendary`/`stars === 5` *before* falling back to the
0-3 repeat pattern. If you ever add a new place that renders a
`ScenarioScore`'s stars, copy that pattern — don't reintroduce the bug.

### 5.6 — `optimalSolution` should be genuinely hard to beat

Push it. Try several variants past the first one that scores well, and
let it plateau — Movie Ticket Booking's reference was tried at three
increasingly tight configurations before it stopped improving (~0.83
composite each time). Shipping the first working combo as
`optimalSolution` makes "legendary" trivially reachable, which cheapens
the tier the second half of this feature exists for.

### 5.7 — Traffic actually comes from the Client node's config, not `Scenario.trafficPattern`

`workshopBridge.ts`'s `buildSimulationConfig` reads the Client node's own
`config.requestRate` to build the traffic pattern used at Run time —
`Scenario.trafficPattern` (the top-level field) is only consulted by
scripts that build a `SimulationConfig` directly (tuning scripts, tests),
not by the live Workshop. **Locking `requestRate` in `lockedFields` is
what actually enforces the fixed demand** in the app a student uses;
don't rely on `trafficPattern` alone for enforcement — it's real and
should still match, but it isn't the enforcement mechanism.

### 5.8 — `computeOptimalScore` must never call the public `scoreScenario`

`scenarioScoring.ts` splits `computeBaseScore` (the 0-3 star math, no
knowledge of `optimalSolution`) from the public `scoreScenario` (which
calls `computeBaseScore` twice — once for the student's build, once via
the cached `computeOptimalScore` for the reference — and compares them).
If you extend this file, keep that split: the optimal-scoring path must
only ever call `computeBaseScore`, never the public `scoreScenario`, or
you get infinite recursion.

### 5.10 — Try deleting the API Server, every time — it used to be the cheapest "solution" there was

Found live while tuning URL Shortener, and worth checking on any future scenario before trusting a tuned reference number: nothing in the engine or `workshopStore.ts` stops wiring a Client straight to a Database, Cache, Message Queue, Kafka, or Replica Pool, skipping the API Server entirely. Because `costEngine.ts`'s API pricing is the one meaningfully-taxed "compute" tier (a base cost per concurrency tier, plus usage billed on both the request *and* response leg — see `apiPricing`'s own doc comment), simply deleting it was **cheaper and faster than any real architecture**, with zero design effort. Confirmed this wasn't URL-Shortener-specific: the identical shortcut also beat the *already-shipped* `movieTicketBooking.ts`'s own `optimalSolution` and scored "legendary" against it — a real gap in the shared scoring machinery, not a number to retune per scenario (the "reconsider before forcing it" case §4 step 2 warns about, except here the fix belonged in the generic layer, not the scenario).

Fixed generically, not per-scenario: `src/lib/architectureValidation.ts`'s `hasUnguardedBackendAccess` (a barrier-BFS from every Client node — expansion stops at an `api` node, and a backend-type entity reached before one is a violation), wired into `scoreScenario` as a new `architectureValid` gate alongside `budgetPassed`. `scoreScenario` and `computeBaseScore` both now take a `connections` parameter to make this check possible — if you're calling `scoreScenario` directly (a tuning script, a test), add it. Surfaced in the Inspector as a new "Route traffic through a real service layer" row (`ArchitectureGateRow`), shown on any scenario with a `budgetUsd`.

**Front-line entities (Load Balancer, CDN, Reverse Proxy, Rate Limiter, Circuit Breaker) are deliberately not barriers and not backend types** — real traffic legitimately passes through or terminates at them without an API Server. Only Database/Cache/Message Queue/Kafka/Replica Pool count as "backend," and only `api` counts as the guard. If a future scenario genuinely needs a different shape (a static-asset CDN with no backend API, say), that's a real reason to extend `BACKEND_ENTITY_TYPES` or the guard set — don't just delete the check.

### 5.11 — Splitting a pool (Reverse Proxy, Load Balancer) can't win a budget gate unless it also cuts real request volume

Found while tuning Parking Reservation Platform, and worth checking before leaning on Reverse Proxy or Load Balancer as a scenario's *cost/star* lever (as opposed to a correctness/pass-fail one): `costEngine.ts`'s tiered base pricing is subadditive — `ceil(a) + ceil(b) >= ceil(a+b)`, always — so splitting one pool into two (or more) **never reduces base cost**, and splitting also loses pooling efficiency under queueing (the same total capacity, split into smaller pools, produces worse latency for the same traffic — a real M/M/c effect, not a simulator quirk). Verified three separate ways for this scenario, all agreeing: a plain even split, a split pushed to its own tight minimum, and a "free capacity" framing (a given, locked-ceiling legacy Database, so routing to it is "already paid for") — a single well-sized pool beat every one of them. See `parkingReservationPlatform.ts`'s own header comment for the numbers.

**The only lever that has ever reduced cost in any of these four scenarios is a Cache cutting the real volume of requests reaching a priced entity** (§5.4) — splitting traffic across replicas or routes, on its own, redistributes volume rather than reducing it, so it can't ever win this way. Reverse Proxy/Load Balancer can still matter for a scenario's *pass/fail gate* (a locked component that's physically incapable of handling the full given demand, forcing a split just to pass at all — not to optimize cost), but don't reach for either as the intended 2★→3★ lever without checking this subadditivity math first. If your tuning keeps finding the split loses to a single pool no matter how tight you make it, that's not a tuning mistake to keep chasing — it's this property, and the fix is the same "reconsider before forcing it" §4 step 2 already prescribes.

### 5.9 — A given node's *connections* are never locked, only its identity + listed fields

A given Client still needs to be draggable and wireable to whatever the
student builds — only `removeNode`/the delete-key path and the specific
keys in `lockedFields` are guarded. Don't try to lock edges too; nothing
about this model needs that, and it would block the one thing a given
node is required to still do (connect to the rest of the build).

---

## 6. Master roadmap — the three remaining scenarios

**Read "How to pick up a row" before starting** — same coordination
protocol as `Learn-Problem-Solution.md` §8, since `validator.test.ts` and
this table are both shared, single files multiple sessions might touch.

### How to pick up a row

1. Re-check this table against reality first — another session may have
   finished a row already. Confirm by checking whether the target
   scenario's file has `givenNodeIds`/`optimalSolution` fields yet.
2. Claim **one row at a time.** Don't parallelize across sessions on this
   — `validator.test.ts` is one shared file every redesign edits.
3. Follow §4 exactly. Don't invent a fourth pattern.
4. Update this row's status when done (strike through, mark **Done**,
   one line) and leave everything else untouched.

### The list

The "known starting point" numbers below are what the scenario files
looked like at the time this document was written — **verify against the
actual file before trusting them, per step 1 of the recipe.**

| Scenario | Status | Known starting point (verify first!) | Likely fixed demand + intended fix |
|---|---|---|---|
| ~~Flash Sale~~ | **Done** | See `src/scenarios/flashSale.ts`'s own header comment — the originally-planned "Load Balancer + 2nd API Server" fix was tried at length and abandoned (usage cost dominates too heavily to reach 3★ with a real budget gate once no cache is in the picture — the exact "reconsider before forcing it" case this section's own note anticipated). Shipped instead: Client `requestRate: 400` **and** `keyPoolSize: 1000` both locked; the real lesson is the Database's `type` field (sql vs. nosql — a 3x connection-ceiling/0.5x query-time multiplier at zero extra cost), a lever no other scenario uses yet. `budgetUsd: 1600`, `p95Latency <= 250`. Verified: defaults 85.5% success (genuine capacity failure, not budget); adequate SQL build 2★ ($825); NoSQL-minimal build 3★ ($714); a UI-unreachable "lazy" SQL build clears the old constraints but blows the budget (~$1,952); the optimal reference (NoSQL, further minimized) plateaus at composite 0.822, 3★ against itself. |
| ~~URL Shortener~~ | **Done** | See `src/scenarios/urlShortener.ts`'s own header comment. Shipped: Client `requestRate: 400` **and** `keyPoolSize: 30` both locked (same "the skew itself is given" reasoning as Flash Sale, see §5.9); `budgetUsd: 1400`, `successRate >= 0.95`, `p95Latency <= 100`. Verified: defaults 87.7% success (genuine capacity failure — default DB ceiling ≈333 req/s < 400 req/s demand, not a budget failure); adequate no-cache build 2★ ($761); cache-fronted build (Cache sized to the full 30-key pool) 3★ ($510); lazy overprovisioning clears the old constraints but blows the budget by ~38% ($1,939); the optimal reference (same cache-fronted shape, several variants tried) plateaus at composite 0.805, 3★ against itself. **Also produced a generic fix** — tuning this scenario surfaced a gap in the shared scoring machinery (deleting the API Server entirely was cheaper than any real build, and also broke Movie Ticket Booking's own legendary tier) — see §5.10 and `src/lib/architectureValidation.ts`. |
| ~~Parking Reservation Platform~~ | **Done** | See `src/scenarios/parkingReservationPlatform.ts`'s own header comment. **The originally-planned Reverse Proxy fix was tried at length and abandoned** — see §5.11 below, a second confirmed instance of "reconsider before forcing it." Shipped instead: Client `requestRate: 400` and `keyPoolSize: 1000` both locked (`routePoolSize: 8` left unlocked, cosmetic); `budgetUsd: 2000`, `p95Latency <= 150`. The real lesson: an unconfigured API Server *and* Database both show ~100% utilization at once, but they aren't independent — the API server is stuck on backpressure from the database, not short on its own capacity. Verified: defaults 84.8% success (genuine capacity failure); raising ONLY the API server still fails (84%, proving it wasn't the true bottleneck); sizing ONLY the database (API left default) clears the budget at 2★ ($748); also tightening processing time on both sides to the schema floor reaches 3★ ($719, composite ~0.827 — several variants plateau at the same number, since the database's base cost tier is identical from 1-20 connections); a lazy-overprovisioned build clears the old constraints but blows the budget by ~61%. |

---

## 7. Definition of done, per scenario

Same shape as `Learn-Problem-Solution.md` §11:

- Defaults (every relevant entity at its `entityConfigSchema.ts` default,
  wired to the given Client) genuinely fail the scenario's own
  constraints — verified via the real engine, not asserted.
- `budgetUsd` and the constraint thresholds are tuned so an adequate
  build (2★), an optimized build (3★), and a lazy-overprovisioned build
  (budget-fail, 0★) are all cleanly, comfortably separated — verified via
  the real `scoreScenario` function.
- `optimalSolution` was genuinely pushed on (multiple variants tried),
  not shipped as the first working combo.
- `story`/`hints`/`learningGoals`/`capacityEstimate`/`reflection` all
  match the new blank-canvas framing — no leftover language assuming a
  pre-built starting graph.
- The scenario file's own header comment records exactly what was
  measured (seed, numbers, which run produced them), same discipline
  every other tuned number in this codebase already follows.
- `validator.test.ts`'s block for this scenario is rewritten to match
  (given/locked-field integrity, defaults-fail, adequate-passes,
  lazy-fails-budget).
- `npx tsc --noEmit`, `npm run lint`, `npx vitest run` all clean.
- A `docs/BROWSER-CHECKS.md` entry queued (and ideally click-tested, if
  the session has browser access) describing what to verify.
- This document's §6 table updated for the row you finished.

**All three rows are done.** `docs/scenarios.md` §3 has been updated
accordingly — the old pre-built-architecture model's fallback `<details>`
block is gone, and §3 now describes the given+budget model as the only one
in use, pointing at each scenario file's own header comment for its tuned
numbers. Nothing left in this document's own scope; further scenario work
(a 5th scenario, say) should start a fresh doc rather than extending this
one, per its own §11 "Definition of done" — this file was written for
exactly three rows and that job is finished.
