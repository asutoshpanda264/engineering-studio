# Expansion_TODO.md

## Five new pillars, tracked in one place, built one at a time

This tracks the next phase of Engineering Studio beyond the original
distributed-systems workshop: **Agentic AI system design**, an interactive
**LLD/UML workshop**, a **DevOps/CI-CD sandbox**, an **MLOps sandbox**, and a
**Common Scenarios** case-study track.

Nothing here is being built simultaneously. We pick one pillar, take it to a
working end-to-end state (content + interaction + tests), mark it done below,
then move to the next. This doc exists so the other three don't get lost or
forgotten while one is in progress, and so each pillar's shape is decided
*before* code, per this repo's documentation-driven convention.

**The one rule every pillar must satisfy:** it has to earn its place next to
the existing workshop's core claim — *"the simulation creates reality, the UI
only reveals it."* A pillar that's just another reading room with prettier
diagrams is resume-fodder. A pillar where the user builds something, it runs
under real (if simplified) mechanics, and it can visibly break, is not. Each
section below states concretely what "build → simulate/model → break → learn"
means for that domain — if a pillar can't answer that, it doesn't ship until
it can.

---

## Status

| Pillar | Status | Interaction model |
|---|---|---|
| A. Agentic AI system design | ✅ Done — see `docs/Agentic_AI.md` | Reuses discrete-event Simulator (new entity domain) |
| B. LLD / UML workshop | ✅ Done — all 5 phases landed (editor + SOLID/pattern linter + case-study challenges + TS codegen export) at `/lld/editor` | New: structural diagram editor + static linter |
| C. DevOps / CI-CD sandbox | 🔲 Not started | Reuses discrete-event Simulator (new entity domain) |
| D. MLOps sandbox | 🔲 Not started | Reuses discrete-event Simulator (new entity domain) |
| E. Common Scenarios (case studies) | 🚧 In progress — RAG System landed at `/case-studies` | No new domain — reference-design content track, reuses existing scenario engine per-entry |

Update the Status column (`🔲 Not started` → `🚧 In progress` → `✅ Done`) as
work begins/lands. Don't reorder the table to reflect priority — priority is
decided fresh each time we pick the next pillar, not fixed now.

---

## Cross-cutting plumbing (read once, applies to A/C/D)

Three of the four pillars are **new domains for the existing simulation
engine**, not new engines. `src/simulation/` is already framework-independent
and generic over "entities that receive events and emit events" — see
`src/simulation/entities/Entity.ts`'s `handleEvent(event, ctx) → SimulationEvent[]`
contract and `src/simulation/types/index.ts`'s `EntityType` union. Adding a
new domain means:

1. Extend `EntityType` (`src/simulation/types/index.ts`) with the domain's
   entity kinds.
2. Implement each as an `Entity` in `src/simulation/entities/`, same pattern
   as `APIServer.ts` / `Cache.ts` — admit → process → emit, bounded
   concurrency/queueing where it makes sense, all randomness through
   `ctx.rng` for determinism.
3. Register in `src/lib/entityCatalog.ts` (icon, name, description, phase)
   so the Component Library sidebar and node labeling pick it up for free.
4. Add node visuals under `src/components/workshop/nodes/` — the canvas,
   Inspector, playback, and metrics panel are already generic over entity
   type and need no changes.
