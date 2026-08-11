# Learn-Problem-Solution.md

# The "Try It" Failure-Mode Pattern

> The `/entities/[slug]` deep-dive pages explain how a component works, how
> it breaks, and how to reproduce that yourself in the Workshop — but
> reading a numbered list of reproduce steps is still one step removed from
> actually seeing the failure. This pattern closes that gap: a documented
> failure mode gets a "Try It" button that opens a pre-built, pre-broken
> architecture, ready to run, with a menu of remedies to compare against it.

Cache Stampede is the first failure mode built this way, and the one this
document's reference implementation (§4) walks through in detail. Load
Balancer's Uneven Backend Divergence is the second, Database's Connection
Pool Exhaustion the third, Rate Limiter's Burst Rejection Divergence the
fourth — each added by following §6's config-toggle recipe unchanged, proof
the pattern generalizes, not just a plan for how it might. API Server's
Queue Saturation (Backpressure Collapse) is the fifth, and the first of a
second kind — an *architecture-change* remedy (§5, §7) where the fix is
dragging in a new node rather than flipping a config field. Cache's Cache
Penetration is the sixth, back to a config-toggle remedy — its own tuning
pass is worth reading once built (§8's table entry) since its "win" is
protecting the database's load, not raising the client's own success rate,
which stays capped by how much of the demo's traffic is deliberately
unanswerable regardless of the fix. Cache's Cache Avalanche is the
seventh, and the first demo that never reaches this app's usual 90%
"Crashed" → healthy shape at all, on either side — its own §8 table
entry and code comment record three real, structural reasons why, worth
reading before tuning anything else that touches TTL-driven cache
mechanics. Message Queue's Backlog Overflow is the eighth, back to a
clean config-toggle fit and a full "Crashed → healthy" shape — its
partial remedy (Raise Max Queue Length) is the same "bigger buffer isn't
more throughput" lesson Database's Connection Pool Exhaustion demo
already established, now shown for a second entity. Kafka's Wasted
Consumers Past the Partition Ceiling is the ninth, and — like Cache
Avalanche — never shows a client-facing "Crashed → healthy" flip: Kafka
acknowledges a producer the instant a message is durably admitted,
independent of any consumer group's readiness, so the Client's own
success rate reads 100% in every run, broken and fixed alike. The
failure is real but only visible on Kafka's own node status and its
Consumer Group Distribution — its own worthwhile lesson (a durable write
succeeding and a consumer group keeping up with it are separate claims).
Its two remedies are also a first: one (Raise Consumers per Group) is
built specifically to demonstrate *zero* measurable effect, bit-for-bit
identical to the broken run — the sharpest way to prove "wasted" rather
than merely naming it — and the other (Raise Partition Count) is the
real, single-field fix. Load Balancer's Weighted Misconfiguration is the
tenth, back to a clean, single-remedy config-toggle fit — its own tuning
pass is worth reading before reusing this "two very different capacities
behind a weighted algorithm" shape elsewhere: a naive "just swap the two
broken weight values" remedy was tried and rejected, since the targets'
real capacity ratio (1:25) didn't match the broken config's ratio (1:4)
in either direction — only a weight set that actually tracks real
capacity clears both targets. Reverse Proxy's No Matching Route is the
eleventh, and another demo whose broken state structurally can't cross
this app's 90% "Crashed" threshold — not from undertuning, but because
Route Pool Size caps at 8 (`ROUTE_LABELS`' fixed length), so with exactly
one legitimately-matching route the worst achievable miss rate is
7/8 = 87.5%, independent of traffic volume (routing here has no
capacity/queueing component to push higher under load). Confirmed
against the real engine at 88.55%. Working through this entity's second
failure mode (Route Misconfiguration / Silent Starvation) alongside it
produced a real Skip decision, not a deferral — see §8's table entry.
API Server's Latency Cliff from Processing Time is the twelfth, a clean
config-toggle demo where only Processing Time changes between broken and
remedy (Max Concurrent and Max Queue Length held fixed throughout) —
isolating exactly the axis the failure mode's own name describes, and a
demo where p95 latency (987ms → 42ms) tells as much of the story as the
success rate does. Client's Defeating a Cache with Key Pool Size is the
thirteenth, and its own tuning pass is worth reading before building
anything else that pairs a Cache with a downstream bottleneck: the first
tuning attempt (naive stampede protection) produced real Database
failures even in the "remedy" run, for a reason that had nothing to do
with Key Pool Size — concurrent requests for the same hot key each
independently re-fetching, i.e. Cache Stampede's own already-built
lesson leaking into this one. Switching to coalesced stampede protection
isolated Key Pool Size cleanly as the sole variable.

**§8 is a complete, per-entity audit of every remaining failure mode** —
built (or not) as a "Try It" demo, with a status for each: a good candidate
(config-toggle or architecture-change, with the likely remedy named),
already covered, blocked, or a deliberate skip with the reasoning recorded.
It exists so another Claude instance (or a future you) can pick up any
unclaimed row and build it using §6 or §7's recipe without re-deriving this
analysis or re-reading all 12 entities' `entityDeepDive.ts` content first —
see §8's own "How to pick up a row" note for the coordination protocol
(multiple sessions may be working this list at once, and `entityDeepDive.ts`
is one shared file). This document records the plan well enough that the
same pattern can be repeated for every other documented failure mode
without re-deriving the design from scratch — and records the original
request and the decisions made along the way, so the reasoning isn't lost.

---

## 1. Origin — the original request

This feature started from a direct request, quoted here in full because it's
still the clearest specification of the intended experience:

> So, you can see, in the learn section, we have the details, how it works,
> what are the edge cases and how to prevent them. But there is no
> practical guide to it. Lets do one thing, lets add workshop components
> here. So what will happen is this: sub-topic: Cache stampede. we have the
> explanation and how it happens, then there will be a button which will
> say "try it" the button open to a page with predefined components just
> like workshop for Cache stampede condition, the user just need to run
> simulate and thus view it. on the side tab we will also have the multiple
> remedy options, of how to stop cache stampede. This will allow holistic
> understanding.

Every piece of that request maps directly onto something in the shipped
implementation:

| Request | What it became |
|---|---|
| "sub-topic: Cache stampede... explanation and how it happens" | Already existed — `ENTITY_DEEP_DIVE.cache.failureModes` in `src/lib/entityDeepDive.ts` |
| "a button which will say 'try it'" | The CTA rendered on any failure-mode card with a `demo` (`src/app/entities/[slug]/page.tsx`) |
| "opens to a page with predefined components just like workshop" | `/entities/[slug]/try/[failureModeSlug]`, a dedicated route reusing the same canvas/entity/simulation machinery as the real Workshop |
| "the user just need to run simulate and thus view it" | `FailureDemoWorkspace` + `FailureDemoHeader`'s Run Simulation button |
| "on the side tab we will also have the multiple remedy options" | `RemediesPanel`, listing config-toggle fixes under a **Solutions** heading |
| "how to stop cache stampede" | Two remedies: Coalesced (single-flight, the real fix) and Raise TTL (a named, honestly-partial mitigation) |
| "holistic understanding" | The reason the numbers are verified against the real engine rather than estimated, and why the broken state is tuned to be unambiguous, not subtle — see §4 |

---

## 2. Product decisions made along the way

Three forks were real enough to need an explicit decision rather than a
default. All three were confirmed before any code was written:

1. **Where does "Try It" go?** — a brand-new dedicated route
   (`/entities/[slug]/try/[failureModeSlug]`), not a deep-link into the real
   `/workshop`, and not an embedded mini-canvas inside the article. Decided,
   then reinforced by a follow-up correction: the demo page must **not**
   share `useWorkshopStore` with the real Workshop — a demo page mutating
   the same global store would silently clobber whatever a user was
   building in an actual Workshop session in another tab. `failureDemoStore.ts`
   is a fully isolated store as a result.

2. **Remedy interaction model** — manual-apply by default (pick a remedy,
   it changes the live config, the student hits Run themselves — the same
   "build it yourself" loop the real Workshop already teaches), with an
   optional **Compare** button per remedy for a fast, automatic before/after
   without a second manual run.

3. **Rollout scope** — one full vertical slice (Cache Stampede) built
   end-to-end first, not a generic framework applied to every failure mode
   at once. This document exists to make the *next* one cheap, now that the
   first one proved the pattern out.

One more decision, given directly rather than through the question tool,
determines when a *new* component (not just a config change) is genuinely
needed:

> Dont use the workshop page, lets do it on a different page. And regarading
> the dragabble component, it depends upon the solution of the problem.
> Example in cache stampeded, we dont need additional component so no need
> to drag. But in case of server overload where we need loadbalancer as the
> solution, there we need to have components.

This is the split formalized in §5 below: **config-toggle remedies** (no
new component, just a field flip — what Cache Stampede is) versus
**architecture-change remedies** (the fix is adding a node, like a Load
Balancer for a server-overload scenario — not built yet).

---

## 3. Refinements from the first review pass

The first working version of Cache Stampede got real feedback across two
review rounds. Recording what changed and why, since these are lessons for
building the *next* demo, not just fixes to this one:

**Round 1 — the broken state wasn't dramatic enough:**

> I think you need to show a more extreme case of broken, current values
> are not so incinerating that anyone will say its cache stampede. In case
> of stampede, the db crashes so that should be the level. In case of
> comparision, we are using hardcoded values I guess, please lets stick to
> the values which are run the recently but each mode. Also, put a title
> "Solutions" above the two remedies so that people know how to tackle them.

- The demo's config was re-tuned (single hot key, 800 req/s, a database
  with one connection and no queue) until the broken state's failure rate
  actually crosses this app's own "Crashed" status threshold
  (`CRASH_FAILURE_RATE = 0.9` in `src/lib/nodeStatus.ts`) — not just an
  elevated number, the same red/pulsing status a real overload produces
  elsewhere in the app.
- The Compare panel's numbers were already computed live every click (never
  hardcoded) — but nothing made that obvious when the effect was subtle. Two
  changes: the numbers themselves are dramatic now, and a new comparison row
  names whichever component took the worst hit and its status ("Database:
  Crashed → Healthy"), not just latency/success rate.
- A **Solutions** heading was added above the remedy cards.

**Round 2 — two smaller UI fixes:**

> Two more tweaks: 1/ in the inspector panel list all the components and
> their configuration as dropdown. so that we can see them directly without
> clicking the component and viewing again. 2/ changes the comparasion
> part: dont strikeout the numbers, its not visible at all.

- The Inspector no longer requires selecting a node first — it lists every
  node in the demo as its own expanded-by-default dropdown, so all
  configuration is visible without clicking through each component. Canvas
  selection still highlights the matching section, it just isn't required.
- The strikethrough styling on the "before" number in comparisons (which
  read as invisible against the panel background) was replaced with a plain
  arrow between before/after values.

The lesson generalized: **numbers must be verified against the real engine,
tuned to be unambiguous, and displayed with visible before/after evidence**
— not asserted, not estimated, not subtle. See §6, step 4.

**Round 3 — feedback on the second demo (Load Balancer), fixed generically
for every demo, not just that one:**

> See we are getting: "Load Balancer / Crashed → Healthy" — but this is
> hardly useful in case of load balancer. Let's add entity specific info,
> for example each server utilization (slow and fast) etc. Also, when I
> apply the solution I can directly see the comparison even before running
> the simulation — please make sure comparison is only available after at
> least one run, and the same data from that run is what gets compared.

Two distinct problems came out of this, one a real bug and one a product
decision:

- **The "worst entity" label was outright wrong, not just unhelpful.**
  `worstEntityHealth`'s heuristic (`errorCount / (requestCount + errorCount)`)
  silently broke for zero-capacity routing entities (LoadBalancer,
  ReverseProxy): they never emit `PROCESSING_STARTED` (no `BoundedProcessor`
  — see their own class docs, "has no capacity of its own"), so
  `requestCount` stayed `0` for them no matter how much traffic they
  successfully routed, while every downstream failure forwarded back
  through them still bumped their `errorCount`. That collapses their
  computed failure rate to 100% — a Load Balancer that routed 1,876
  requests fine and forwarded 910 failures from a crashed downstream target
  read as *itself* 100% failed, outranking the actually-crashed target and
  producing exactly the wrong headline. Fixed at the root, in
  `MetricsCollector.ts`: a request source with `requestCount === 0` but a
  populated `routingDistribution` now has `requestCount` backfilled from
  that distribution's sum — the entity's real "how much did I handle"
  number for a pass-through router. This also fixes the same entities'
  status dot on the live canvas (`nodeStatus.ts` reads the identical
  formula), not just this demo — a router that mostly works no longer
  reads as "Crashed" the moment it forwards a single downstream failure.
- **A single "worst entity" line can't show what a multi-node demo needs
  shown.** Fixed generically, not per-demo: see §10 below.
- **Compare's timing felt like magic / hardcoded.** It wasn't — it always
  computed a real, fresh comparison — but it could be triggered before any
  real `Run Simulation` had happened at all, which read as suspicious and
  also meant the "comparison" and "what you'd see if you actually ran it"
  could diverge for no visible reason. Fixed generically: see §10 below.

---

## 4. The reference implementation (Cache Stampede)

| Piece | File |
|---|---|
| Failure-mode content + demo data | `src/lib/entityDeepDive.ts` — `Remedy`, `FailureModeDemo` types; `slugFromFailureModeName`, `getFailureModeDemo`; Cache's `Cache Stampede` failure mode's `demo` field |
| Isolated store for the demo page | `src/store/failureDemoStore.ts` |
| Config-building bridge | `src/lib/failureDemoBridge.ts` |
| Shared node-status logic | `src/lib/nodeStatus.ts` (extracted from `workshopStore.ts` so both stores derive the same red/green/pulsing status the same way) |
| UI | `src/components/failure-demo/` — `FailureDemoWorkspace`, `FailureDemoHeader`, `RemediesPanel`, `FailureDemoCanvas`, `FailureDemoInspector`, `FailureDemoPlaybackBar`, `FailureDemoResultsBar` |
| Route | `src/app/entities/[slug]/try/[failureModeSlug]/page.tsx` |
| Entry point | `src/app/entities/[slug]/page.tsx` — a "Try it" CTA renders automatically on any failure-mode card whose `FailureMode.demo` is set; no per-demo change needed there |

Every one of the UI/store/bridge files above is **generic across demos** —
none of it is Cache-Stampede-specific. Adding the next demo should only ever
require editing `entityDeepDive.ts`.

---

## 5. The two kinds of remedies

**Config-toggle remedies** (built) — the fix is changing one or a few config
fields on a node that's already in the graph. `Remedy.configOverride` is a
plain object merged onto that node's config. This is the cheap, common case:
Cache's `stampedeMode`, Load Balancer's `algorithm`, Rate Limiter's
`algorithm`, Kafka's `partitionCount` are all fields that already exist on
already-placed nodes — no new component needed.

**Architecture-change remedies** (built) — the fix is adding a node that
isn't in the starting graph at all (a Load Balancer for an overloaded single
API Server, a Circuit Breaker in front of a flaky Database, a Cache in front
of an overwhelmed Database). `Remedy` is a discriminated union on `kind`:
`ConfigRemedy` (everything above) and `ArchitectureRemedy`, the second kind:

