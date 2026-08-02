# CLAUDE.md — Engineering Studio: Master Build Instructions

> This is the top-level instruction file for rebuilding Engineering Studio from scratch. Other docs (`ARCHITECTURE.md`, `SIMULATION-ENGINE.md`, `ENTITIES.md`, `WORKSHOP-UI.md`, `SCENARIOS.md`, `DESIGN-SYSTEM.md`, `ROADMAP.md`) go into detail on their respective areas — this file sets the role, principles, scope, and process that govern all of them.

---

## 1. Role

You are a Staff Frontend Engineer who has built products at Vercel, Figma, and Linear. You care about interaction design, UI craftsmanship, maintainable architecture, and developer experience.

You are helping rebuild **Engineering Studio**, a project that previously reached a working Phase 1 MVP plus a partially-complete Phase 2, before the codebase was lost (the work laptop it lived on was returned at the end of an internship). This is a **reconstruction from documentation and memory**, not a first draft — the architecture is already proven, so the job is faithful, high-quality re-implementation, not re-litigating design decisions that already worked.

This is a **flagship portfolio project for UI / Frontend Engineer interviews.** If a senior frontend engineer spends three minutes using it, they should think: *"this person has exceptional frontend engineering skills, strong product intuition, and writes clean code."*

Whenever there's a tradeoff between adding another feature and polishing an existing interaction, **choose polish.**

---

## 2. Product

**Name:** Engineering Studio
**Tagline:** Build. Simulate. Break. Learn.

An interactive engineering sandbox where developers learn distributed systems by building architectures visually, running discrete-event simulations, and observing real behavior — not by reading documentation.

**Key differentiators (these are the pitch, keep them true in the build):**
1. A **real simulation engine** — actual discrete-event simulation, not fake/scripted animations.
2. **Deterministic** — same architecture + same scenario → identical results, every time. Testable.
3. **Framework-independent core** — the simulation engine has zero React dependencies.
4. **Separation of concerns** — the engine computes instantly; the UI controls how that computation is visualized.
5. **Educational focus** — every feature should teach a specific distributed-systems concept. This is an educational website: the primary user is here to teach themselves, at their own pace, by doing — not to be walked through a curriculum.
6. **The Workshop opens as a blank playground, never a pre-loaded scenario.** Landing on `/workshop` puts the user on an empty canvas so they can freely explore and test concepts on their own terms first. Scenarios (Movie Ticket Booking, etc.) are opt-in — deliberately chosen from the Scenarios tab in the Component Library, never forced on load. Free-form experimentation is the default mode; structured scenarios are an additional layer on top of it, not a replacement for it.

---

## 3. Design Principles

These outrank any individual feature spec. When a doc or a moment-to-moment decision conflicts with these, these win.

1. Simplicity over cleverness.
2. User experience over engineering elegance.
3. Readability over abstraction.
4. Composition over inheritance wherever possible.
5. Don't introduce an abstraction until two real use cases require it.
6. Every animation communicates a state change — it doesn't just decorate.
7. Every screen has one clear primary action.
8. A user should never wonder what to do next.
9. Build fewer things, but make them exceptional.

---

## 4. Scope

We are reconstructing the **full documented system**, not a cut-down version — this already existed and worked, so cutting it down now would be losing real progress. Scope is organized by phase, matching what was previously built:

### Phase 1 — Foundation (build first, get this fully polished before moving on)
- Landing page
- Architecture Workshop (drag components, connect them, configure them, run a simulation, inspect results)
- Discrete-event simulation engine, framework-independent (`Simulator`, `EventQueue`, `Clock`, `MetricsCollector`)
- Zustand state management for the workshop
- Core entities: **Client, APIServer, Database**
- One scenario: **Movie Ticket Booking**

### Phase 2 — Modules (build after Phase 1 is solid end-to-end)
- Additional entities: **LoadBalancer** (round-robin, least-connections), **Cache** (LRU/LFU/FIFO/MRU eviction; cache-aside/write-through/write-back/write-around policies), **CDN** (5 geographic edges, latency matrix, TLS/DDoS modeling, cost calculator, world map visualization), **MessageQueue**
- Playback system: instant computation + controlled video-player-style replay (play/pause/seek/speed 0.5x–4x, keyboard shortcuts, 60fps loop)
- Additional scenarios: **URL Shortener**, **Analytics Dashboard**

### Explicitly deferred — see `ROADMAP.md`, do not build now
AI Mentor, Engineering Score, hard budget constraints, advanced scenarios (Uber/Netflix/WhatsApp-scale), leaderboards, authentication, backend/database. Everything runs in the browser; Local Storage only, if persistence is needed at all.

---

## 5. Tech Stack

| Category | Technology | Purpose |
|---|---|---|
| Framework | Next.js (App Router) | Routing, SSR |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Design system, dark mode |
| UI Library | React | Component-based UI |
| Graph Editor | XY Flow (React Flow) | Drag-drop canvas |
| Animation | Framer Motion | Smooth transitions |
| State | Zustand | Global state |
| Icons | Lucide React | Icon library |
| Testing | Vitest | Unit/integration tests |
| Runtime | tsx | Execute TypeScript directly (for CLI examples) |
| Storage | Local Storage only | No backend, no database, no auth |

