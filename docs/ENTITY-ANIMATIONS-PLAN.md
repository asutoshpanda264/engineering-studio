# ENTITY-ANIMATIONS-PLAN.md

Animated "how it works" mechanism diagrams for `/entities/[slug]` — one per
entity, added only where the entity has a genuine algorithm or state
machine acting over time worth watching happen, not decorative motion
everywhere. This file is the plan + build log so any session — including
one with none of this conversation's context — can pick the next entity
off the list and build it correctly without re-deriving the design or
re-making mistakes the first two diagrams already made and fixed.

**Read §1–§4 before building anything.** §5 is the per-entity catalog
(execute one row at a time). §6 is the step-by-step runbook.

---

## 0. Status

- **Infra: done.** `useSteppedAnimation` (§2), `DiagramCaptionBar` (§2),
  `FigureFrame`'s zoom modal, and the `/entities/[slug]` "How it works"
  section + `ENTITY_MECHANISM_REGISTRY` wiring (§4) are all built and in
  use. `npx tsc --noEmit` / `npx vitest run` / `npm run lint` all clean.
- **Built: Rate Limiter** (token bucket — burst admitted until the bucket's
  empty, then instant rejection, then refill). Reviewed live, positive —
  "loved it". This is the reference implementation every future diagram
  should pattern-match against.
- **Also built along the way: DNS recursive lookup** (`/foundations/dns-deep-dive`,
  not an entity — this is where the whole pattern (stepped animation +
  caption bar + play/pause) was actually established and debugged, before
  Rate Limiter reused it). See §3 for what went wrong on this one and why —
  worth reading even though DNS itself isn't in the entity catalog below.
- **Built: Circuit Breaker** (state machine — Closed → 5 consecutive
  failures trips Open → fails fast without reaching the Database → Trip
  Duration elapses → Half-Open lets one probe through → succeeds → Closed
  again, streak reset). `CircuitBreakerStateMachineDiagram.tsx`. State/streak
  at every step is derived by replaying `CircuitBreaker.ts`'s own transition
  rules against the script, not hand-picked. `tsc`/`vitest`/`lint` all clean;
  queued in `docs/BROWSER-CHECKS.md`, not yet live-reviewed.
- **Next up: Load Balancer** (routing algorithm — see §5, row 3). Not started.
  Hold until Circuit Breaker gets a live review (§6 step 8 — one at a time).
- **Working rhythm, confirmed with the user**: one entity at a time,
  reviewed before starting the next. Do not batch-build multiple entities
  unsupervised — see §6 step 8.

---

## 1. The rule for what gets animated

Per `docs/workshop_ui.md` §19 ("motion exists to explain causality... not
visual flair") and the master `CLAUDE.md` principle #6 ("every animation
communicates a state change — it doesn't just decorate"), **this is not
"add motion to make the page more interesting."** Before building
anything, answer: *is there a real algorithm or state machine here that
acts differently over time, distinct from every other entity?* If the
honest answer is "not really, it just receives requests and processes
them," don't build one — see §5's "explicitly excluded" list.

Two false starts prove the failure mode to avoid, both on the same original
DNS work before Rate Limiter existed:

1. Animated `/foundations/client-server-architecture`'s generic
   request-response flow — a numbered rail pulsing step by step. Reverted:
   it didn't teach anything the numbered list next to it didn't already
   say. A generic "step 1, step 2, step 3" checklist isn't a mechanism.
2. Tried the *exact same* rail-pulse technique on DNS's resolution-flow
   figure. Also reverted — called out (correctly) as basically a reskin of
   attempt #1, not an actual illustration of *recursive* lookup. The fix
   wasn't a new animation technique, it was picking content that's
   actually a spatial/causal chain (a resolver bouncing between real
   servers) instead of a linear list with motion bolted on.

The working version — DNS's actual recursive-lookup diagram — earned its
animation because there's a real topology (Browser, Resolver, Root, TLD,
Authoritative) and a real sequence of round trips gated on each other.
Rate Limiter's token bucket earned it the same way: a real number (tokens
available) that goes up and down and gates a real decision (admit vs.
reject). Use that bar for every entity in §5.

---

## 2. Shared infrastructure — build once, reuse every time

All under `src/components/content/diagrams/`:

- **`useSteppedAnimation(stepCount, stepDurationSeconds, extraPauseAtLastStepSeconds)`**
  — the engine. A discrete `step` counter (`0..stepCount-1`) advances on a
  `setTimeout`. Returns `{ step, paused, togglePaused, playing }`.
  `playing` is `false` under `prefers-reduced-motion` and `step` never
  advances past `0` — callers should skip rendering the whole animated
  apparatus (dot, captions, button) when `!playing`, not just freeze it.
  Pausing only stops *scheduling the next step* — whatever transition is
  already mid-flight finishes naturally and comes to rest, instead of
  freezing mid-motion.