- **No auto-apply.** Clicking an architecture remedy's "Build it" button
  doesn't merge a config override — there's nothing to merge. It resets the
  canvas to the demo's baseline and reveals `instructions` (a numbered
  "how to build it" guide) plus `ArchitectureRemedyPalette`, a small scoped
  drag-and-drop palette (not the full Component Library — just the
  `allowedComponentTypes` this specific fix needs). The student drags the
  new node(s) in, wires them up (`FailureDemoCanvas` now supports
  `onConnect` and edge deletion, both gated on an architecture remedy being
  active — see `failureDemoStore.ts`'s `activeArchitectureRemedy`), and
  runs it themselves. Nothing validates or grades what they built — same
  as the real Workshop, they just run it and see what happens.
- **Compare never touches the student's build.** `referenceEntities`/
  `referenceConnections` is a second, fully wired, separately
  tuning-verified architecture (same discipline as every other demo's
  numbers — see step 4 of the config-toggle recipe, §6) — Compare always
  measures *that*, fresh, regardless of what the student has or hasn't
  built. This is deliberate, not a shortcut: auto-applying the fix would
  defeat the point of an architecture-change remedy, and there's no
  mechanism (or need) to validate a student's own in-progress graph.
- See §7 for the step-by-step recipe — same shape as §6's, with the parts
  that differ called out.

---

## 6. Step-by-step: adding a new config-toggle demo

1. Confirm the failure mode is already `simulated: true` in
   `entityDeepDive.ts` with real `reproduce` steps. This feature only
   *automates* an already-documented, already-simulated failure — it never
   invents new simulated behavior. If the failure mode isn't simulated yet,
   that's separate, larger work first (see `docs/LEARNING-PARITY.md` for
   the project's own tracking of what's simulated vs. only named).