5. Failure injection reuses the existing villain-attack pattern
   (`src/content/workshop/villainAttacks.ts`) — a new domain adds its own
   attack list (e.g. "hallucinated tool call," "flaky test," "training job
   OOM") rather than a new mechanism.
6. A domain-appropriate metric set may be needed alongside the generic
   latency/throughput ones already in `MetricsCollector` (e.g. DORA metrics
   for pipelines, token cost for agents, drift score for ML) — extend
   `MetricsSnapshot`, don't fork it.
7. Content: mirror `/lld`'s existing shape — `src/content/<domain>/types.ts`
   + `index.ts` + `lessons/NN-slug.ts`, reusing `LessonSection`/
   `LessonExercise` from `src/content/shared/lesson.ts` rather than
   inventing a new schema.
8. Route: `src/app/<domain>/page.tsx` + `[slug]/page.tsx`, same as
   `/foundations`, `/entities`, `/lld`.

Pillar B (LLD/UML) is the one exception — it needs a genuinely new canvas
paradigm (structural diagram, not traffic flow), detailed in its own section.

---

## A. Agentic AI system design

**What "build → simulate → break → learn" means here:** the user wires up an
agent architecture on the canvas — an orchestrator, one or more LLM call
nodes, tool calls, a retriever, a memory/context store, maybe a
guardrail/validator and a human-in-the-loop gate — and runs it against a
synthetic request stream, the same way traffic flows through the current
workshop. What actually "runs" is simplified (no real model call — a
configurable latency/cost/failure-rate distribution stands in for the LLM),
but the *consequences* are real: watch a context window overflow because
nothing summarizes history, watch cost balloon because every sub-task
spawns a fresh LLM call instead of batching, watch a tool-call failure
cascade because there's no retry/guardrail.

**New entity types** (`EntityType` additions):
- `llm_call` — configurable latency distribution, token cost, hallucination
  rate; the core primitive most other nodes route through.
- `agent_orchestrator` — routes to sub-agents/tools, holds the loop that can
  be the site of an infinite-loop failure mode.
- `tool_call` — external API/function call stand-in: configurable
  latency, failure rate, timeout.
- `retriever` — vector-DB-shaped lookup: hit rate, latency, stale-index
  failure mode (echoes `Cache`'s shape closely — likely composes it).
- `memory_context_store` — bounded context window; the entity whose
  capacity limit becomes "context overflow" the way `Database`'s queue
  becoming full is today's "dropping requests."
- `guardrail_validator` — inline check that can reject/retry upstream
  output; the entity that makes "add a guardrail" a legible fix the same
  way "add a cache" is today.
- `human_in_loop_gate` — deliberate latency injection + approval branch.

**Failure modes (villain attacks for this domain):** tool-call timeout,
hallucinated tool call (malformed args downstream chokes on), context-window
overflow, runaway agent loop (orchestrator re-invokes itself past a bound),
retriever returning stale/irrelevant context, cost blowup from unbounded
fan-out.

**Metrics beyond latency/throughput:** cost per request (token-based),
loop/iteration count, guardrail rejection rate.

**Content:** `/agentic` reading track pairing each entity/failure mode with
the underlying concept (RAG, ReAct-style loops, planner/executor split,
context management, guardrails) — same lesson shape as `/foundations`.

**Phases:**
1. Content-only track (`/agentic` lessons) + entity catalog additions,
   `llm_call` and `tool_call` only, no orchestration yet — smallest possible
   slice that's still "real."
2. `agent_orchestrator`, `retriever`, `memory_context_store` + their failure
   modes and villain attacks.
3. `guardrail_validator`, `human_in_loop_gate`, cost metrics, suggestion
   engine entries (e.g. "add a guardrail," "add context summarization").
4. Scenario(s): e.g. "customer-support agent" end-to-end, with a validator
   like the existing `src/scenarios/`.

---

## B. LLD / UML workshop

**What "build → model → break → learn" means here:** `/lld` already has 15
reading lessons (OOP, SOLID, patterns, case studies like Parking Lot, LRU
Cache, Elevator System). This pillar turns it into an actual **class-diagram
editor**: drag classes/interfaces onto a canvas, wire relationships
(inheritance, composition, aggregation, association, realization), fill in
fields/methods/visibility. "Break it" isn't failure injection (there's no
traffic to fail) — it's a **static linter over the diagram graph** that
flags real design problems as the user builds: a class with 15
responsibilities (SRP violation), a subclass that overrides a method to
throw `NotImplementedError` (LSP violation), concrete-class-to-concrete-class
coupling where an interface should sit between them (DIP violation), a
diamond inheritance a language wouldn't support. The case-study lessons
become **build challenges**: given the Parking Lot / Elevator / Splitwise
prompt, model it, and the linter + a structural check (does the diagram
actually support the exercise's required operations?) tells you if it holds
up — this is the domain's equivalent of the workshop's Results panel.

**New interaction model (not the traffic-sim engine):**
- Canvas: XY Flow again (proven in the workshop), but new node kinds —
  `ClassNode` (name, fields with type+visibility, methods with
  signature+visibility, abstract/interface flag) and new edge kinds for the
  five UML relationship types, each with correct arrow/line semantics
  (open triangle for inheritance, filled diamond for composition, hollow
  diamond for aggregation, dashed arrow for realization).
- A structural analysis module (`src/lld-modeling/`, mirroring
  `src/simulation/`'s "zero React imports, pure TS, deterministic" shape,
  but operating on a static graph instead of an event timeline) that walks
  the diagram and reports principle violations + coverage against a
  challenge's required behavior.
- Optional stretch: codegen — emit TypeScript class stubs from the diagram,
  so "download your design as code" is a real, checkable artifact.

**Content:** existing 15 lessons stay as the conceptual track; `04-uml-class-
diagrams.ts` gets paired directly with the new editor; the 6 case-study
lessons (09–15) each gain a `relatedEntitySlugs`-style link to a buildable
challenge on the new canvas.

**Phases:**
1. ✅ Class-diagram canvas: `ClassNode`, the 5 relationship edge types, an
   Inspector for editing fields/methods — no linting yet, just a correct
   editor. Landed: `/lld/editor` route, `EditorShell`/`DiagramCanvas`/
   `ClassNode`/`RelationshipEdge`/`InspectorPanel`/`PaletteSidebar` under
   `src/components/lld/`, framework-independent `src/lld-modeling/types.ts`,
   `lldStore.ts`. `tsc`/`vitest`/`lint` all clean. Not yet live-checked —
   queued in `docs/BROWSER-CHECKS.md`.
2. ✅ SOLID linter pass 1 (SRP via method/field count heuristics, LSP via
   override-throws detection, DIP via concrete-coupling detection) with
   results surfaced the way the workshop's suggestion engine surfaces fixes.
   Landed: `src/lld-modeling/linter.ts` (`lintClassDiagram`, pure/zero-React,
   operating on a new `ClassDiagram` plain-graph shape — not XY Flow's
   `Node`/`Edge`, mirroring `workshopBridge.ts`'s boundary), `lldStore.ts`'s
   `toClassDiagram()` bridge, a new `ClassMethod.implementationNote` field
   (the LSP rule's only signal for "this override just throws" — no method
   bodies exist otherwise), and `LintPanel.tsx` (always-live, not gated on
   a run — there's no simulation step here). `tsc`/`vitest`/`lint` all
   clean. Not yet live-checked — queued in `docs/BROWSER-CHECKS.md`.
3. ✅ Design-pattern recognition/suggestion (e.g. "this looks like it wants a
   Strategy" when a class switches on type) — pairs with lessons 06–08.
   Landed: two new `linter.ts` rules — Strategy (3+ methods sharing a
   camelCase-aligned name prefix, the doc's own example) and Factory
   Method (a class coupled directly to 2+ concrete siblings that share an
   interface/abstract supertype) — both `info`-severity suggestions, not
   asserted violations, each linking to its `/lld` lesson section
   (`behavioral-patterns#strategy`, `creational-patterns#factory-method`)
   via a new `relatedLessonHref`, opened in a new tab since the editor has
   no autosave. `LintFinding.principle` renamed to `category` (patterns
   aren't SOLID principles). Deliberately skipped a lesson-07 structural-
   pattern rule (Adapter/Decorator/Facade/Proxy/Composite) — no
   comparably strong, low-false-positive signal exists from a diagram with
   no method bodies; worth revisiting if one turns up. `tsc`/`vitest`
   (1215 tests, 18 new)/`lint` all clean. Not yet live-checked — queued in
   `docs/BROWSER-CHECKS.md`.
4. ✅ Wire the 6 case studies as build challenges with structural pass/fail
   checks. Landed: `src/lld-modeling/challenges.ts` (`ClassDiagramChallenge`,
   `evaluateChallenge`, pure/zero-React over the same `ClassDiagram` shape),
   wiring all **7** case-study lessons — the doc's "6" predates Rate
   Limiter shipping as the track's 7th case study, flagged rather than
   arbitrarily dropped. Each challenge is a short list of structural
   requirements (min class count, required relationship kinds, method/
   field name patterns, "≥2 implementers of one interface" for the
   swappable-algorithm problems) — deliberately honest that this checks
   diagram *shape*, not real behavior, since there's no code to run. New
   `ChallengeBriefing.tsx` (mounted in the Inspector's empty-selection slot,
   same precedent the real Workshop sets for its scenario briefing) shows
   the live pass/fail checklist + an Exit control; `lldStore.ts` gained
   `activeChallengeId`/`startChallenge`/`exitChallenge`. Each case-study
   lesson page (`/lld/[slug]`) gained a "Build it" CTA deep-linking to
   `/lld/editor?challenge=<slug>` (same `?scenario=` precedent `/workshop`
   sets), read by a new `ChallengeDeepLink` on mount only. `tsc`/`vitest`
   (1235 tests, 20 new)/`lint` all clean. Not yet live-checked — queued in
   `docs/BROWSER-CHECKS.md`.
5. Stretch: TS codegen export.

---

## C. DevOps / CI-CD sandbox

**What "build → simulate → break → learn" means here:** the user wires a
pipeline — source trigger → build stage → test stage → artifact registry →
one or more environments with a deploy strategy (rolling / canary /
blue-green) → a monitor that can trigger automatic rollback. Commits flow
through it as events, the same discrete-event shape as HTTP requests flow
through the current workshop, just at pipeline-stage granularity instead of
request granularity. "Break it" is genuinely instructive here: a flaky test
that fails intermittently, a canary stage with no automated rollback watching
error rate spike and shipping the bad build to 100% anyway, a deploy with no
health check going straight to serving traffic.

**New entity types:** `source_trigger`, `build_stage` (configurable
duration, failure rate), `test_stage` (configurable flakiness), `artifact_
registry`, `deploy_strategy` (mode: rolling/canary/blue-green, each with
real differences in *when* traffic shifts and what a bad build costs),
`environment` (dev/staging/prod, each serving live "traffic" post-deploy —
can compose the existing API/Database entities so a bad deploy visibly
degrades the exact same metrics panel), `rollback_monitor` (watches
post-deploy error rate, triggers rollback past a threshold — the direct
analog of `CircuitBreaker`).

**Failure modes:** flaky test blocking/passing nondeterministically, build
timeout, canary with no rollback monitor shipping a regression to 100%,
deploy with no health-check gate, secrets/config missing in one environment
only.

**Metrics beyond latency/throughput:** the DORA four — deployment frequency,
lead time for changes, change failure rate, MTTR — computed from the event
timeline exactly the way current metrics are (never tracked incrementally),
consistent with `MetricsCollector`'s existing philosophy.

**Content:** `/devops` track — pipeline stages, deploy strategies, the DORA
metrics themselves as a lesson (measuring what you build, tying back to
Foundations' load-balancer/scaling material).

**Phases:**
1. `source_trigger` → `build_stage` → `test_stage` → `artifact_registry`,
   linear pipeline only, no deploy strategy yet.
2. `environment` + `deploy_strategy` (rolling first), composing existing
   API/Database entities so a bad deploy visibly shows up in the familiar
   metrics panel.
3. `rollback_monitor` + canary/blue-green modes + failure catalog.
4. DORA metrics panel + a scenario (e.g. "ship a hotfix safely").

---

## D. MLOps sandbox

**What "build → simulate → break → learn" means here:** data ingestion →
feature store → training job → model registry → serving endpoint → drift
monitor → retrain trigger, as a pipeline the user assembles and runs against
synthetic data batches over simulated time (not single requests — this
domain's natural unit is a "batch" or "day," closer to the CDN's edge-latency
comparison than to per-request traffic). "Break it": train on data that
doesn't match what serving actually sees (train/serve skew) and watch
accuracy silently decay in production with no monitor catching it; a model
registry with no rollback serving a regressed model; a drift monitor that
exists but has no retrain trigger wired to it, so drift is detected and
nothing happens.

**New entity types:** `data_source` / `ingestion`, `feature_store`
(train/serve skew is representable as this entity computing features
differently depending on which path calls it — a genuinely instructive bug
to expose), `training_job` (duration, resource/OOM failure mode, produces a
model artifact with a quality score), `model_registry` (versions, promotion,
rollback), `serving_endpoint` (the thing "real" traffic hits — can reuse
`APIServer`'s bounded-concurrency shape, output quality tied to which model
version is live), `drift_monitor` (watches serving distribution vs. training
distribution), `retrain_trigger` (the analog of `rollback_monitor` — only
useful if actually wired to the drift monitor).

**Failure modes:** train/serve skew, silent accuracy decay with no monitor,
model registry with no rollback path, drift detected but no retrain trigger
wired, training job OOM/resource exhaustion, stale model served long after a
better one is registered.

**Metrics beyond latency/throughput:** model quality/accuracy score over
simulated time, drift score, staleness (time since last retrain vs. drift
onset).

**Content:** `/mlops` track — feature stores, train/serve skew, drift,
retraining triggers, model registries — the ML-systems equivalent of
Foundations' infra lessons.

**Phases:**
1. `data_source` → `feature_store` → `training_job` → `model_registry`,
   linear, no serving yet.
2. `serving_endpoint` composing `APIServer`, model version tied to output
   quality metric.
3. `drift_monitor` + `retrain_trigger` + the failure catalog above.
4. Scenario (e.g. "fraud-detection model drifting under new traffic
   patterns").

---

## E. Common Scenarios (case-study reference designs)

**How this pillar differs from A–D:** A–D each add a genuinely new
simulation domain — new entity types, new failure modes, new metrics — plus
a content track for it. This one doesn't. It adds **no new simulation
domain**; it's a reference-design content track that synthesizes concepts
*already* taught elsewhere (Agentic AI, Foundations, Entities) into complete,
worked architectures — the same relationship `/lld`'s case studies (Parking
Lot, Splitwise, Elevator System, …) already have to that track's own
OOP/SOLID/pattern lessons, except a given entry here can span *multiple*
tracks instead of staying inside one (a Trip-Planning Agent case study pulls
from Agentic AI; a Twitter case study would pull from Foundations).

"Build → simulate → break → learn" is therefore satisfied **per entry, not
uniformly**: an entry whose architecture is genuinely traffic-shaped (RAG
System, AI Search, Trip-Planning Agent) gets a real "Build it" deep link
into a buildable, simulatable Workshop scenario. An entry that's fundamentally
a protocol/interface design rather than a request-traffic system (MCP
Design) stays a diagram + walkthrough, honestly, rather than forcing a fake
simulation onto it just to match the other pillars' shape.

**New reading room:** a 5th tile on `/learn`, alongside Foundations, LLD,
Entities, and Agentic AI. Route TBD (`/case-studies` is the working name —
deliberately not `/scenarios`, which would collide in spirit with the
existing `/problems` route: that page lists graded, pass/fail exercises
built from `src/scenarios/`, a different content shape from this track's
worked-reference walkthroughs, and the two shouldn't be confused).

**Content shape:** `src/content/caseStudies/` mirroring the `types.ts` +
`index.ts` + `lessons/NN-slug.ts` shape every other track already uses
(`/foundations`, `/lld`, `/agentic`). Each entry: the full architecture
diagram, a walkthrough of every component choice and *why* (cross-linking
back to the relevant `/agentic` or `/foundations` lesson for any concept it
leans on, rather than re-teaching that concept inline), and — where
applicable — a "Build it" CTA deep-linking to `/workshop?scenario=<id>`,
the same precedent each `/lld/[slug]` case-study page already sets for
`/lld/editor?challenge=<slug>`.

**Phase 1 — the four agentic case studies (live thread, build first):**
1. ✅ **RAG System** — maps almost directly onto the existing
   `researchAssistant.ts` scenario (the Pipeline vs. GraphRAG vs. Adaptive
   retriever-mode choice); what's actually missing today is the reading-room
   walkthrough of *why* that architecture looks the way it does, not the
   simulation itself. Landed: `src/content/caseStudies/` (`types.ts` +
   `index.ts` + `lessons/01-rag-system.ts`, mirroring `agentic/`'s exact
   shape — no Lock-In wiring, same reasoning `/agentic/[slug]` gives),
   `/case-studies` + `/case-studies/[slug]` routes (same article shell as
   the other four reading rooms, plus two new optional sections:
   "Builds on" for `crossLinks` back to `/agentic/rag-architectures`, and
   "Build it" deep-linking straight into the real `research-assistant`
   Workshop scenario), a 5th tile on `/learn`, and the Batman-Mode arcade
   map (`CaseStudiesMap` + `mapLayout.ts`, reusing the existing generic
   `computeTieredMapLayout`/`PannableMapCanvas`/`MapRegions` machinery the
   other three maps already share — cheap to add once, since it was
   already generalized past one use case). `category` is `"agentic" |
   "classic-hld"` from day one, one tier populated, so Phase 2 slots in
   without a schema change. `tsc`/`vitest` (1504 tests)/`lint` all clean.
   Not yet live-checked — queued in `docs/BROWSER-CHECKS.md`.
2. **AI Search** — retrieval + ranking, traffic-shaped. Check whether
   `trendingProductSearch.ts` or `slowSearchEndpoint.ts` already covers this
   shape before writing a new scenario — neither is currently framed as a
   ranking/search-quality problem specifically, so a new one is likely
   needed, but confirm rather than assume.
3. **MCP Design** — diagram + walkthrough only, no Workshop build. Pairs
   directly with the existing `05-mcp-and-a2a-overview.ts` agentic lesson;
   the case study is "here's a real MCP server's tool/resource/prompt
   surface, and the design decisions in it," not something with request
   traffic to run.
4. **Trip-Planning Agent** — orchestrator + multiple tool calls (flight
   search, hotel search, booking) + a human-in-loop gate on the actual
   booking confirmation. No existing scenario covers multi-tool booking, so
   this is the one genuinely new scenario the pillar needs. Composes
   `agent_orchestrator` / `tool_call` / `human_in_loop_gate` — confirm those
   have actually landed in `src/lib/entityCatalog.ts` (Pillar A phases 2–3)
   before scoping this scenario's build; if any haven't, that's a dependency
   on Pillar A, not a blocker to writing the lesson content itself.

**Phase 2 — classic HLD case studies (deferred, scoped now so it isn't
lost):** Twitter, Netflix, Hotel Management, and a distributed/HLD take on
**Parking Lot**. That last one is deliberately not a duplicate of
`src/content/lld/lessons/09-parking-lot.ts` — the LLD lesson is a
class-design/OOP problem (one process, the question is object modeling);
this entry would be the multi-service version (load balancer, cache, queue,
DB — the question is distribution and failure), same story as Movie Ticket
Booking already having both an LLD case study and a `movieTicketBooking.ts`
Workshop scenario side by side without conflict. Each Phase 2 entry draws
mostly on `/foundations` concepts (load balancing, caching, CDN, replication,
message queues, sharding), the same relationship the agentic four have to
`/agentic`.

---

## Sequencing

No pillar is scheduled yet. When we're ready to start the next one: revisit
this doc, confirm the pillar and its Phase 1 scope, then treat that phase
like any other feature — plan → build → `tsc`/`vitest`/`lint` → note UI/CSS
checks in `docs/BROWSER-CHECKS.md` per `AGENTS.md` → batch-verify in one
browser session when a batch is ready, per `AGENTS.md`'s workflow.
