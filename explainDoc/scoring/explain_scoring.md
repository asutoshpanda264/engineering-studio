# explain_scoring.md — how a build actually gets scored

Four independent modules do this, layered, never merged into one function:
`src/scenarios/validator.ts` (pass/fail against the scenario's own
constraints), `src/lib/costEngine.ts` (turns the canvas into a $/month
estimate), `src/lib/architectureValidation.ts` (a structural shape check —
did traffic skip the service layer), and `src/lib/scenarioScoring.ts`
(`scoreScenario`, the thing that actually combines the other three into
gates + a 0-5 star rating). `src/lib/bottleneckDetection.ts` and
`src/lib/difficultyDisplay.ts` are adjacent, smaller concerns — the first
flags *which* node is the problem, the second is pure display for an
author-set difficulty number, not a computed score.

## Gates first, quality second

`scoreScenario` (`src/lib/scenarioScoring.ts:183`) computes three
independent booleans before it computes anything continuous:

| Gate | Computed by | What it checks |
|---|---|---|
| `evaluation.passed` | `evaluateScenario` (`scenarios/validator.ts`) | Every `ScenarioConstraint` (successRate, p95Latency, ...) compares the run's actual `MetricsSnapshot` value against its threshold via `lt`/`lte`/`gt`/`gte` |
| `budgetPassed` | inline in `computeBaseScore` | `estimateCost(...).totalMonthlyCost <= scenario.budgetUsd` (always true if the scenario has no `budgetUsd`, or if `ignoreBudget` is set) |
| `architectureValid` | `hasUnguardedBackendAccess` / `hasUnguardedIrreversibleAction` (`architectureValidation.ts`) | A structural graph check, not a metric — see below |

`gatesPassed = evaluation.passed && budgetPassed && architectureValid`. If
any one of these is false, `composite` is hard-set to `0` and `stars` to
`0` — there is no partial credit for "close on cost but failed latency."
Stars only ever grade a build that already fully works; they answer "now
that it works, how well," never "how close did you get."

## The architecture-shape gate — why it exists

`hasUnguardedBackendAccess` (`architectureValidation.ts:88`) runs a
barrier-BFS from every `client` node over the connection graph, stopping
expansion at any `api` node. If a `database`/`cache`/`message_queue`/
`kafka`/`replica_pool` is reachable *before* hitting an `api`, the gate
fails. This exists because of a real exploit found while tuning the URL
Shortener scenario: wiring a Client straight to a Database (skipping the
API Server entirely) is the cheapest way to "solve" any budget-gated
scenario, since `api` is the one meaningfully-priced compute tier in
`costEngine.ts` — and it wasn't scenario-specific, the same shortcut also
out-scored Movie Ticket Booking's own `optimalSolution` and earned
"legendary." A `cache` sitting directly off a Client is carved out as
legitimate *only* when it forwards into the agentic domain's own service
layer (`llm_call`, `model_router`, ...) — the documented cache-aside-in-
front-of-an-LLM pattern from `docs/Agentic_AI.md` §2.9, not the HLD
exploit this check was built to catch.

`hasUnguardedIrreversibleAction` is the same barrier-BFS shape for the
agentic domain: expansion stops at `human_in_loop_gate`; a `tool_call`
reachable before one fails the gate. Only checked when
`scenario.requiresGatedToolCalls` is set (the customer-support / coding-
agent / autonomous-ops-agent scenarios).

## The cost engine — turning a canvas into $/month

`estimateCost(result, nodes)` (`costEngine.ts:424`) prices every
non-`client` node independently via a per-`EntityType` `PricingModel`
(`api`, `database`, `cache`, `cdn`, `load_balancer`, `message_queue`,
`llm_call`, `tool_call`, `retriever` — anything else, e.g. `client` or a
not-yet-priced type, is silently skipped). Every model splits its result
into `monthlyBaseCost` (provisioned capacity, read purely from the node's
own config — real even with zero traffic, same as a real cloud bill) and
`monthlyUsageCost` (extrapolated from the run's observed request rate via
`monthlyVolume`, real cloud-billing convention of 730 hours/month). Two
things worth knowing before touching this file:

