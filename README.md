# Engineering Studio

> **Build. Simulate. Break. Learn.**

An interactive sandbox for learning distributed systems. Design architectures visually, run deterministic discrete-event simulations, and observe real system behavior through media-player-style playback.

## Philosophy

Traditional resources tell you *what* to do — "add a cache," "use a queue." Engineering Studio reverses this: it lets you discover *why* through experimentation.

The simulation creates reality. The UI only reveals it.

## Documentation

This project is documentation-driven. Read in order:

1. **`docs/PHILOSOPHY.md`** — the beliefs behind the project
2. **`docs/PRODUCT.md`** — who it's for and what the MVP is
3. **`docs/ARCHITECTURE.md`** — three-layer architecture (Presentation → Simulation → Playback)
4. **`docs/SIMULATION-ENGINE.md`** — the deterministic engine core
5. **`docs/ENTITIES.md`** — infrastructure components (Client, API Server, Database, …)
6. **`docs/WORKSHOP-UI.md`** — the user experience
7. **`docs/DESIGN-SYSTEM.md`** — visual language and tokens
8. **`docs/SCENARIOS.md`** — educational content
9. **`docs/TECHNICAL-SPECIFICATION.md`** — shared data contracts
10. **`docs/ENGINEERING-DECISIONS.md`** — ADRs
11. **`docs/IMPLEMENTATION.md`** — build guide and folder structure

**Start at `docs/PLAN.md`** for the full roadmap and milestone definitions.

## Architecture

```
User builds architecture
  → Zustand store
  → workshop-bridge (converts canvas → sim config)
  → Simulator.run() (pure TS, <100ms, deterministic)
  → Event timeline + metrics
  → PlaybackController (play/pause/seek/speed)
  → React UI (60fps animated replay)
```

Key decisions:
- **Instant simulation, separate playback** — enables seeking, speed control, and replay
- **Framework-independent engine** — zero React imports in `src/simulation/`
- **Deterministic** — seeded randomness, virtual time, reproducible results
- **Event-driven** — every animation corresponds to a real simulation event

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Graph Editor | XY Flow (React Flow) |
| Animation | Framer Motion |
| State | Zustand |
| Icons | Lucide React |
| Testing | Vitest + Testing Library |

## What's Built So Far

**Landing page** — hero diagram, entity/scenario catalogue, links into the Workshop.

**Workshop** — freeform canvas (drag, connect, configure, delete), Component Library sidebar (Core vs. Modules), Inspector panel with per-entity config knobs and live metrics, Scenarios tab.

**Simulation engine** (`src/simulation/`, zero React imports) — deterministic discrete-event core: virtual `Clock`, min-heap `EventQueue`, seeded RNG, immutable event log, `MetricsCollector` deriving every metric from the event timeline (never tracked incrementally by entities). Cycle and unreachable-node detection before a run starts (`graphValidation.ts`), with warnings/errors surfaced in the UI instead of a silent no-op.

**Entities implemented** (6 of 7 — Message Queue still outstanding):
- **Client** — request generator, configurable rate and key pool size
- **API Server**, **Database** — bounded concurrency + queueing (admit → queue → reject), configurable processing time
- **Load Balancer** — round-robin distribution, response pass-through
- **Cache** — LRU / LFU / FIFO / MRU eviction, cache-aside, playable capacity/TTL knobs
- **CDN** — N independent geographic edges, each with its own cache and distance-to-user latency, deterministic key→edge routing (same content always lands on the same nearby edge, mirroring real anycast/geo-routing), per-edge hit-rate metrics

**Playback system** — instant simulation, separate controlled replay: play/pause, seek/scrub, 0.5x–4x speed, animated packet flow that follows each edge's actual bezier path (not a straight-line approximation).

**Results & metrics** — live results bar (requests, success rate, avg/p95 latency, throughput with sparklines), per-entity metrics in the Inspector, colored node-health dots (idle/healthy/near-capacity/dropping-requests/crashed) with a **Status Legend** explaining what each color means.

**Suggestions engine** (`src/lib/suggestionEngine.ts`) — analyzes the last run and proposes concrete fixes (add a Load Balancer, add a Cache, raise capacity, …), ranked by severity (critical/warning/info).

**CDN latency comparison ("Why This Helps")** — re-runs the same architecture with a selected CDN spliced out (`compareArchitectures.ts`, same seed, same traffic) and shows real, measured "with vs. without" latency bars in the Inspector, plus a schematic Edge Map (distance from center = latency, color = hit rate) so the CDN's benefit is *demonstrated*, not asserted — including an honest "this CDN isn't helping, try X" message when the numbers don't favor it.

**Scenarios** — URL Shortener, Movie Ticket Booking, Flash Sale, each with constraints and a validator (`src/scenarios/`).

**Tests** — 121 passing (`npx vitest run`), concentrated on the simulation engine and entity behavior.

## Development

```bash
# Development
npm run dev          # → http://localhost:3000

# Testing
npm test              # run once
npm run test:watch    # watch mode
npm run test:ui       # Vitest UI

# Lint
npm run lint
```

## Milestones

| Milestone | Status |
|---|---|
| 0. Project scaffold | ✅ Done |
| 1. Design system primitives | ✅ Done |
| 2. Simulation engine core | ✅ Done |
| 3. Core entities (Client, API, Database) | ✅ Done |
| 4. Workshop shell | ✅ Done |
| 5. End-to-end Movie Booking | ✅ Done |
| 6. Playback system | ✅ Done |
| 7. Metrics panel | ✅ Done |
| 8. Landing page | ✅ Done |
| 9. Phase 2 entities (Load Balancer, Cache, CDN, Message Queue) | 🚧 In progress — 3 of 4 done, Message Queue outstanding |
| 10. Additional scenarios (URL Shortener, Flash Sale, …) | ✅ Done |
| 11. Final polish | 🚧 In progress |
