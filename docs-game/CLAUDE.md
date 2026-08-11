# CLAUDE.md — Quest (working name): a JRPG-style System Design Learning Experience

> Scope note: this file governs work under `docs-game/` and `src/app/quest/`,
> `src/components/quest/`, `src/content/quest/`, `src/styles/quest.css` only.
> It does not change anything about the existing Engineering Studio product
> (`docs/CLAUDE.md`, the "Trace" design language, `/workshop`, `/foundations`,
> `/entities`). The two are deliberately isolated — see §1.

Status as of 2026-08-09: **milestones 1–2 done.**
- Milestone 1 — design tokens + fonts (`src/styles/quest.css`,
  `src/app/quest/layout.tsx`).
- Milestone 2 — `Mascot` (`src/components/quest/mascot/Mascot.tsx`),
  the `MascotState` model + per-state pose choreography
  (`mascotStates.ts`), and the `SparkySkin` artwork
  (`skins/sparkySkin.tsx`) — an original SVG silhouette (rounded body,
  two ears, cheek marks, a tail) with all 8 expressions driven by a
  data table (eyes/mouth/brow/accessory per state), not 8 hand-drawn
  SVGs. §6.1's open question (literal Pikachu vs. original skin) is
  still unresolved — Sparky is the "original" answer, not yet confirmed
  with the user.

- Milestone 3 — `GameButton` (`src/components/quest/GameButton.tsx`,
  variants `primary`/`secondary`/`ghost`, sizes `sm`/`md`/`lg`, the
  offset "pushable" shadow that collapses on press) and `DialogueBox`
  (`src/components/quest/DialogueBox.tsx` — name plate, VN-style
  typewriter reveal that respects `prefers-reduced-motion`, click/Enter
  to skip-then-advance, a `children` slot for inline choices that stays
  independently clickable rather than bubbling into the advance
  handler).

- Milestone 4 — the real **Landing screen** now lives at
  `src/app/quest/page.tsx`, replacing the milestone 1–3 token/component
  preview outright (that content is gone, not archived — it did its job).
  Cold-open composition: a game-logo-style title (offset text-shadow
  echoing `GameButton`'s pushable-shadow motif), `Mascot` (`explaining` →
  `excited` once the greeting's done), a 2-line `DialogueBox` greeting
  that ends in a "Begin Adventure" `GameButton` rendered as the box's
  `children` (proves that slot works for a real primary action, not just
  the preview page's demo). A small `BackgroundScenery` SVG (static
  stars + a hill silhouette) lives locally in the page file, not the
  shared component library — nothing else needs it yet, per the
  project's own "don't abstract until a second use case exists" rule.
  "Begin Adventure" navigates to `/quest/map`, which doesn't exist until
  milestone 5 — expect a 404 there until then, not a bug.

- Milestone 5 — the **Learning World Map** now lives at
  `src/app/quest/map/page.tsx`. `LessonNode`
  (`src/components/quest/LessonNode.tsx`) renders one of 4 states
  (locked/unlocked/current/completed) — `current` is the only one with
  a continuous pulse, on purpose, so it stays the one thing drawing the
  eye toward what to do next. `MapPath`
  (`src/components/quest/MapPath.tsx`) draws straight dashed/solid
  connecting segments between nodes sharing the same 0–100 percent
  coordinate space as `LessonNode`'s CSS positioning.
  `src/content/quest/worldMap.ts` hardcodes the 5-node world
  (bottom-to-top: The Load Balancer Gate — the only real,
  `current`/clickable lesson — then Network Forest, Caching Caves,
  Database City, The Distributed Peaks, all `locked`). "Begin
  Adventure" on Landing no longer 404s past this point; clicking the
  Load Balancer Gate node now 404s instead, since
  `/quest/lesson/load-balancers` doesn't exist until milestone 7. Also
  used this milestone to retrofit `data-quest-display` (a hook
  quest.css already defined but nothing had used yet) onto
  `GameButton`/`DialogueBox`'s name-plate/`LessonNode`'s label in
  place of each hand-rolling its own
  `[font-family:var(--quest-font-display)]` — small consistency
  cleanup, no visual change.

- Milestone 6 — `ConceptObject` (`src/components/quest/ConceptObject.tsx`
  — 8 kinds: user/server/api/database/cache/queue/load_balancer/cdn,
  each a small stroke-based icon on a shared 40×40 grid; `status`
  normal/healthy/overloaded controls fill color, and only `overloaded`
  gets a wobble — motion here means "struggling," not decoration) and
  `SystemDiagram` (`src/components/quest/SystemDiagram.tsx` — composes
  `ConceptObject`s + straight connecting lines in the same percent
  coordinate scheme `LessonNode`/`MapPath` already established; edges
  can be `overloaded` too, rendered thicker/coral). Both static — no
  edge/flow animation yet, that's explicitly deferred past this
  milestone. `/quest/lesson/load-balancers` now exists and renders the
  brief's exact teaching moment as a static two-beat walkthrough (four
  users hammering one overloaded server → a load balancer spreading
  the same traffic across three healthy ones) — this is real content
  living at its real route, not a throwaway preview, so milestone 7
  extends this page (wrapping it in `SceneStage`, adding the question)
  rather than replacing it. The map's Load Balancer Gate node no longer
  404s.

