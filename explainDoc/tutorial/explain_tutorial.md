# explain_tutorial.md — how the guided tutorial actually works

## What "the tutorial" actually is

`/tutorial` (`src/app/tutorial/page.tsx` → `TutorialRunner`) is **not** a
separate sandbox, a scripted demo, or a canned animation. It renders the
exact same `WorkshopShell` that `/workshop` does, with one extra prop
(`forceComponentsList`) and a guided overlay (`TourOverlay`) drawn on top.
Dragging a component in the tutorial calls the same `addNode` action on
`useWorkshopStore` that dragging one on `/workshop` does — so a lesson
learned here transfers directly, there's no separate "tutorial mode"
canvas state to keep in sync with the real one.

Crucially, `TutorialRunner` **never resets the canvas on mount**. The
entire tutorial engine is built around one function,
`computeCurrentStep` (`src/lib/tutorialPlanner.ts`), that looks at
*whatever's already on the canvas right now* and returns the single next
thing to do. An empty canvas gets the full build sequence; a canvas that
already has everything except the picked target jumps straight to "add
this one thing"; a canvas with something extraneous on it gets a
"remove this first" step before anything else. This is why pausing and
resuming, or a user manually editing the canvas mid-tutorial, just works
— there's no stored step index to desync.

## State: two fields, not a step machine

`TutorialRunner` (`src/app/tutorial/TutorialRunner.tsx`) holds exactly:

| State | Purpose |
|---|---|
| `activeTarget: EntityType \| null` | Which entity the current walkthrough is teaching (e.g. `load_balancer`). `null` means the picker is showing. |
| `acknowledgedIds: ReadonlySet<string>` | Step ids the user has clicked past on the handful of steps with no canvas signal to detect completion (exact read/write mechanics below). |
| `paused: boolean` | Whether the `TourOverlay` is currently hidden. Never clears `activeTarget` — "hide the guide" and "choose a different tutorial" are deliberately different actions. |

Everything else — `currentStep` — is recomputed on every render via
`useMemo`, by calling `computeCurrentStep` with the live `nodes`, `edges`,
`selectedNodeId`, and `simulationResult !== null` from
`useWorkshopStore`. This is cheap (a handful of scans over a small graph)
and means there's no cache-invalidation problem: the step shown is always
a pure function of "what does the canvas look like right now."

## `computeCurrentStep`'s decision order