2. Identify a genuine, single config field (or small, related set) that's
   the real production fix — check `ENTITIES.md` and the entity's own
   `entityEducation.ts` / `entityDeepDive.ts` content for what the fix
   actually is, don't invent one.

3. Sketch a starting architecture and a deliberately extreme starting
   config that should reproduce the failure clearly. Extreme, not subtle —
   the lesson from round 1 above.

4. Write a throwaway tuning script under `src/simulation/examples/tmp-*.ts`
   that imports `runSimulation` directly and prints metrics for the broken
   config and each candidate remedy. Run it with `npx tsx
   src/simulation/examples/tmp-*.ts`. Iterate on the numbers until:
   - the broken state's relevant entity crosses the same 90% failure-rate
     threshold `src/lib/nodeStatus.ts` uses for "Crashed" — so the node's
     own status dot on canvas agrees with the story, not just a metric deep
     in the Inspector;
   - the primary remedy is unambiguously healthy (ideally close to 0%
     failure);
   - any secondary/partial remedy is honestly weaker than the primary —
     don't tune a "partial mitigation" until it looks like a full fix, that
     misrepresents the lesson.
   Delete the tuning script once the numbers are locked in — it's scratch
   work, not part of the shipped feature.

5. Write the verified `FailureModeDemo` into that failure mode's `demo`
   field in `entityDeepDive.ts`, with a code comment recording exactly what
   was measured (seed, the actual metric values, which run produced them) —
   see Cache Stampede's own comment for the shape. This is what lets a
   future editor re-verify the numbers instead of re-deriving them from
   scratch.

