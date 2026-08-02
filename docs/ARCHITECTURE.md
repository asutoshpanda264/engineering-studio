# ARCHITECTURE.md — Engineering Studio System Architecture

> Builds on `CLAUDE.md`. This doc covers the big-picture structure: the three layers, how data flows between them, and the four architectural decisions that shape the whole system. `SIMULATION-ENGINE.md` goes deeper on the engine internals; `WORKSHOP-UI.md` goes deeper on the React layer.

---

## 1. The Big Picture

Engineering Studio separates **computation** from **visualization**:

```
User Builds Architecture → Simulation Runs (instant) → Events Generated → UI Replays Events (animated)
```

The simulation completes in under 100ms and returns *all* events with timestamps up front. The UI then decides how fast to play them back. This is the single most important idea in the system — nearly every other design decision follows from it.

---

## 2. Three-Layer Architecture

```
┌─────────────────────────────────────────────┐
│              PRESENTATION LAYER              │
│                                               │
│  React Components (ArchitectureCanvas,       │
│  InspectorPanel, MetricsPanel, etc.)         │
│   - User interactions                        │
│   - Visual rendering                         │
│   - Animation control                        │
│                                               │
│  State Management (Zustand)                  │
│   - Canvas state (nodes, edges)              │
│   - Simulation state (running, results)      │
│   - Playback state (time, speed, playing)    │
└───────────────────┬───────────────────────────┘
                     │ (bridge: convertToSimulationConfig)
┌───────────────────▼───────────────────────────┐
│               SIMULATION LAYER                │
│                                               │
│  Discrete-Event Simulator (pure TypeScript)  │
│   - Framework-independent                    │
│   - Deterministic behavior                   │
│   - Instant execution (<100ms)               │
│   - Returns timestamped events               │
│                                               │
│  Components: EventQueue, Simulator,          │
│  Entities (Client, API, DB, etc.),           │
│  MetricsCollector                            │
└───────────────────┬───────────────────────────┘
                     │ (events + metrics)
┌───────────────────▼───────────────────────────┐
│                PLAYBACK LAYER                 │
│                                               │
│  PlaybackController                          │
│   - Consumes simulation events               │
│   - Controls replay speed (0.5x–4x)          │
│   - Play/pause/seek                          │
│   - Real-time metrics updates                │
│   - 60fps animation loop                     │
└───────────────────────────────────────────────┘
```

**The bridge** (`workshop-bridge.ts`) is the only code that's allowed to know about both the Zustand canvas shape *and* the simulation engine's config shape. Keeping that conversion in one place is what lets the simulation layer stay genuinely framework-independent — nothing inside `src/simulation/` should ever import from `src/store/` or `src/components/`.

---

## 3. Simulation Flow, Step by Step

### Step 1 — User builds an architecture
User drags components onto the canvas (Client, API Server, Database, and optionally Load Balancer, Cache, CDN), connects them with edges, configures each one (capacity, latency, etc.), and selects a scenario (e.g. "Movie Booking").

### Step 2 — User clicks "Run Simulation"
```typescript
const handleRun = async () => {
  // Convert canvas nodes/edges into simulation config — the only place
  // UI shape and simulation shape are allowed to meet
  const config = convertToSimulationConfig(nodes, edges);

  // Runs instantly — no blocking, no loading spinner needed for this part
  const results = await runSimulation(config, scenario);

  // results = { events: SimulationEvent[], metrics: Metrics, duration: number }
  setSimulationResults(results);

  // Playback is separate from computation
  const controller = new PlaybackController(results);
  controller.play();
};
```

### Step 3 — The simulation engine executes (≈50–100ms wall-clock)
```typescript
class Simulator {
  run(durationMs: number): SimulationResults {
    this.initializeEntities(config);
    this.generateClientEvents(0, durationMs);

    while (this.eventQueue.hasEvents()) {
      const event = this.eventQueue.dequeue();
      this.clock.setTime(event.timestamp);
      this.processEvent(event);              // may enqueue new events
      this.metricsCollector.recordEvent(event);
    }

    return {
      events: this.allEvents,
      metrics: this.metricsCollector.getMetrics(),
      duration: durationMs,
    };
  }
}
```

### Step 4 — Events are replayed with animation
```typescript
class PlaybackController {
  private currentTime = 0;
  private speed = 1.0;
  private playing = false;

  play() {
    this.playing = true;
    this.animate();
  }

  private animate() {
    if (!this.playing) return;
    this.currentTime += 16 * this.speed;      // 16ms per frame at 1x

    const eventsToShow = this.events.filter(e => e.timestamp <= this.currentTime);
    this.updateMetrics(eventsToShow);
    this.notifySubscribers();

    requestAnimationFrame(() => this.animate());
  }
}
```

