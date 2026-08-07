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
Balancer's Uneven Backend Divergence is the second, added by following §6's
recipe unchanged — proof the pattern generalizes, not just a plan for how it
might. This document records the plan well enough that the same pattern can
be repeated for every other documented failure mode without re-deriving the
design from scratch — and records the original request and the decisions
made along the way, so the reasoning isn't lost.

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

**Architecture-change remedies** (not built) — the fix is adding a node that
isn't in the starting graph at all (a Load Balancer for an overloaded single
API Server, a Circuit Breaker in front of a flaky Database, a Cache in front
of an overwhelmed Database). This needs a mechanism that doesn't exist yet:

- The demo's canvas would need an optional, scoped component palette (not
  the full Component Library — just the one or two component types relevant
  to that fix), which `FailureDemoCanvas` deliberately doesn't have today.
- A remedy of this kind isn't a `configOverride` on an existing node — it's
  a second, alternate starting architecture (its own `startingEntities` /
  `startingConnections`), or a guided "drag this node here and connect it"
  interaction.
- This is a real, separate future milestone — extending `Remedy`'s type
  (likely a discriminated union: `{ kind: "config"; ... } | { kind:
  "architecture"; ... }`) and building the palette-enabled canvas variant —
  not a copy-paste of the Cache Stampede pattern. Don't attempt it as part
  of adding a routine config-toggle demo.

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

## 7. Good next candidates

Failure modes that already look like a clean config-toggle fit (a
production remedy that's genuinely just flipping an existing field):

| Entity | Failure mode | Likely remedy |
|---|---|---|
| ~~Load Balancer~~ | ~~Uneven Backend Divergence~~ | **Built** — see below |
| Load Balancer | Weighted Misconfiguration | Fix Target Weights to match real capacity |
| Rate Limiter | Burst Rejection Divergence | Switch Algorithm (Token Bucket ↔ Sliding Window) |
| Kafka | Wasted Consumers Past the Partition Ceiling | Raise Partition Count |
| Kafka | One Consumer Group Falling Behind | Raise that group's Max Queue Length / Consumers per Group |
| Message Queue | Backlog Overflow | Raise Consumer Count |
| Message Queue | Fan-out Load Multiplication | Switch Delivery Mode back to Queue, or size capacity for the multiplier |
| Client | Defeating a Cache with Key Pool Size | Lower Key Pool Size |
| API Server | Latency Cliff from Processing Time | Lower Processing Time |
| Database | Connection Pool Exhaustion | Raise Max Connections / Max Queue Length |
| Reverse Proxy | Route Misconfiguration (Silent Starvation) | Fix Routes |

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

Failure modes whose *real* production fix needs a new component — good
candidates for §5's architecture-change mechanism once it exists, not
before:

| Entity | Failure mode | Needs |
|---|---|---|
| API Server | Queue Saturation (Backpressure Collapse) | A Load Balancer + a second API Server |
| Database | Independent Failure (Flaky Infrastructure) | A Circuit Breaker in front of it |
| Database | Connection Pool Exhaustion (the *caching* fix, as opposed to the config-toggle one above) | A Cache in front of it |
| Replica Pool | Leader Overload Under High Write Ratio | More replicas / a fundamentally different write pattern |

Failure modes that aren't simulated yet at all (`simulated: false`) — out of
scope for this pattern until they're simulated first: Cache Penetration,
Cache Avalanche, Load Balancer as SPOF.

---

## 8. Explicitly out of scope for now

- **Architecture-change remedies** (§5) — a real future milestone, not
  started. Don't build a one-off version of it inside a single demo; extend
  the shared mechanism instead once a second demo genuinely needs it.
- **Embedding demos inline in the article** instead of a separate route —
  considered as an alternative in the original design discussion, not
  chosen for v1 (§2, decision 1).
- **Automatic before/after shown without a Compare click** — considered and
  rejected in favor of manual-apply-first with an optional Compare button
  (§2, decision 2) — matches the project's own philosophy of learning
  through the student's own experimentation, not being shown an answer.

---

## 9. Definition of done, per new demo

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
