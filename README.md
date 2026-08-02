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
| 1. Design system primitives | 🚧 In progress |
| 2. Simulation engine core | ⬜ |
| 3. Core entities (Client, API, Database) | ⬜ |
| 4. Workshop shell | ⬜ |
| 5. End-to-end Movie Booking | ⬜ |
| 6. Playback system | ⬜ |
| 7. Metrics panel | ⬜ |
| 8. Landing page | ⬜ |
| 9. Phase 2 entities | ⬜ |
| 10. Additional scenarios | ⬜ |
| 11. Final polish | ⬜ |
# engineering-studio
# engineering-studio
# engineering-studio
# engineering-studio