---

## 4. Key Architectural Decisions

Each of these was a real choice with a real alternative — worth keeping the reasoning attached, both because it's correct and because it's good interview material.

### Decision 1 — Instant simulation, not incremental
**Alternative considered:** yield events as they're computed, streaming into the UI.
**Chosen:** compute everything up front, replay separately.
**Why:** enables seeking/scrubbing (impossible with a streaming model), enables speed control, keeps the engine deterministic and easy to test synchronously, and simulations are fast enough (<100ms) that there's no real cost to computing everything first.
**Tradeoff:** can't simulate arbitrarily long scenarios — practically limited to roughly 60–120s of simulated time before event volume gets unwieldy.

### Decision 2 — Framework-independent simulation
**Alternative considered:** couple the simulation tightly to React (e.g. drive it with `useEffect` and state updates).
**Chosen:** pure TypeScript, zero React imports anywhere in `src/simulation/`.
**Why:** testable without a DOM, runnable from the CLI (`tsx src/simulation/examples/...`), reusable if the UI framework ever changes, and it forces a cleaner separation of concerns that's easier to reason about.

### Decision 3 — Deterministic behavior
**Alternative considered:** non-deterministic timing (real `Math.random()`, wall-clock-driven).
**Chosen:** seeded randomness, strictly chronological event processing.
**Why:** testable (same input → same output), reproducible bugs, fair architecture comparisons (same scenario, different designs, same random seed), and much easier debugging.

### Decision 4 — Discrete events, not continuous time
**Alternative considered:** continuous-time simulation.
**Chosen:** discrete, timestamped events.
**Why:** matches how real distributed systems actually behave (things happen at instants, not continuously), simpler to implement, easier to visualize, and efficient — the engine only does work when something actually happens.

---

## 5. Communication Patterns

### Pattern 1 — Zustand store (single source of truth for UI state)
```typescript
const useWorkshopStore = create<WorkshopStore>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  simulationResults: null,
  isSimulationRunning: false,
  playbackController: null,
  currentPlaybackTime: 0,

  setNodes: (nodes) => set({ nodes }),
  updateNodeConfig: (id, config) => set((state) => ({
    nodes: state.nodes.map(n =>
      n.id === id ? { ...n, data: { ...n.data, config } } : n
    ),
  })),
}));
```

### Pattern 2 — Observable pattern (`PlaybackController`)
The controller doesn't know about React at all. It exposes `subscribe`, and components subscribe/unsubscribe in a `useEffect`:
```typescript
class PlaybackController {
  private subscribers = new Set<Callback>();

  subscribe(callback: Callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    const state = this.getState();
    const metrics = this.getMetrics();
    this.subscribers.forEach(cb => cb(state, metrics));
  }
}

// In a React component:
useEffect(() => {
  const unsubscribe = playbackController.subscribe((state, metrics) => {
    setMetrics(metrics);
  });
  return () => unsubscribe();
}, [playbackController]);
```

### Pattern 3 — Event-driven simulation
Entities generate events; the simulator processes them and may generate further events:
```typescript
class Client {
  generateRequests(): SimulationEvent {
    return {
      type: 'REQUEST_STARTED',
      requestId: uuid(),
      timestamp: this.clock.now(),
    };
  }
}

class Simulator {
  processEvent(event: SimulationEvent) {
    switch (event.type) {
      case 'REQUEST_STARTED': {
        const nextEvent = this.routeRequest(event);
        this.eventQueue.enqueue(nextEvent);
        break;
      }
      // ... handle other event types
    }
  }
}
```

---

## 6. Data Flow Diagram (summary)

```
User Actions
     │
     ▼
Zustand Store  (nodes, edges, simulationResults, playbackState)
     │  on "Run"
     ▼
workshop-bridge.ts  →  convertToSimulationConfig()
     │
     ▼
Simulator.run()
  - initialize entities
  - generate events
  - process chronologically
  - collect metrics
     │  (returns results)
     ▼
PlaybackController
  - subscribe to state
  - control replay
  - update metrics
     │  (notifies subscribers)
     ▼
UI Components
  - MetricsPanel (shows metrics)
  - AnimatedEdge (shows flow)
  - PlaybackControls (controls)
```