- **`DiagramCaptionBar`** — the bordered subtitle bar every diagram puts
  under its topology: a small ▶/⏸ button drawn in plain SVG at the left
  edge (reuses that space rather than a separate floating control — direct
  feedback from the DNS diagram's review), plus the current step's caption
  text, which crossfades in via a remount (`key={captionKey}`) rather than
  a hand-rolled opacity keyframe array — see §3 for why that distinction
  matters.
- **`FigureFrame`** (`src/components/content/FigureFrame.tsx`) — the
  magnifying-glass-to-modal wrapper every Learn diagram already uses;
  entity mechanism diagrams reuse it too (§4), so they get the same zoom
  affordance for free.
- **`ENTITY_MECHANISM_REGISTRY`** (`src/components/content/diagrams/entities/registry.tsx`)
  — `Partial<Record<EntityType, ComponentType>>`. An entity absent from
  this map gets no "How it works" section at all on its `/entities/[slug]`
  page (no placeholder, no dead ToC link) — see §4.

When building a new diagram, **always** use `useSteppedAnimation` +
`DiagramCaptionBar` rather than reinventing stepping/pausing/captions per
file. `RateLimiterTokenBucketDiagram.tsx` is the clean reference — read it
before writing the next one.

---

## 3. Hard-won lessons (read before building the next one)

Everything here was a real reported bug on the DNS diagram, fixed once,
now structurally prevented by §2's shared infra — but worth understanding
*why*, since a bespoke one-off diagram could still reintroduce them:

- **Pace.** The first version ran a whole 8-leg loop in under 7 seconds —
  nowhere near enough time to read a caption. Budget **~2.2–2.8s per
  step**. `RateLimiterTokenBucketDiagram` uses 2.4s; DNS uses 2.6s.
- **Caption overlap.** The very first caption-bar implementation gave each
  caption's opacity keyframe array a `1` at *both* ends of its own leg —
  which meant at the exact instant one leg ended and the next began, two
  captions were simultaneously fully opaque. Genuine overlapping text, not
  a speed illusion. `DiagramCaptionBar` sidesteps the entire bug class by
  remounting the caption text per step (`key={step}`, fade in from
  `opacity: 0` on mount) instead of one continuous keyframe array spanning
  multiple steps — there is no shared boundary to get wrong. **Don't go
  back to a multi-step keyframe array for captions.**
- **Always ship the play/pause button.** Explicitly requested after the
  first version had none — readers want to freeze a frame and actually
  read it, not just watch a loop. It's not optional polish, it's part of
  the pattern now.
- **Prefer discrete `step` state + `key={step}` remounts over one giant
  continuous `animate()` keyframe array spanning the whole loop.** The
  original DNS dot was one big keyframe array; it works, but it's much
  harder to pause correctly (there's no clean "current position" to hold)
  and harder to sync captions to. The Rate Limiter dot
  (`RequestDot` in `RateLimiterTokenBucketDiagram.tsx`) remounts fresh
  every step instead — simpler to reason about, trivially pausable.
- **Script a deterministic story, don't live-simulate.** Both diagrams
  hand-author a fixed sequence of steps (DNS's specific swiggy.com
  resolution; Rate Limiter's specific 5-admit → 2-reject → refill burst)
  rather than running the real simulation engine or randomizing. This
  keeps the caption text exactly truthful to what's drawn, and lets the
  story be *the* clearest possible illustration of the mechanism rather
  than whatever a random run happens to produce.
- **Match the entity's own claims.** Pull the story from what
  `src/lib/entityDeepDive.ts` already says about the entity (tradeoffs,
  summary) rather than inventing new claims — Rate Limiter's caption text
  is close to a direct dramatization of its `tradeoffs[0].description`.
- **Respect `prefers-reduced-motion` by omitting the whole apparatus** —
  dot, captions, *and* the play/pause button — not just freezing the dot.
  If there's nothing animating, there's nothing to play/pause.
- **Reuse established color semantics** rather than picking new colors per
  diagram: `signal` = a query/request/action heading out, `healthy` = a
  success/response/admission, `critical` = a rejection/failure. Pull the
  literal value via CSS var (`"var(--color-signal)"` etc.) into a `style`
  prop for anything Framer Motion animates directly (`fill`, `color`) —
  Tailwind utility classes don't work for values Motion interpolates.

---

## 4. Where things render

- **Foundations/LLD** diagrams are data-driven: a lesson's content file
  (`src/content/foundations/lessons/*.ts`, `src/content/lld/lessons/*.ts`)
  has a `{ kind: "figure", diagram: "some-id" }` block, resolved through
  `src/components/content/diagrams/registry.tsx`
  (`DIAGRAM_REGISTRY`). This is the older, separate `LessonBlock` pipeline
  — unrelated to entities, don't conflate the two registries.
- **Entities** are component-driven, no content file involved:
  1. Build the diagram component under
     `src/components/content/diagrams/entities/`.
  2. Add one line to `ENTITY_MECHANISM_REGISTRY`
     (`src/components/content/diagrams/entities/registry.tsx`), keyed by
     the entity's `EntityType`.
  3. `src/app/entities/[slug]/page.tsx` picks it up automatically — the
     "How it works" `Section` (and its ToC entry) render *only* when
     `ENTITY_MECHANISM_REGISTRY[type]` exists; every other entity's page
     is completely unaffected. Section numbering for everything after it
     (`In production` onward) is computed as `N + afterMechanism`, not
     hardcoded, so it stays correct either way. No other page edit needed.

---

## 5. Candidate catalog

Triaged from all 12 entities in `ENTITY_CATALOG` down to 7 with a real
mechanism worth animating (§1's bar). Build one at a time, in this order
unless the user asks to reprioritize.

| # | Entity | Status | Mechanism to animate |
|---|---|---|---|
| 1 | **Rate Limiter** | ✅ Done | Token bucket: burst spends saved tokens until empty, then instant rejection, then steady refill. `RateLimiterTokenBucketDiagram.tsx`. |
| 2 | **Circuit Breaker** | ✅ Done | State machine: Closed (healthy, requests flow) → 5 consecutive failures trips it → Open (fails fast, nothing reaches the Database) → Trip Duration elapses → Half-Open (one probe request let through) → probe succeeds → Closed, streak reset. `CircuitBreakerStateMachineDiagram.tsx`. Not yet live-reviewed — see `docs/BROWSER-CHECKS.md`. |
| 3 | **Load Balancer** | ⬜ Next up | The routing algorithm actually distributing requests — round-robin cycling a dot through 3 targets in strict order is probably the clearest single story; least-connections (picking whichever target currently has fewer in-flight) is a good second beat if the diagram has room, since the entity page already contrasts multiple algorithms and this entity's whole point is algorithm choice mattering — don't hardcode round-robin as "the" answer. |
| 4 | **Cache** | ⬜ Queued | LRU eviction: a fixed-size ordered row of slots; a hit moves an item to the most-recently-used end, a miss/insert when full evicts whichever is at the least-recently-used end. The clearest "why LRU specifically" demonstration is an item getting hit right before it would've been evicted, saving it. |
| 5 | **CDN** | ⬜ Queued | Edge routing + hit/miss: request → nearest edge; hit → served straight from the edge; miss → edge fetches from origin, caches it, *then* serves — the classic "first request slow, every subsequent one fast" story, mirrors `entityDeepDive.ts`'s own framing. |
| 6 | **Message Queue / Kafka** | ⬜ Queued | Producer → queue/partition → consumer decoupling and backpressure, or (Kafka specifically) partition assignment by key hash with multiple consumers each owning a partition — a real fan-out/fan-in worth showing. Decide whether this is one diagram or two (Message Queue and Kafka are separate entities with separate deep-dive pages) before starting. |
| 7 | **Replica Pool** | ⬜ Queued | Writes → the one leader; reads spread round-robin across replicas. Optionally show replication lag (leader has the latest write before a replica does) if it fits without cluttering. |

**Explicitly excluded** — no real mechanism beyond "requests arrive, get
processed": Client, API Server, Database, Reverse Proxy. API Server/
Database's admit→queue→reject behavior is already the generic shape every
entity shares, not something distinctive to animate; Reverse Proxy's route
matching is arguably a candidate but was judged too similar to Load
Balancer's routing to justify both right now — revisit if Load Balancer's
diagram (row 3) turns out to have room to spare, but don't build it
unprompted.

---

## 6. Runbook — adding the next entity (any session)

1. Read the entity's own copy in `src/lib/entityDeepDive.ts` (summary,
   tradeoffs, failure modes) for the exact mechanism language — the
   animation should dramatize a claim already made there, not invent one.
2. Sketch a short **deterministic story**: a fixed, numbered sequence of
   steps that demonstrates the mechanism's *defining* behavior — not
   generic traffic flow, the specific thing that makes this entity
   different from every other one. Write the story down before writing
   any code.
3. Build `src/components/content/diagrams/entities/<Entity><Mechanism>Diagram.tsx`
   using `useSteppedAnimation` + `DiagramCaptionBar` (§2). Use
   `RateLimiterTokenBucketDiagram.tsx` as the template for structure —
   topology constants at top, a `STEPS`/`LEGS` array with captions, derive
   any running state (token counts, queue depth, ...) from that array via
   `reduce` rather than hand-maintaining it in parallel.
4. Register it: one line in
   `src/components/content/diagrams/entities/registry.tsx`.
5. `npx tsc --noEmit && npx vitest run && npm run lint` — all three clean
   before calling it done.
6. Add a queued entry to `docs/BROWSER-CHECKS.md` describing exactly what
   to verify live (per `AGENTS.md`'s batched-verification workflow) — do
   not open a browser to self-verify; that's a separate, explicit pass.
7. Update this file: flip the row in §5's table to ✅ Done with a one-line
   note on what shipped, and update §0's "Next up" pointer to the
   following row.
8. **Stop and get review before starting the next entity.** This has been
   the actual working rhythm so far — every diagram so far took 2–4 rounds
   of live feedback (pacing, overlap, missing controls, "is this even
   meaningful") before it was right. Building several unsupervised risks
   repeating the same mistake across all of them before anyone catches it.
   Only proceed to the next row if the user says to continue.