Given a `target` entity type, `tutorialPlanner.ts` looks up its recipe —
an ordered chain from `Client` to that entity — in `TUTORIAL_RECIPES`.
E.g. `cache`'s recipe is `["client", "api", "cache", "database"]`: Cache
sits in front of a Database, per that entity's own real-world role. Every
`EntityType` has exactly one canonical recipe; this is deliberately a
single fixed path per entity, not a general graph solver — it's a
teaching scaffold for "how do I add and wire this one thing," not a
scored architecture (that's what `src/scenarios/` is for).

`computeCurrentStep` runs through these checks **in order**, returning
the first `TourStep` that applies:

1. **Remove extras first.** Any node on the canvas whose type isn't part
   of the recipe (and doesn't represent legitimate further progress past
   it — see `extendsRecipe` below) gets a "select and delete it" step.
   This always wins over building, so the user is never asked to both
   delete something and add something in the same breath.
2. **Build the chain**, one missing node or missing edge at a time, in
   recipe order. The first missing node produces an "Add X" step
   pointing at the sidebar catalog entry (`requiresComponentsPanel`
   names which of the two mutually-exclusive component packs it lives
   in — the Runner force-opens exactly that pack, see below). The first
   missing edge between two recipe-adjacent nodes produces a "Connect A
   → B" step.
2.5. **Fan out**, only for entities in `TUTORIAL_FAN_OUT`
   (`load_balancer: 2`, `replica_pool: 2`). A Load Balancer in front of
   one API Server is a real, working, but pedagogically useless
   architecture — round robin, least connections, IP hash etc. are all
   indistinguishable with nothing to route between. This step tops the
   very next recipe entity up to the configured count before moving on.
3. **Remove shortcut edges.** If the target sits in the *middle* of its
   own recipe (e.g. Cache between API and Database) and a leftover
   direct edge still connects its neighbors, that bypasses the target
   entirely — the opposite of the lesson. This step asks to delete that
   edge.
4. **Select → read config → run → read results → complete.** Once the
   chain is fully built and correctly wired: select the target node
   (opens the Inspector), read its config (`requiresAck: true` — no
   canvas signal exists for "the user read this," so it waits for an
   explicit "Got it" click), run the simulation (skipped entirely for
   single-node recipes like `client` alone, which would otherwise show a
   guaranteed-0%-success results panel), then read the results panel
   (`requiresAck: true` again). The whole loop ends on a terminal
   `"complete"` step that stays current until its own button
   ("Choose another tutorial") is clicked.

Two mechanics named above are worth spelling out, since neither lives in
`tutorialPlanner.ts` and so isn't visible from the decision order alone:

- **Force-opening the sidebar pack (step 2).** `ComponentSidebar`'s
  catalog list is on-demand now, not a permanent dock, so a step that
  just spotlights `sidebar-component-<type>` would highlight nothing
  until the user found the toggle themselves — defeating the point of a
  guided step. `TutorialRunner` closes that gap with one `useEffect`
  keyed on `currentStep?.requiresComponentsPanel`: whenever the current
  step names a pack, it calls `setOpenComponentPack` (a
  `useWorkshopStore` action) with that pack id, which opens it and
  implicitly closes the other pack — the same effect clicking its own
  trigger button would have — so the highlighted catalog card is
  actually on screen by the time the step appears.
- **Writing `acknowledgedIds` (the `config`/`results` steps).**
  `TourOverlay`'s "Next" button calls `handleNext` in `TutorialRunner`,
  which adds `currentStep.id` to `acknowledgedIds` — e.g. `config:cache`
  or the literal string `"results"` — *except* when the current step's
  id is `"complete"`, where it calls `chooseAnother()` instead (reset to
  the picker, not one more ack). `computeCurrentStep` checks membership
  on those exact two keys (`` `config:${target}` `` and `"results"`,
  `tutorialPlanner.ts` lines 321 and 341) to decide whether that step is
  still current. So an "ack" is nothing more elaborate than adding one
  known string to a `Set` the planner already knows how to read back.

`extendsRecipe(candidateType, recipe)` is what stops step 1 from being
overzealous: picking "API Server" (`recipe = [client, api]`) with a
Client → API → Database already built should *not* demand deleting the
Database, because `database`'s own recipe is `api`'s recipe plus one
more step — that Database is exactly where the story naturally
continues, not clutter. Only a node whose type extends *no* recipe past
the current one counts as genuinely extraneous.

## Why every recipe (except Client's) ends on something real

Every entity except Client/API/Database fails every request it
dispatches — for real, inside the discrete-event simulation, not as a
tutorial-engine special case — the instant it has nothing wired
downstream (`ctx.downstream.length === 0` triggers a real
`REQUEST_FAILED("no_downstream_connection")`; see each entity's own
source, e.g. `LoadBalancer.ts`, `Cache.ts`, `Kafka.ts`). An earlier
version of this table had Message Queue, Replica Pool, and Kafka's
recipes end *on* that entity — which meant the walkthrough itself led a
student to build something broken by construction. Every recipe in the
current table places something real downstream where that matters: the
fan-out entities and CDN/Rate Limiter/Reverse Proxy end in `api`;
Cache/Circuit Breaker/Message Queue/Kafka/Replica Pool end in `database`.
This history (six real bugs found by clicking through every recipe, not
by inspection) is documented in full in `docs/TUTORIAL-ENTITIES.md`,
which is the design/checklist doc this table was built against — the
code above reflects its current, already-fixed state.

The **agentic-domain recipes** (`llm_call`, `tool_call`,
`agent_orchestrator`, `memory_context_store`, `retriever`,
`guardrail_validator`, `model_router`, `human_in_loop_gate` —
`docs/Agentic_AI.md`'s curriculum, reachable from `TutorialPanel`'s own
separate "Agentic AI" picker group) don't all follow this same
one-hop-past-the-target shape. Several — `llm_call`,
`memory_context_store`, `human_in_loop_gate` — are documented in their
own class files as safe to end a chain on, so their recipes close on the
target itself rather than reaching one step further (e.g.
`memory_context_store`'s recipe is `["client", "llm_call",
"memory_context_store"]`, not one entity longer). `retriever`'s recipe
also runs in the *opposite* direction from `memory_context_store`'s:
`["client", "retriever", "llm_call"]` — a retriever sits upstream of the
`llm_call` it feeds context into, not downstream of one. None of this is
a special case inside `computeCurrentStep` itself; it falls out entirely
from what each `TUTORIAL_RECIPES` entry actually contains.

## Entering and exiting

- **Enter:** the Workshop header's own "Tutorial" link (`WorkshopHeader.tsx`)
  and the landing page nav (`HomeView.tsx`) both link straight to
  `/tutorial`. Landing there with no `activeTarget` shows `TutorialPanel`'s
  picker: "Core Flow" (Client → API → Database) featured, then every
  catalog entry grouped Core / Modules / Agentic AI, filtered from
  `ENTITY_CATALOG` (disabled entries are catalog items not yet
  `implemented`).
- **Pick a target:** `pickTarget` sets `activeTarget`, clears
  `acknowledgedIds`, and unpauses — always a fresh acknowledgment set,
  even when switching targets without leaving the canvas, since a "read
  the config" ack for one entity has no bearing on another's.
- **Pause vs. exit:** "Hide guide" (`TourOverlay`'s × or the panel's
  pause button) sets `paused = true` — the compact status panel stays
  showing target + current step title, and un-pausing resumes exactly
  where `computeCurrentStep` says the canvas is now. "Choose a different
  tutorial" (`RefreshCw` icon) fully resets `activeTarget` to `null`
  and returns to the picker, staying on `/tutorial`. "Exit tutorial"
  (the × next to the panel header, or the `Link` in the picker) navigates
  to `/workshop` — a real route change, distinct from both of the above,
  needed because `WorkshopHeader`'s own nav has no link back into
  `/tutorial` and loading a scenario from its menu doesn't navigate away
  either. Since canvas state lives in the zustand store (`useWorkshopStore`),
  not route state, navigating between `/tutorial` and `/workshop` doesn't
  touch the canvas at all.

## Rendering a step: `TourOverlay`

`TourOverlay` (`src/components/tour/TourOverlay.tsx`) takes the current
`TourStep` and renders a dimmed backdrop with a spotlight cutout around
`step.getTarget()` (a function, not a static selector, re-evaluated live
via `useLiveRect` — most targets don't exist in the DOM until an earlier
step completes, e.g. "the Client node" only exists once step 1 is done),
plus an anchored callout bubble on the side given by `step.placement`.
The backdrop and spotlight are `pointer-events: none` except the
callout's own buttons — the user interacts with the *real* sidebar card,
the *real* canvas node, the *real* Run button underneath the overlay, not
a copy of it.

A step with `requiresAck: true` shows an explicit "Next"/`primaryLabel`
button; every other step is auto-advancing (`isAutoAdvancing = !step.requiresAck`)
— there's no button because there's nothing to click: the step simply
stops being current the instant `computeCurrentStep` no longer finds a
reason to show it (a node got added, an edge got drawn, a simulation
finished).