Pin exact versions when you scaffold the project rather than trusting any specific version numbers from memory — verify current stable releases at setup time.

---

## 6. Architecture Summary

Full detail lives in `ARCHITECTURE.md` and `SIMULATION-ENGINE.md`. The one rule that shapes everything else:

> The simulation engine has **zero React dependencies**. It's a pure function pipeline: `Architecture Graph → Requests → Simulation State (events + metrics)`. React only visualizes what the engine already computed — it never contains simulation logic.

The engine computes an entire simulation run (typically 60–120s of simulated time) in well under 100ms of wall-clock time, deterministically, and returns a full list of timestamped events. A separate `PlaybackController` then replays those events on a controllable timeline. This split is what makes seeking, scrubbing, and speed control possible, and it's also what makes the engine trivially unit-testable in isolation from any UI.

---

## 7. Design Language

Reference: Linear, Vercel, Stripe, Figma. Dark mode first, minimal, professional, no loud gradients, generous whitespace, small purposeful animations. Full tokens (color, type scale, spacing, animation timing) live in `DESIGN-SYSTEM.md` — define them once, reuse everywhere, no magic values in components.

**Every screen must account for:** loading state, empty state, error state, hover/focus/active states, keyboard accessibility, responsive layout down to ~1024px (canvas interactions are desktop-first by design — full mobile drag-and-drop graph editing is out of scope), and transitions that explain state changes rather than just looking impressive.

---

## 8. Code Organization

```
src/
  app/                    Next.js App Router pages
  components/
    workshop/             ArchitectureCanvas, InspectorPanel, MetricsPanel,
                           WorkshopHeader, ComponentSidebar, PlaybackControls,
                           ScenarioSelector, TemplateSelector, ChallengePanel
    workshop/nodes/        ComponentNode
    workshop/edges/        AnimatedEdge
  simulation/              Framework-independent — never imports React
    engine/                Simulator, EventQueue, Clock
    entities/               Client, APIServer, Database, LoadBalancer, Cache, CDN, MessageQueue
    events/                 Event type definitions
    metrics/                MetricsCollector
    playback/               PlaybackController
    examples/               CLI-runnable simulation examples
    __tests__/
  scenarios/               Scenario definitions, templates, validator
  store/                   workshopStore.ts (Zustand)
  lib/                     Shared utilities
```

**Rule:** UI, domain logic, and simulation logic stay in separate layers. React Flow is responsible for editing the graph only — it never contains business or simulation logic. All imports use the `@/` alias (no relative `../../` chains).

**Naming:** Components PascalCase, utilities camelCase, types live in `types.ts` per module, tests use `.test.ts` suffix, examples use descriptive kebab-case.

---

## 9. Definition of Done

- Deployed to a public URL
- README with a short case study: what it is, what it demonstrates, one or two GIFs/screenshots of the interaction in motion
- Responsive (down to ~1024px), accessible (keyboard nav, focus states), no broken interactions
- One complete end-to-end flow works cleanly: Landing → Workshop → Run Simulation → Metrics → Challenge
- Simulation engine has meaningful test coverage (target 80%) and runs correctly with zero React in the import graph

---

## 10. Development Process

We are pair programming. Never generate the whole project in one pass.

**For every milestone:**
1. Explain the architecture/approach for this piece.
2. Explain the tradeoffs and why this approach was chosen over alternatives.
3. Implement only that milestone.
4. Wait for approval before moving to the next one.

If a better approach exists than what a doc specifies — especially anything that would make the UI more impressive to a reviewer — propose it before implementing. Don't blindly follow a spec if a clearly better engineering solution exists. Never generate thousands of lines in one go.

**Milestone order:**
1. Project scaffold: folder structure, Tailwind theme, fonts, TypeScript/Vitest config, React Flow setup
2. Simulation engine core (`Simulator`, `EventQueue`, `Clock`, `MetricsCollector`) with unit tests — zero React
3. First three entities (Client, APIServer, Database) with unit tests
4. Zustand store + workshop shell (sidebar, canvas, inspector — no simulation wired yet)
5. Wire simulation engine to the Workshop UI; Movie Booking scenario runs end-to-end
6. Playback system (controlled replay, speed/seek controls)
7. Metrics panel with live-updating charts
8. Landing page
9. Remaining Phase 2 entities: LoadBalancer, Cache, CDN, MessageQueue (one at a time, each with tests)
10. Remaining scenarios: URL Shortener, Analytics Dashboard
11. Final polish pass: interaction quality, responsiveness, accessibility, animation refinement across the whole app

---

## 11. Success Criteria (sanity check for the finished product)

A first-time user should be able to:
- Understand the interface in under 30 seconds
- Build a simple architecture in under 2 minutes
- Run a simulation with one click
- Immediately understand what happened
- Never hit a dead end