6. Re-run the verification through `getFailureModeDemo()` — the actual
   lookup path the shipped app uses — not just the standalone tuning
   config, to catch any transcription slip between the scratch script and
   the real file.

7. Write each remedy's `description` honestly: say plainly when a remedy
   only partially helps, and why (see Raise TTL's description on Cache
   Stampede for the pattern — "doesn't change how badly it fails when it
   happens, only how often").

8. No component code should need to change for a config-toggle demo — the
   whole point of §4's file list being generic. If you find yourself editing
   `RemediesPanel.tsx` or `FailureDemoInspector.tsx` for demo-specific
   logic, stop and reconsider whether the remedy is really config-toggle
   shaped (see §5).

9. Run `npx tsc --noEmit`, `npm run lint`, and `npx vitest run`. All three
   must stay clean.

10. Queue a browser-check entry in `docs/BROWSER-CHECKS.md` describing what
    to verify visually for this specific demo (the crash actually reading
    as a crash on canvas, the remedies producing the expected before/after,
    no layout overflow) — per `AGENTS.md`'s browser-verification workflow.

11. Nothing needs to change on `/entities/[slug]/page.tsx` — the "Try it"
    CTA and the route's `generateStaticParams` both already key off whether
    `FailureMode.demo` is set.

---

## 7. Step-by-step: adding a new architecture-change demo

Same shape as §6's recipe, with the parts that differ called out. The
reference implementation is API Server's "Queue Saturation (Backpressure
Collapse)", fixed by dragging in a Load Balancer + a second API Server —
read alongside its `entityDeepDive.ts` entry for a concrete example of
every step below.