- Milestone 7 — `AnswerChoice`
  (`src/components/quest/AnswerChoice.tsx` — click-to-answer, no
  separate confirm step; locks into `correct`/`incorrect` with a
  one-off pop/shake, not a loop) and `useSceneStage`
  (`src/components/quest/SceneStage.tsx` — a generic linear stage-machine
  hook, `useReducer`-backed, taking any `readonly string[]` sequence;
  kept the `SceneStage.tsx` filename from the architecture doc even
  though it exports a hook, not a component, so the doc and the code
  don't drift apart). `/quest/lesson/load-balancers` now plays as a
  real sequence — intro → concept → question, driven by
  `useSceneStage(["intro", "concept", "question"])` — instead of one
  static page. The question ("what actually fixes an overloaded
  server?") uses `AnswerChoice` with 3 options; picking correctly locks
  in (mascot → `happy`) and picking wrong shakes/dims for ~900ms then
  clears itself so every option is clickable again (the brief's
  "encourage another attempt," not a dead end) — this is a lightweight
  stand-in, not the real feedback stage; milestone 8 replaces it with
  mascot dialogue actually explaining the mistake and highlighting the
  diagram's failure point. Deliberately stops right after the question
  resolves — no transition into `feedback`/`complete` stages yet, no
  Celebration, no return-to-map affordance; `STAGES` in the lesson page
  only lists `["intro", "concept", "question"]` for exactly that
  reason.

- Milestone 8 — `Celebration`
  (`src/components/quest/Celebration.tsx` — a 16-particle confetti
  burst, plays once on mount, no re-trigger prop by design: give it a
  changing `key` if a future screen needs a second burst) and
  `ProgressIndicator` (`src/components/quest/ProgressIndicator.tsx` —
  chunky filled/unfilled segments, not a percentage bar, one per
  `STAGES` entry). `STAGES` grew to
  `["intro", "concept", "question", "feedback", "complete"]`. The
  question's answer now leads somewhere real: correct locks in and
  auto-advances (~700ms) into `feedback` with mascot `celebrating` and
  a per-choice `explanation` string, ending in a "Continue" button;
  incorrect auto-advances (~1s) into `feedback` too, but now shows
  *why* it was wrong (a specific `explanation` per wrong choice, not a
  generic message) plus the same overloaded-server diagram from the
  intro re-shown as the visual "here's what's still broken," ending in
  a "Try Again" button that clears the answer and jumps back to
  `question` — this replaces milestone 7's silent 900ms auto-clear
  entirely. `complete` fires `Celebration`, a closing line, and a
  "Return to Map" button.
  Introduced `src/store/questProgressStore.ts` — a tiny in-memory
  Zustand store (`completedLessonIds`, `markLessonComplete`), no
  persistence — exactly the "session-wide state across `/quest/*`
  routes" case §7 said would justify one, and not before. "Return to
  Map" calls `markLessonComplete("load-balancers")` before navigating;
  `/quest/map` had to split into a server `page.tsx` (keeps exporting
  `metadata`) + a new client `QuestMapView.tsx` (subscribes to the
  store) since a page can't do both. The Load Balancer Gate node now
  renders `completed` (green check) after finishing the lesson once —
  no other node unlocks, since nothing else has real content yet.
  Also fixed `useSceneStage` to return `useCallback`-wrapped
  `advance`/`goTo` so consumers can put them in effect dependency
  arrays without the effect re-firing every render (surfaced by
  `react-hooks/exhaustive-deps` while wiring the auto-advance effect;
  fixed by destructuring `{ stage, index, advance, goTo }` at the call
  site rather than referencing `scene.advance` as a member expression).

This closes out the vertical slice's content milestones. Only milestone
9 (final polish pass) remains — see §8. This doc is the reference to
resume from in a new session/agent without re-deriving the discussion
that produced it.

---

## 0. What this is

A frontend-only prototype exploring whether Engineering Studio's teaching
content (system design) can live inside a **JRPG × Duolingo** game
experience instead of a documentation/dashboard UI. Think: the student
enters a small game world and progresses through system design concepts
the way they'd progress through a Pokémon-style overworld map, not the
way they'd click through a course sidebar.

**The test this prototype exists to pass:** would a CS student, on seeing
this, feel *"I wonder what's behind that next node"* rather than *"I need
to complete chapter 4"*?

**Guiding line, repeated because it should override any individual UI
decision below:** the final product should feel like *"a game that
happens to teach system design,"* not *"an educational website that has
game-like decorations."*

---

## 1. Relationship to Engineering Studio (decided)

Two products' worth of design language now live in one repo, on purpose,
as an experiment:

- **Engineering Studio / "Trace"** (`docs/CLAUDE.md`) — dark, hairline,
  zero-radius, copper accent, serif+mono, portfolio/interview-grade
  polish. Lives at `/`, `/workshop`, `/foundations`, `/entities`,
  `/learn`. **Untouched by this work.**
- **Quest** (this doc) — bright, chunky, playful, mascot-driven game UI.
  Lives entirely under `/quest`. Own fonts, own color tokens, own
  component library, own folder tree. No shared Tailwind theme tokens
  with Trace — see §5 for how the CSS is kept from colliding.

**Decision:** build Quest as an isolated route first. *If it turns out
well and is appealing, the plan is to migrate the whole product to this
direction* — but that migration is explicitly out of scope for now.
Nothing about Quest's architecture should be built in a way that requires
Trace to keep existing (no dependency on Trace components/tokens), so
that migration or deletion later are both cheap.

**Content decision:** the one vertical-slice lesson (Load Balancers)
adapts the substance already written in
`src/content/foundations/lessons/13-load-balancers.ts` (the "10-counter
McDonald's" analogy, the "no load balancer → horizontal scaling is
impossible" insight) restaged as game scenes/dialogue, rather than
inventing new pedagogical content from scratch. Restage the *teaching*,
don't just copy prose into a dialogue box.

---

## 2. Product vision (source: user brief, condensed)

- Audience: CS students learning system design.
- Explicitly **not**: a typical online course, a SaaS dashboard, an AI
  wrapper, a generic Tailwind site, a "purple gradient + glassmorphism"
  AI-generated look.
- Explicitly **is**: an adventure map, illustrated environments,
  character-driven teaching, tactile buttons, playful but purposeful
  animation, progression through a world.
- Mascot (Pikachu-inspired for this prototype only — see §6.1) is a
  companion/teacher integrated into scenes and dialogue, never a static
  decoration. It has visual states: idle, explaining, thinking, excited,
  happy, confused, celebrating, warning.
- A lesson is a **scene**, not an article. Show the problem happening
  (users piling on one door), narrate it through the mascot, then teach
  the concept, then make the student interact with it.
- Wrong answers get explained visually through the system, not just
  marked red. Correct answers get a real, felt celebration.
- Colors: electric yellow, deep navy, cream, electric blue, warm
  orange/coral, success green. No AI-purple.
- Two type voices: a distinctive display face for titles/game-labels, a
  highly readable face for explanations/questions.

**What NOT to build in this phase** (per user's explicit constraints):
auth, database/backend, user profiles, persistent XP, DB-stored badges,
payments, APIs, AI tutor integration, complex state management,
production infra. Hardcoded/mock data is correct, not a shortcut.

---

## 3. The one vertical slice to build (in order)

Do not build more than this until it's reviewed:

1. **Landing** (`/quest`) — game-world cold open. Mascot greets the
   player. One primary action: begin the adventure.
2. **Learning World Map** (`/quest/map`) — illustrated path of lesson
   nodes. Only the Load Balancers node is unlocked/playable. 4–5
   neighboring nodes (Network Forest, Caching, Database City,
   Distributed Systems — names illustrative, adjust freely) render
   locked/silhouetted so the world reads as bigger than the one lesson
   without requiring that lesson to exist yet.
3. **Lesson scene** (`/quest/lesson/load-balancers`) — one route, internal
   stage machine, no page reloads between stages:
   - Mascot intro + the problem dramatized visually (users piling on one
     server: `👤👤👤👤 → [ ONE SERVER ] → 💥`)
   - Concept reveal (load balancer introduced, visually, via
     `SystemDiagram`/`ConceptObject`s)
   - Interactive question (`AnswerChoice`) — student predicts/decides
     something about the system
   - Feedback: correct branch (celebration) or incorrect branch (visual
     explanation of *why*, via highlighting the failure point in the
     diagram, then retry)
   - Completion state (`Celebration`, progress marked on return to map)

Nothing else — no second lesson, no settings, no persistence — is in
scope for this pass.

---

## 4. Reusable components (`src/components/quest/`)

| Component | Responsibility |
|---|---|
| `Mascot` | Renders per `MascotState` (`idle \| explaining \| thinking \| excited \| happy \| confused \| celebrating \| warning`) via a swappable **skin** module — call sites never reference Pokémon-specific anything. |
| `DialogueBox` | Name plate + text, optional typewriter reveal, "tap to continue," can host inline choices. |
| `GameButton` | Tactile button: rest/hover/press states via an offset drop-shadow that collapses on press. |
| `LessonNode` | Map node; states: locked / unlocked / current / completed. |
| `MapPath` | Trail connecting nodes; traveled segments draw themselves in on completion. |
| `AnswerChoice` | Question option card; states: default/hover/selected/correct/incorrect. |
| `ConceptObject` | One illustrated system-design primitive (user, server, load balancer, DB, cache, queue, CDN) — the vocabulary `SystemDiagram` composes from. |
| `SystemDiagram` | A scene built from `ConceptObject`s + connectors; can animate flow/overload. |
| `ProgressIndicator` | Session-only XP/progress bar (game-HUD styled, not persisted). |
| `Celebration` | Confetti/particle burst + mascot celebrating, fired only on genuine completion. |
| `SceneStage` | The lesson's internal stage machine (intro → concept → question → feedback → complete). Local `useReducer`, no routing. |
| `QuestHeader` | Top bar within `/quest/*` — back-to-map, session progress. |

---

## 5. Visual design tokens

Kept in **`src/styles/quest.css`**, imported only by `src/app/quest/layout.tsx`
— never merged into `src/app/globals.css`'s `@theme` block. Quest
components consume these via arbitrary-value Tailwind
(`bg-[var(--quest-navy)]`, etc.), not new `@theme` entries, so Trace's
generated utility classes (`bg-bg`, `text-signal`, `radius-*: 0`, …) are
never at risk of collision or accidental reuse. This isolation is what
keeps "try it, decide later" actually cheap either direction.

**Color** (exact HSL values to be tuned during implementation, roles fixed):
- `--quest-navy` — deep base/backdrop
- `--quest-cream` — panels, dialogue box surface
- `--quest-yellow` — primary accent, mascot, XP/highlight
- `--quest-blue` — secondary accent
- `--quest-coral` — warm accent, warning moments, energy
- `--quest-green` — success/correct/unlocked
- plus an ink/dark-text token for text on cream surfaces

**Type:**
- Display (titles, level names, game labels): rounded/playful — candidate
  **Fredoka**.
- Body (explanations, questions): rounded, highly legible — candidate
  **Nunito**.
- Both loaded via `next/font/google`, deliberately distinct from Trace's
  Source Serif 4 / IBM Plex Mono pairing.

**Shape:** generous radius (16–24px) and thick ink-colored outlines — the
deliberate opposite of Trace's zero-radius hairline language.

**Motion:** spring-based presets (snappy / bouncy), not Trace's
linear/mechanical easings.

---

## 6. Animation & interaction principles

- Buttons: hover lifts slightly; press squashes flat as its offset-shadow
  collapses to zero. Every press should feel felt.
- Correct answer: choice card pops green + check, mascot celebrates,
  progress bar ticks up, confetti (`Celebration`).
- Incorrect answer: card shakes and dims — **never just turns red**.
  Mascot goes `confused` with a line naming the actual mistake; the
  diagram itself highlights the failure point (e.g. the overloaded server
  flashes) before inviting a retry.
- Map progress: path segments draw themselves in (stroke animation) as a
  lesson completes.
- Lesson beats cross-fade/slide within one persistent frame — never a
  route change mid-scene.
- Mascot idle gets a subtle breathing/blink loop and nothing else;
  otherwise every animation fires because of a real state change, never
  decoration for its own sake.

### 6.1 Mascot IP note — flagged, not yet decided

Prototype is explicitly allowed to be Pikachu-inspired per the user's
brief. Recommendation made during design discussion: build the actual
skin as an **original simple SVG creature** (yellow, rounded, ear/tail
silhouette, swappable facial expressions) rather than literal Pokémon
artwork — costs nothing extra since shapes are being drawn either way,
and keeps the component boundary (`Mascot` never Pokémon-specific,
only a skin module is) honest from day one. Not yet confirmed with the
user — revisit before building `skins/sparkySkin.tsx` if a more literal
Pikachu likeness is actually wanted for this throwaway prototype.

---

## 7. Folder structure

```
src/app/quest/
  layout.tsx                    # imports quest.css, no Trace ThemeProvider
  page.tsx                      # Landing
  map/page.tsx                  # Learning World Map
  lesson/[slug]/page.tsx        # Lesson scene container

src/components/quest/
  mascot/
    Mascot.tsx
    mascotStates.ts              # type MascotState = 'idle' | 'explaining' | ...
    skins/sparkySkin.tsx         # original-character SVG skin
  DialogueBox.tsx
  GameButton.tsx
  LessonNode.tsx
  MapPath.tsx
  AnswerChoice.tsx
  ConceptObject.tsx
  SystemDiagram.tsx
  ProgressIndicator.tsx
  Celebration.tsx
  SceneStage.tsx
  QuestHeader.tsx

src/content/quest/
  worldMap.ts                   # hardcoded node graph, incl. locked nodes
  lessons/load-balancers.ts     # adapted from content/foundations/lessons/13-load-balancers.ts
  types.ts

src/styles/quest.css            # --quest-* tokens, isolated from globals.css
```

State: local `useState`/`useReducer` for the scene machine. A small
Zustand store (already a project dependency) only if session-wide state
is genuinely needed across `/quest/*` pages (e.g. which nodes are
unlocked this session) — no persistence, per the constraints in §2.

---

## 8. Suggested build order (milestones)

Mirrors the "one milestone at a time, wait for approval" process the main
`docs/CLAUDE.md` already uses for Engineering Studio — apply the same
discipline here:

1. ✅ `quest.css` tokens + font setup, in isolation (no screens yet).
2. ✅ `Mascot` + `mascotStates` + `sparkySkin`, previewable on its own.
3. ✅ `GameButton` + `DialogueBox`, previewable on their own.
4. ✅ Landing screen (`/quest`), using the above three.
5. ✅ `LessonNode` + `MapPath` + world map data → Learning World Map screen.
6. ✅ `ConceptObject` + `SystemDiagram` — the load-balancer visual,
   static first (no interaction yet).
7. ✅ `AnswerChoice` + `SceneStage` wiring → full lesson scene, intro
   through question.
8. ✅ `Celebration` + `ProgressIndicator` → feedback + completion stages.
9. Polish pass: animation timing, responsiveness, consistency check
   against §6.

Verification follows the existing project convention
(`AGENTS.md` → "Browser verification workflow"): queue visual/interaction
checks in `docs/BROWSER-CHECKS.md` as they're built, batch them into one
review pass rather than opening a browser after every small change.

---

## 9. Open questions for the user (carry forward, don't silently decide)

- §6.1: literal Pikachu likeness vs. original SVG skin for the
  prototype — currently defaulting to original, not confirmed.
- Exact display/body font pick (Fredoka/Nunito are candidates, not
  locked) — fine to finalize during implementation unless the user wants
  to see options first.
- Route naming: `/quest` used throughout this doc as a working name: open
  to renaming if a better one comes up.