- **`result` is nullable on purpose.** Base cost needs no simulation run
  at all — `CostPanel.tsx` and `InspectorPanel.tsx`'s single-node cost
  display call `estimateCost(simulationResult, nodes)` where
  `simulationResult` may still be `null`, and get a real base-cost-only
  estimate back (`hasUsageData: false` on each entity tells the UI not to
  claim usage was "measured and came out to zero").
- **Every dollar figure is illustrative, not billing-accurate** — each
  pricing model's own doc comment names the real AWS/GCP service it's
  modeled after (t3.medium, Aurora I/O pricing, CloudFront egress, SQS
  per-request, ...) and the specific simplification taken (e.g. API
  Server's `requestCount` runs ~2x real client-facing volume because both
  the inbound and response legs route through the same
  `BoundedProcessor` — accepted as "not worth a fragile per-leg fix,"
  same call made for `llm_call`'s token-count assumption).

Per-entity `severity` (`normal`/`elevated`/`high`) comes from
`SEVERITY_THRESHOLDS`, calibrated per entity type against what that
single modeled node can *actually* reach given this app's own config
ceilings (a client's Request Rate slider maxes at 1000 req/s; each
entity's capacity field has its own schema max) — not generic production
fleet tiers, since one simulated node never represents a whole fleet. The
Cache pricing model is the concrete cautionary tale here:
`costEngine.test.ts`'s regression test (line 74) locks in that Cache cost
must scale with `capacity` across its full 1-10 reachable tier range — an
earlier `/1000` divisor made every reachable config (capped at 500 by the
schema) round to the same single tier, silently flatlining severity no
matter how a student configured it.

Architecture-wide `severity` is just the worst of any entity's severity;
`totalMonthlyCost` is the sum. See `costEngine.test.ts` for concrete
worked numbers — e.g. the CDN test proves `cdnPricing` must price off
`cdnEdges` (fires once per request) rather than raw `requestCount` (which
double-counts every cache miss), and the `promptCacheHitRate` test proves
a full prompt-cache hit rate discounts an `llm_call`'s usage cost to
~1/10th, per `docs/Agentic_AI.md` §2.9.

## Composite score → stars

Once all three gates pass, `computeBaseScore` (`scenarioScoring.ts:81`)
computes three 0-1 "headroom" scores — cost, latency, drop-rate — each via
the same `headroom(actual, bar)` function: `1` means actual sits at the
best-possible end of that axis (e.g. cost of $0), `0` means actual is
exactly at the pass bar, clamped to `[0,1]` either side. `composite` is
the unweighted average of the three. Any axis the scenario didn't
constrain (no `budgetUsd`, no `p95Latency` constraint, ...) contributes a
flat `1` rather than being excluded, so a scenario with fewer constraints
isn't penalized for having less to grade against.

```
composite >= 0.8  → 3 stars
composite >= 0.5  → 2 stars
composite <  0.5  → 1 star   (gatesPassed, below both bars — includes composite === 0)
gatesPassed=false → 0 stars, composite forced to 0
```

There's no separate "0 < composite" branch in the code — `computeBaseScore`
(`scenarioScoring.ts:122-123`) is a plain two-way `>= 0.8 ? 3 : >= 0.5 ? 2
: 1`, so once gates have passed, 1 star is the floor, not a fourth
threshold. A composite of exactly `0` — hit right at the pass bar on
every axis at once — is the worst a gates-passing build can score, and
it's still 1 star, same as anything else below 0.5: 1 star already means
"it works," 3 means "meaningfully better than bare-minimum on cost,
latency, and drop rate simultaneously," not "perfect." **4 stars is
deliberately skipped** — the jump from 3 to 5 is intentional, because 5
only ever means one specific thing: beating the reference solution, never
"close to it."

## 5 stars / "legendary" — beating the reference build

`scoreScenario` also computes the scenario's own `optimalSolution` (if one
is authored) through the exact same `computeBaseScore` path, via
`computeOptimalScore` — literally re-running `runSimulation` against the
reference architecture and scoring it like any other build. This is
cached module-wide, keyed by `${scenario.id}:${ignoreBudget}`, since an
`optimalSolution` is static authored data whose score can't change within
a session — recomputing it on every `scoreScenario` call would mean
re-running the simulation engine on every single playback frame.

```ts
legendary = base.gatesPassed && optimalComposite !== null && base.composite > optimalComposite;
stars = legendary ? 5 : base.stars;
```

Strictly greater-than, not greater-or-equal — matching the reference
build exactly is still "just" 3 stars if that's what its composite earns;
`legendary` means the student's own build genuinely outscored the
author's. Every shipped scenario file's own header comment says the same
thing for a reason: their `optimalSolution` was tuned using the real
`scoreScenario` function, never hand-computed math, so this comparison is
apples-to-apples by construction.

## The path from "Run Simulation" to a star rating on screen

Scoring is **not** gated behind a separate "Submit" click — it's a pure,
reactive recomputation that runs wherever `simulationResult` is non-null:

```
User clicks "Run Simulation"
  → workshopStore sets simulationResult (Simulator.ts runs instantly —
    the engine itself has no concept of playback time)
      → SimulationResultsPanel, InspectorPanel, and ScenarioCompletionToast
        each independently call scoreScenario(scenario, simulationResult,
        nodes, edges, !budgetCheckingEnabled) via useMemo
          → SimulationResultsPanel: persistent star stat in the bottom bar
          → InspectorPanel's ScenarioBriefing: full breakdown (hidden
            while a node is selected — see that file)
          → ScenarioCompletionToast: fires ONLY on the transition into
            score.gatesPassed === true for a genuinely NEW simulationResult
            (tracked by object reference, not a boolean flag — a fresh Run
            Simulation always produces a new object, so re-selecting a
            node or scrubbing playback never re-triggers it)
              → recordSolved(scenario.id, stars, underTime) — local
                progress (problemProgress.ts), "underTime" judged against
                wall-clock Date.now() vs. timedModeStartedAt, since the
                simulation itself computes instantly
              → submitBackendAttempt() — a separate, best-effort POST to
                engineering-studio-backend if the user is signed in AND has
                an open attempt (TIMED or NO_PRESSURE) for this scenario;
                fires regardless of `underTime` (a DIFFERENT, looser gate
                than recordSolved's — the backend computes its own
                elapsedSeconds-based speedFactor server-side, so it
                doesn't need a local pass/fail-on-time signal to decide
                whether to accept the submission). Builds its payload via
                `canvasToClientGraph` (`lib/workshopSubmission.ts`, the
                exact inverse of workshopStore's own canvas-building
                `entitiesToCanvas`) rather than reusing this file's
                `ArchitectureNode[]`/`connections` shape directly. See
                phase-frontend-integration/explain_frontend_integration.md
                in the backend repo's masterdoc for what happens after
                this call leaves the frontend. The backend computes its
                own points/speedFactor independently — this file's
                gatesPassed/stars/composite math has no reach into that
                and isn't read by it.
```

Two independent trackers, not one: `dismissedResult` (state) gates the
toast's own visibility/auto-dismiss, `recordedResult` (a ref) separately
guards `recordSolved`/`submitBackendAttempt` so dismissing the toast early
can never cause a re-record on some later, unrelated rerender. Both
compare the same way — by `simulationResult` object reference, not a
boolean — for the identical reason: a fresh Run Simulation always
produces a new object, so neither needs an explicit reset.

`budgetCheckingEnabled` (a global workshop toggle, `workshopStore.ts:158`)
is passed through as `scoreScenario`'s `ignoreBudget` argument (inverted)
— when off, both the student's build AND the reference solution are
scored with `budgetUsd` treated as absent, so toggling it never makes the
comparison unfair to one side. It's a single toggle, not a scenario field.

## Adjacent, smaller pieces

**`findBottleneckNodeId`** (`bottleneckDetection.ts`) — not part of
scoring at all, no gate reads it. Picks the single busiest non-`client`
node from the last run's `entityMetrics`, for `ComponentNode.tsx`'s
canvas-level "Bottleneck" spotlight and `DetectiveVisionHUD.tsx` (Batman
Mode — see `explainDoc/batman-mode/`). Returns `null` below a fixed 0.75
utilization threshold — a comfortably-provisioned run should never
manufacture a bottleneck that isn't really there.

**`difficultyDisplay.ts`** — purely presentational. `Scenario.difficulty`
(1-5) is author-set content, not computed from a run; this module only
supplies the shared bracket-meter rendering (`[##---]`, ASCII rather than
Unicode block glyphs because the loaded font subset doesn't cover them)
and the healthy/degraded/critical color mapping, consolidating what used
to be three separately-styled duplicates across the landing page, the
Workshop's scenario dropdown, and the Inspector.