1. Confirm the failure mode is `simulated: true` — same as §6 step 1.

2. Identify the real production fix, and confirm it's genuinely an
   *architecture* change, not a config toggle in disguise — the fix must
   require a node that isn't in the starting graph at all. If a config
   field would do it, it belongs in §6's recipe instead; don't reach for
   this mechanism by default.

3. Sketch the starting architecture (same as §6 step 3) — this becomes
   `startingEntities`/`startingConnections`, exactly as before.

4. Also sketch the **reference architecture**: the starting graph with the
   fix fully, correctly wired in — new node(s), rewired connections. This
   becomes the remedy's `referenceEntities`/`referenceConnections`. It is
   never shown to the student directly (it only powers Compare) — but it
   must be a graph a student really could build with the scoped palette
   this remedy offers.

5. Tune **both** configs via a scratch script, same discipline as §6 step
   4 — the broken graph should cross (or, if queueing math makes that
   genuinely unreachable without also breaking the fix — see the Queue
   Saturation demo's own comment in `entityDeepDive.ts` for why that can
   happen — get as close as honestly possible to) the 90% "Crashed"
   threshold, and the reference graph should be unambiguously healthy at
   the *same* traffic. Delete the script after, same as always.

6. Write the verified `ArchitectureRemedy` into the failure mode's `demo`
   field: `label`, `description` (say plainly that Compare measures the
   reference fix, not the student's own build — every architecture
   remedy's description should), `instructions` (numbered, concrete,
   naming this project's actual field/button labels — "Select the
   connection and press Delete," not "remove the old link"),
   `allowedComponentTypes` (only what this specific fix needs — resist
   offering the whole palette), and the tuning-verified
   `referenceEntities`/`referenceConnections`.

7. Re-verify through `getFailureModeDemo()`, same as §6 step 6 — both the
   starting graph (`demo.startingEntities`) and the reference graph
   (`remedy.referenceEntities`) independently, since they're two separate
   authored graphs this time, not one graph plus a small config diff.

8. No component code should need to change — `RemediesPanel.tsx`'s
   `ArchitectureRemedyPalette`, `FailureDemoCanvas.tsx`'s drag/connect/
   delete wiring, and `failureDemoStore.ts`'s `addNode`/`onConnect`/
   `applyRemedy`/`compareRemedy` are all generic over any
   `ArchitectureRemedy`, keyed off `allowedComponentTypes` and
   `referenceEntities`/`referenceConnections`. If you find yourself
   editing one of those files for demo-specific logic, stop and
   reconsider — same principle as §6 step 8, extended to this mechanism.

9. Run `npx tsc --noEmit`, `npm run lint`, and `npx vitest run` — same as
   §6 step 9. Also worth a quick regression sanity check the first time
   you touch `failureDemoBridge.ts` or `failureDemoStore.ts` directly (not
   needed for a demo-only change like this recipe otherwise produces):
   confirm an *existing* config-toggle demo's tuned numbers are still
   bit-for-bit identical, since architecture mode changed how connections
   get derived (`buildDemoSimulationConfig` now reads live edges instead
   of always trusting `demo.startingConnections` directly — see that
   function's own comment).

10. Queue a `docs/BROWSER-CHECKS.md` entry — same as §6 step 10, plus:
    dragging each allowed component type in (both by click and by drag),
    deleting the old connection, wiring every new connection, Run
    reflecting the student's own build (not the reference), Compare
    staying available and correct regardless of build progress, and
    switching to a different remedy (or back to "Broken") cleanly
    resetting the canvas with no orphaned nodes/edges left behind.

11. Same as §6 step 11 — nothing needs to change on
    `/entities/[slug]/page.tsx`.

**Why Queue Saturation over Database's Independent Failure, the other
obvious first candidate:** Independent Failure's own `reproduce` steps
already name Circuit Breaker as the fix, and it's a simpler build (1 node,
2 edges, vs. this demo's 2 nodes and ~4 rewired edges). It was passed over
anyway — its real benefit is failing fast on doomed queries instead of
waiting out their full processing time, and `REQUEST_FAILED` events don't
currently get a duration recorded anywhere in `MetricsCollector.ts` (only
`REQUEST_COMPLETED` does), so that benefit has no metric to show yet. Worth
building once that gap is closed (a legitimate, separate small feature —
`averageFailedLatency` or similar), not worth building around.

---

## 8. Master roadmap — every entity's failure modes

A complete audit of every `FailureMode` in `entityDeepDive.ts` (22 total,
across all 12 entities), current as of this writing. This is the shared
coordination surface for building out the rest of this feature — **read
"How to pick up a row" before starting work on anything below.**

### How to pick up a row

1. Re-run the audit query before trusting this table — it can go stale the
   moment another session ships a demo. From the repo root:
   `grep -n 'name: "\|simulated:\|demo: {' src/lib/entityDeepDive.ts` and
   check, for the failure mode you want, whether a `demo: {` line appears
   between its `simulated:` line and the *next* `name:` line. If it does,
   it's already built — don't duplicate it.
2. Pick one **Todo** row (config-toggle or architecture-change). Don't
   claim more than one at a time — `entityDeepDive.ts` is a single shared
   file every demo edits, and multiple sessions building in it concurrently
   multiplies merge risk. Small, sequential PRs beat parallel ones here.
3. Follow §6 (config-toggle) or §7 (architecture-change) exactly. Don't
   invent a third pattern.
4. Update this row's status when done: strike through the entity/failure
   mode and mark **Built**, one line, same style as the rows already
   marked that way below. Leave everything else in this table untouched —
   don't renumber or reorder.
5. If a row turns out not to be a good fit once you dig in (same as the
   three **Skip** rows below already found), don't force it — change its
   status to **Skip** and record why, same level of honesty as the
   existing skip reasoning. A recorded "this doesn't fit and here's why"
   is more valuable than a forced demo that misrepresents the lesson.

### Status legend

**Built** — has a `demo`, shipped. **Todo (config)** — good config-toggle
fit, not started. **Todo (architecture)** — good architecture-change fit,
not started. **Blocked** — real candidate, but needs something else built
first (named). **Skip** — deliberately not a good fit for this pattern,
reasoning recorded so it isn't silently re-litigated. **Not simulated** —
`simulated: false`, out of scope until the failure mode itself is
simulated (separate, larger work — see `docs/LEARNING-PARITY.md`).

### The list

| Entity | Failure mode | Status | Likely remedy / reasoning |
|---|---|---|---|
| Cache | Cache Stampede | **Built** | Coalesced (fix) vs Raise TTL (honest partial) |
| Load Balancer | Uneven Backend Divergence | **Built** | Least Connections |
| Database | Connection Pool Exhaustion | **Built** | Raise Max Connections (fix) vs Raise Max Queue Length (honest partial) vs Switch to NoSQL (partial tradeoff) |
| Rate Limiter | Burst Rejection Divergence | **Built** | Raise Requests/Second (fix) vs Switch to Token Bucket (honest partial) |
| API Server | Queue Saturation (Backpressure Collapse) | **Built** | Architecture-change reference implementation — Load Balancer + 2nd API Server |
| ~~Client~~ | ~~Defeating a Cache with Key Pool Size~~ | **Built** | Lower Key Pool Size — coalesced stampede protection needed to isolate this from Cache Stampede's own already-built lesson, see the demo's own code comment |
| ~~API Server~~ | ~~Latency Cliff from Processing Time~~ | **Built** | Lower Processing Time — a ~23x p95 latency drop for a 20x Processing Time drop, near-proportional once the queue clears |
| ~~Load Balancer~~ | ~~Weighted Misconfiguration~~ | **Built** | Fix Target Weights — set to the real 1:25 capacity ratio, not just swap the two broken values |
| ~~Cache~~ | ~~Cache Penetration~~ | **Built** | Negative Caching Off (broken) → On (fix) — database's own request count/status flips Crashed→Healthy; overall client success rate stays low either way, honestly, since it's capped by the demo's Missing Key Rate itself (a guaranteed-fail lookup stays a guaranteed-fail lookup — the remedy protects the database, not that ceiling) |
| ~~Cache~~ | ~~Cache Avalanche~~ | **Built** | TTL Jitter 0% → 50% — honestly partial, not a crash/recovery flip like every other demo: three structural confounds (naive stampede duplication, coalescing collapsing the cache's own admission instead, cold-start being jitter-invariant) capped tuning at a real ~29-point database failure-rate gap (70.1%→41.2%), never crossing the 90% "Crashed" threshold either side — see the demo's own code comment for the full reasoning. The Cache's own Avalanche section (peak burst 5→3, crossing the UI's own isAvalanche>3 threshold) is the demo's real evidence, not a canvas-wide status flip |
| ~~Message Queue~~ | ~~Backlog Overflow~~ | **Built** | Raise Consumer Count (fix) vs Raise Max Queue Length (honest partial) |
| Message Queue | Fan-out Load Multiplication | Todo (config) | Switch Delivery Mode back to Queue, or size capacity for the multiplier |
| ~~Circuit Breaker~~ | ~~Cascading Failure Prevention~~ | **Skip** | Tuned across 5 config regimes (pure flakiness, capacity overload, combinations) — in every one, lowering Failure Threshold made overall success rate *worse*, not better (e.g. 10.9%→0.5%, 17.5%→0.8%), never a "Crashed → Healthy" flip. Two structural reasons, not a tuning gap: (1) this engine has no way for a dependency to recover mid-run (every entity is purely reactive to traffic, nothing self-schedules independent of it — same constraint `CDN.ts` already documents), so a breaker's half-open probes fail at the same rate forever and blocking traffic while open only ever blocks successes too, never nets ahead; (2) the entity's actual claimed benefit — failing fast instead of waiting on doomed queries — has no metric to show it: `MetricsCollector.ts` only records `duration` on `REQUEST_COMPLETED`, never `REQUEST_FAILED` — the exact same gap already blocking Database's "Independent Failure" row below. Revisit once `averageFailedLatency` (or similar) exists — see that row's own note. |
| ~~Reverse Proxy~~ | ~~No Matching Route~~ | **Built** | Configure a Catch-all Target (fix); broken state's real ceiling is 88.5% (Route Pool Size caps at 8, so at most 7/8 can miss) — reads as steady-red "error", not pulsing "Crashed", structurally, not from undertuning |
| Reverse Proxy | Route Misconfiguration (Silent Starvation) | **Skip** | Worked through both shapes while building No Matching Route above, not just at a glance: isolated cleanly (one real route, a second target's route never generated at all), it produces zero visible failure anywhere — 100% success throughout, no node ever turns red, only a Compare panel utilization row would show it — a genuinely different "silent bug" shape this pattern isn't built to dramatize. Built any other way (a second, generated-but-unclaimed route with no catch-all), it collapses into exactly what No Matching Route above already teaches — a typo standing in for an intentional gap, not a distinct lesson. |
| ~~Kafka~~ | ~~Wasted Consumers Past the Partition Ceiling~~ | **Built** | Raise Partition Count (fix); "Raise Consumers per Group" ships too, as a deliberately-inert remedy proving the lesson bit-for-bit, not a partial mitigation |
| Kafka | One Consumer Group Falling Behind | Todo (config) | Raise that group's Max Queue Length / Consumers per Group |
| Database | Connection Pool Exhaustion (the *caching* fix) | Todo (architecture) | A Cache in front of it — a second, distinct remedy for a failure mode that already has a config-toggle demo (the two aren't exclusive: a demo can eventually offer both a config remedy and an architecture remedy for the same broken start, though nothing does yet) |
| Database | Independent Failure (Flaky Infrastructure) | Blocked | A Circuit Breaker in front of it. Real fix, real lesson — but its benefit is failing fast on doomed queries instead of waiting out their full processing time, and `REQUEST_FAILED` events don't currently get a duration recorded anywhere in `MetricsCollector.ts` (only `REQUEST_COMPLETED` does), so that benefit has no metric to show yet. Unblock by adding `averageFailedLatency` (or similar) to `MetricsCollector.ts` first — a legitimate, separate small feature — then build this normally via §7. |
| Client | Thundering Herd | Skip | Its own description frames the Client as "the trigger, not the target" — the actual failure it produces is API Server's Queue Saturation (already built) observed from upstream. Building this as its own demo would just duplicate that one from a different angle, not teach a distinct lesson. |
| CDN | Cold Edge Network | Skip | Not a broken/fixed story — it's a tradeoff demonstration (more edges improves worst-case latency but can *hurt* overall hit rate, on purpose, both directions being "correct" depending on what you're optimizing for). The "Try It" pattern assumes a clear right answer to compare against; this failure mode doesn't have one. |
| Replica Pool | Leader Overload Under High Write Ratio | Skip | No real fix exists in this engine today — per the entity's own `cons`, there's no leader failover, no promotion, no multi-leader write sharding modeled. The only honest "remedies" (shard writes, add a bigger leader) aren't things this entity can represent. Revisit only if Replica Pool ever gains one of those capabilities. |
| Load Balancer | Load Balancer as SPOF | Not simulated | Named, not simulated — the Load Balancer itself never fails in this engine. See `LoadBalancer.ts`'s own class doc for why this was deferred (Circuit Breaker already teaches "detect and route around a failing thing"; duplicating that state machine inside Load Balancer would violate Single Responsibility). |

**A lesson from building the Load Balancer demo, worth knowing before
tuning the next one:** a remedy's *documented* fix isn't automatically a
good fit for a *specific tuned scenario*. Least Response Time is a real,
valid fix for Uneven Backend Divergence in general — but in the extreme,
two-target config tuned to cross the 90% crash threshold, its periodic
forced-round-robin "exploration" dispatches (every 3rd dispatch, see
`LoadBalancer.ts`) kept re-injecting real traffic into the crashed target
all the way through the run, and its near-instant rejections read as *low*
latency to the response-time average it tracks — so it never reliably
learned to avoid the bad target here, measuring barely better than doing
nothing. It was cut from the shipped remedies rather than tuned until the
number looked acceptable (step 4's own instruction — don't tune a partial
mitigation until it *looks* like a fix). The general principle: verify
every remedy named in a failure mode's `reproduce` text actually helps in
your specific tuned numbers before shipping it, don't assume it does
because it's named there — and it's fine to ship fewer remedies than the
`reproduce` text mentions if one of them doesn't hold up under measurement.

---

## 9. Explicitly out of scope for now

- **More architecture-change demos** (§5/§7) — the mechanism itself is
  built and has one reference implementation (Queue Saturation); extending
  it to the other "Todo (architecture)"/"Blocked" rows in §8 (Database's
  Circuit Breaker and caching-fix candidates) is real, separate future
  work, not started.
- **Embedding demos inline in the article** instead of a separate route —
  considered as an alternative in the original design discussion, not
  chosen for v1 (§2, decision 1).
- **Automatic before/after shown without a Compare click** — considered and
  rejected in favor of manual-apply-first with an optional Compare button
  (§2, decision 2) — matches the project's own philosophy of learning
  through the student's own experimentation, not being shown an answer.

---

## 10. The Compare panel's generic contract

Both of these are already handled by the shared `RemediesPanel.tsx` /
`failureDemoStore.ts` for every demo — a new demo's `entityDeepDive.ts`
entry never needs to ask for either. Recorded here specifically so this
doesn't need to be re-requested per demo (see Round 3 above):

- **Per-entity utilization/error breakdown.** `EntityMetricsComparison`
  renders one row per non-Client node in `demo.startingEntities` — label,
  utilization %, error count, before → after — automatically, from
  whatever nodes the demo defines. This sits alongside (not instead of)
  the single "worst entity" status headline (`StatusComparisonRow`) and
  the overall success-rate/latency rows; together they cover "what's the
  headline," "what happened to *this specific* component," and "what was
  the aggregate effect." A demo with more than one non-trivial node (most
  of them — see §8's candidate table) gets real per-component evidence for
  free, not just Cache Stampede's single "Database" story generalized
  wrong.
- **Compare requires a real Run first, and reuses that run's data.**
  `compareRemedy` is a no-op (and the Compare button is disabled, with a
  small "Run the simulation once to enable Compare" hint) until
  `simulationResult !== null` — the student must press Run Simulation at
  least once before any comparison is available, on this exact page load.
  Once available, whichever side of the diff the *live* result already
  represents (`activeRemedyId === null` → baseline; `activeRemedyId ===
  remedyId` → this remedy) is reused verbatim instead of computing a
  second, hidden simulation of a config the student can already see on
  screen — only the side they haven't actually run yet gets a fresh one.
  This supersedes §2 decision 2's original "automatic, no manual run
  needed" framing: Compare is still a shortcut (it never requires a
  *second* manual run to see a specific remedy's effect), but it's no
  longer available before *any* manual run has happened.

---

## 11. Definition of done, per new demo

- Numbers verified against the real engine via a tuning script, not
  estimated — and the script deleted afterward.
- The broken state visibly crosses the same status thresholds the canvas
  already uses (`src/lib/nodeStatus.ts`) — reads as broken at a glance, not
  just in a metric a student has to go looking for.
- At least one remedy is a clean, complete fix; any partial remedy is
  honestly described as partial, backed by its own real numbers.
- `npx tsc --noEmit`, `npm run lint`, `npx vitest run` all clean.
- A browser-check entry queued in `docs/BROWSER-CHECKS.md` describing what
  to verify visually for this specific demo.
