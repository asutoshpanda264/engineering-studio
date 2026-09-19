# explain_batman-mode.md — how "Batman Mode" actually works

"Batman Mode" is a brand, not one feature — it names **two separate,
independently-built systems** that happen to share the Bat aesthetic and
the theme name:

| System | What it is | State it owns | Doc |
|---|---|---|---|
| The `night-ops` theme | An app-wide reskin: in the Workshop, a radial weapon wheel, villain traffic attacks, and a Detective Vision bottleneck HUD; on every content map (Foundations/LLD/Entities/Case Studies/Agentic), a "cave" glow layer, plus a real torch-and-darkness mechanic exclusive to Foundations | `ThemeProvider`'s `theme` (`localStorage["theme"]`) | this doc |
| Lock-In mode | A reading-commitment flow over 3 foundations/LLD lessons, with its own villain trilogy and a victory screen at `/batman-mode/victory` | `lockInMode.ts`'s `LockInState` (`localStorage["engineering-studio:lock-in"]`) | `explainDoc/lock-in-mode/explain_lock-in-mode.md` |

They're genuinely independent — different storage keys, different villain
data (`content/workshop/villainAttacks.ts` vs `content/lockIn/villains.ts`,
deliberately kept as two separate files per that file's own header comment
— see below), different UI surfaces. The **only** wire between them is one
`if` in `ThemeProvider.toggleTheme` (see "The commitment enforcement"
below). This doc covers the `night-ops` theme system; read the Lock-In doc
for the reading-commitment flow, chapter mechanics, and the
`/batman-mode/victory` screen it renders.

## Entering and leaving the theme

`ThemeProvider` (`src/components/theme/ThemeProvider.tsx`) tracks one
`Theme = "dark" | "light" | "night-ops"`, stored as `data-theme` on
`<html>` (removed entirely for `"dark"`, the app's default) and mirrored to
`localStorage["theme"]`. `ThemeToggle` (rendered in every header) cycles
`dark → light ("Paper") → night-ops → dark` on click, one step per click,
via `THEME_CYCLE`.

`ThemeToggle` shows the icon for the theme a click switches **to**, not
the current one — a sun while dark (click for Paper), a `BatMark` while on
Paper (click to enter Batman Mode), a moon while in night-ops (click to
return to dark). Entering night-ops specifically also fires a one-shot
full-screen bat-signal transition (`NightOpsAtmosphere`'s
`useBatSignalTrigger`), triggered synchronously in `ThemeToggle`'s own
click handler rather than by watching `theme` change elsewhere — so it
never misfires on hydration or from some other code path flipping the
theme.

While active, `night-ops` also drives ambient decoration mounted once at
the app root by `NightOpsAtmosphere` (`src/components/theme/
NightOpsAtmosphere.tsx`, wrapping the whole tree from `layout.tsx`):
`RainCanvas` + `WeatherGlassOverlay`, cycling rain → heavy rain (blur +
glass + bloom) → snow → rain via `useWeatherCycle` — there is no
"nothing falling" state. The snow phase also flips the app's signal color
from lime-yellow to blue by toggling `data-weather="snow"` on `<html>`
(color swap lives in `globals.css`). None of these three overlays ever
block input — all `pointer-events-none`.

## The commitment enforcement

The one comment that actually explains the feature's name, verbatim from
`ThemeProvider.toggleTheme`:

> Batman Mode's whole point is committing to night-ops for the run
> (see lockInMode.ts) — enforced here, centrally, rather than by hiding
> the toggle per-page.

Mechanically:

```ts
if (theme === "night-ops" && getLockInState().active) return;
```

If the current theme is `night-ops` **and** a Lock-In run
(`lockInMode.ts`, the sibling system) is active, `toggleTheme()` is a
no-op — the state transition itself refuses to happen. `ThemeToggle`
reflects this rather than enforcing it: when `locked` is true it swaps to
a `Lock` icon, disables the button, and sets the label to `"Theme
locked — Batman Mode is active"`.

This is gated centrally in `ThemeProvider`, not per-page, because a
page-level hide (e.g. only wrapping `LockInHeaderNav` around the
`/foundations/[slug]` and `/lld/[slug]` headers where a Lock-In run
actually starts) would still leave every other route — `/workshop`,
`/entities/*`, `/learn`, the landing page, or just the browser Back
button — as a one-click way out of `night-ops` mid-run. Gating the actual
`setTheme` call closes that regardless of which page (or component) the
toggle is clicked from.

The practical consequence: **the theme lock is borrowed from Lock-In, not
owned by the `night-ops` theme itself.** Toggling into `night-ops` on its
own, with no Lock-In run active, is fully reversible at any time — nothing
about the Workshop reskin alone locks you in. The "commitment" only kicks
in if you also happen to have an active Lock-In run going (started from a
lesson page) while `night-ops` is your active theme. There's no
Workshop-side flow that starts a Lock-In run — the two are still
independent; this `if` is the entire coupling in either direction.

`night-ops` reskins two genuinely separate surfaces: the Workshop (next
section) and every content **map** — Foundations, LLD, Entities, Case
Studies, and Agentic (the section after that, "Outside the Workshop").

## Inside the Workshop: what changes when `night-ops` is active

All three of the theme's Workshop-specific pieces live in
`src/components/workshop/night-ops/` or are gated inline with
`theme === "night-ops"`, and all render `null` outside it — so none of
them need `ArchitectureCanvas` or any caller to carry a conditional of its
own for "am I in Batman Mode."

### Weapon Wheel replaces the Components panel

`ComponentSidebar` (`src/components/workshop/ComponentSidebar.tsx`)
computes `isBatman = theme === "night-ops" && !forceListMode` and branches
its entire palette UI on it:

- **Not Batman** (`dark`/`light`, or `night-ops` with `forceListMode`):
  two trigger buttons ("Distributed Systems" / "AI Flow") each opening its
  own docked `PackPanel` list — the ordinary Components palette.
- **Batman**: one "Choose Weapon" trigger that opens `WeaponWheel`
  (`src/components/workshop/WeaponWheel.tsx`) instead — two independent
  radial dials rendered side by side, one per catalog domain
  (`!item.domain` → "Distributed Systems", `item.domain === "agentic"` →
  "AI Flow"), same split as the two light/dark panels, just a different
  input shape.

`forceListMode` is set only by `/tutorial` (via `WorkshopShell`'s
`forceComponentsList` prop passed down into `ComponentSidebar`) — the
guided tour's steps spotlight specific catalog cards by
`data-tour-id="sidebar-component-<type>"`, an attribute that only exists
on the plain list's `ComponentCard`s, not on `WeaponWheel`'s SVG wedges.
`/workshop` never sets it, so Batman Mode still gets the wheel there.

**WeaponWheel mechanics:** each `Dial` lays out its items as equal wedges
(`360 / items.length` degrees each, with a small `GAP_DEG` gap) drawn as
real SVG `<path>` sectors via polar-to-cartesian trig
(`polarToCartesian`/`wedgePath`), with each catalog item's lucide icon
positioned on top at the wedge's midpoint radius. Hovering a wedge (mouse
or keyboard focus) echoes the item's name/description into the ring's
hollow center; clicking (or Enter/Space while focused) calls `onSelect`,
which `ComponentSidebar` wires straight into the same
`handleSelectComponent`/`addNode` path the plain list uses — the wheel is
purely an alternate picker UI, it doesn't touch how a component actually
gets added to the canvas. `Escape` or clicking the scrim closes it
(`role="dialog"`, `aria-modal="true"`).

### Villain attacks reskin chaos/load testing

`VillainAttackPicker` (`src/components/workshop/night-ops/
VillainAttackPicker.tsx`) is a `<select>`, rendered only in `night-ops`,
listing the three attacks from `content/workshop/villainAttacks.ts`. It
writes exactly one field — `workshopStore.activeVillainAttackId`, via
`setVillainAttack` — and touches nothing else; it doesn't run the
simulation or touch the canvas itself.

That field is read back in `buildCurrentSimulationConfig`
(`src/store/workshopStore.ts:387-409`), the shared config-builder both
`runSimulation()` and `runReliabilityScore()` call: if an attack is
loaded, its `buildPattern(baselineRate, durationMs)` **overrides** the
scenario's (or the freeform Client node's) traffic pattern outright, for
that run only. Each attack is a real `TrafficPattern` your existing
`TrafficGenerator` already knows how to turn into request arrivals — this
isn't a separate traffic engine, just a curated shape:

| Villain | Pattern | Shape |
|---|---|---|
| Ra's al Ghul | `ramp`, `baselineRate → baselineRate × 4` over the full run duration | A slow siege — climbs steadily, patient |
| The Joker | `burst`, `~0.6 × baselineRate`, 150ms bursts every 900ms | Chaotic, unpredictable spikes, no steady rate |
| Bane | `constant`, `baselineRate × 3.5` | Sustained maximum pressure, no ramp or letup |

All three scale off `baselineRequestRate(...)` — whatever's already
driving the canvas (the active scenario's pattern, or the freeform
Client's configured `requestRate`) — rather than a fixed absolute number,
so the same attack reads as "clearly harsher" whether it lands on a
one-node sandbox or a fully-built scenario architecture. `durationMs` is
the run's actual configured duration, which Ra's al Ghul's `ramp` needs to
climb across the whole run instead of stalling out early
(`generateRamp`'s `Math.min(pattern.duration, durationMs)` clamp,
referenced from the attack file's own header comment).

This is deliberately **not** the same data as Lock-In's villain trilogy —
`content/workshop/villainAttacks.ts`'s header comment calls this out
explicitly: Lock-In's `VILLAIN_SEQUENCE` drives a lesson-reading
commitment with its own taunts/defeat lines; this drives a traffic shape.
Conflating the two files would make an unrelated tweak to one ripple into
the other for no reason — they share only the rogues'-gallery identity
(Ra's al Ghul / Joker / Bane in both), not any code or data.

### Detective Vision reskins the bottleneck badge

`DetectiveVisionHUD` (`src/components/workshop/night-ops/
DetectiveVisionHUD.tsx`) is a toggle button (also `night-ops`-only) that,
when active, fades the whole viewport to near-black except a
spotlight cutout around whichever node `findBottleneckNodeId`
(`bottleneckDetection.ts`) flags as over the utilization threshold — the
exact same detection `ComponentNode`'s plain "Bottleneck" badge already
uses elsewhere, just a dramatically different presentation (a scanning
sweep + live utilization readout instead of a static badge). It reads
`entityMetrics` from `playbackMetrics`, not the run's final aggregate
snapshot — so which node is flagged tracks wherever the user has scrubbed
playback to (see `explainDoc/simulation-engine/explain_simulation.md`'s
"Playback vs. live simulation" section), not frozen at the run's end
state.

The spotlight itself is one absolutely-positioned box sized to the
flagged node's live `DOMRect` (via `useLiveRect`, the same hook
`components/tour/`'s `TourOverlay` uses for its own cutout, promoted out
of that folder once Detective Vision needed the identical trick) with a
huge `box-shadow` spread (`0 0 0 9999px ...`) rather than four separate
dimming rectangles — one style object self-adjusts to any node size. If
no node is currently flagged, it shows a plain "No threats detected — all
systems nominal" full screen instead. The scrim is `pointer-events-none`
(read-only visual mode, doesn't block clicking through to the canvas
underneath); the toggle button itself carries a higher `z-index` so it
stays lit and clickable rather than getting swallowed into the dark like
everything else.

### Where all three live together

`ComponentSidebar` stacks `VillainAttackPicker` and `DetectiveVisionHUD`
directly underneath its own "Choose Weapon" trigger, in one top-left
cluster (`src/components/workshop/ComponentSidebar.tsx:100-114`), rather
than scattering theme-specific chrome across the header and canvas
corners. Both of those two components render `null` outside `night-ops`
on their own, so stacking them unconditionally inside
`ComponentSidebar` (which isn't itself `night-ops`-exclusive) is safe.

## Outside the Workshop: the cave reskin on content maps

`FoundationsMap`, `LLDMap`, `EntitiesMap`, `CaseStudiesMap`, and
`AgenticMap` each compute their own `const cave = theme === "night-ops"`
independently (no shared context — every map re-derives it from
`useTheme()` itself) and pass it down into two shared primitives,
`ArcadeNode` (the map-node component, not `ComponentNode` — a different,
unrelated node type for a different canvas) and `MapEdges`. There are two
layers here, one shared by all five maps and one exclusive to Foundations:

- **The shared glow layer** (all five maps): `cave` only ever adds
  `box-shadow` glow classes on top of the normal styling — a status-colored
  bloom on `ArcadeNode` (`ArcadeNode.tsx:49-51`, healthy nodes glow
  status-green, others glow signal-yellow) and, in `MapEdges`, a glow on
  the "next up" trail (an edge whose target is `available` but not yet
  visited) that only lights up in cave mode (`MapEdges.tsx:171` — outside
  the cave that same trail renders with no special emphasis).
  `MapLegend` adds a cave-only "Unlit" legend entry plus a torch hint line
  explaining the effect. None of this hides anything — every node stays
  exactly as visible as it is outside `night-ops`, just restyled to read
  as "glowing in the dark."
- **The Foundations-only torch layer** (`FoundationsMap` alone, nothing
  the other four maps use): built on top of the same `cave` flag, but
  meaningfully heavier — actual darkness, not just glow. `getLessonStatus`
  gives Foundations a real `"locked"` status (a lesson not yet reachable
  given completed prerequisites) that the other four maps simply don't
  have — `EntitiesMap` has no locked concept at all, and `LLDMap` hardcodes
  `justUnlocked: false`, i.e. nothing there ever needs unlocking mid-visit.
  Only `FoundationsMap` has genuinely hidden content worth lighting a torch
  for, which is why only it renders `CaveShroud` + `TorchCursor` +
  `TorchToggle`:
  - **`CaveShroud`** (`components/foundations/CaveShroud.tsx`) wraps every
    still-`locked` node/edge in a CSS `mask-image` (a radial gradient read
    in alpha — opaque = paint, transparent = hide) rather than per-node
    opacity, so one mask can reveal a locked node *and* the locked trail
    leading to it in the same torch sweep. `--torch-x`/`--torch-y`/
    `--torch-radius` are written straight onto the DOM node by
    `FoundationsMap`'s own pointer-move handler (bypassing React re-renders
    entirely) — an earlier version baked the torch position into the
    gradient function itself and was reported back as making the map feel
    slow while sweeping, since repositioning a mask is cheap but
    regenerating one isn't.
  - **`TorchCursor`** replaces the reader's actual cursor with a small
    flame while the torch is on; **`TorchToggle`**
    (`components/foundations/TorchToggle.tsx`, bottom-left, stacked above
    the map's zoom controls) is the on/off switch, backed by
    `src/lib/torchMode.ts` — the same module-cache +
    `useSyncExternalStore` persistence convention `lockInMode.ts` uses,
    under its own `localStorage["engineering-studio:foundations-torch"]`
    key, for the same reason: flipping the torch on is a deliberate
    choice a page refresh shouldn't silently discard.
  - Outside `night-ops` there's no darkness to light in the first place —
    `TorchToggle` only ever renders when `FoundationsMap`'s `cave` is true.

## What `/batman-mode/` actually contains

The only route under `src/app/batman-mode/` is `/batman-mode/victory` —
there is no `/batman-mode` landing page, and no route toggles the
`night-ops` theme itself (that only ever happens via `ThemeToggle`,
anywhere in the app). `VictoryScreen.tsx` at that route is **Lock-In's**
victory screen, not the `night-ops` theme's: it reads `useLockInState()`
and only renders the "Gotham is safe" completion view when
`state.active && state.chapterIndex === 3`; otherwise it shows a plain
"There's no lock-in victory to show right now" fallback (reachable by
bookmarking/typing the URL directly, or after `resetLockIn()` already
ran). It has no dependency on which `theme` is currently active — you
could reach it in `dark`/`light` mode just as validly as in `night-ops`.
See `explainDoc/lock-in-mode/explain_lock-in-mode.md` for the chapter
state machine that drives it.

## A pattern note, not a feature

`TracePanel.tsx`'s own header comment describes its "render nothing
unless the canvas has an agentic entity" behavior as "the same 'invisible
outside its own domain' pattern `VillainAttackPicker.tsx` uses for Batman
Mode" — that's just citing Batman Mode's null-outside-`night-ops`
convention as prior art for an unrelated component; `TracePanel` itself
has no Batman Mode logic.
