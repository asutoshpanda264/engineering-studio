# explainDoc — how things actually work, by component

This folder is the frontend's equivalent of the backend's `masterdoc/`
(`engineering-studio-backend/masterdoc/`), scoped down to what this repo
asked for: one `explain_<topic>.md` per component, describing **how it's
actually implemented right now** — not a design doc, not a plan, not
marketing copy. Each one is written by reading the real source (with real
file/line references) and, where an older planning doc already existed
under `docs/`, cross-checking against it rather than trusting it blindly.

`docs/` (23 files, plan/spec/design-driven) is untouched and still the
place for "why does this product exist" and "what's the roadmap." This
folder is strictly the "how does the code do X" layer underneath it —
finer-grained, one folder per feature area, grown incrementally as more
components get covered (not pre-scaffolded for the whole app up front).

## Index

| Component | Answers | Doc |
|---|---|---|
| Simulation engine | How the discrete-event engine (`src/simulation/`) actually runs a scenario — event loop, Entity contract, metrics, determinism, playback vs. live | `simulation-engine/explain_simulation.md` |
| Scoring | How a submitted architecture becomes a star rating — the gates, the cost engine, the composite score, the full submit-to-toast path | `scoring/explain_scoring.md` |
| Tutorial | How the guided onboarding tour over the real Workshop canvas decides its step sequence and renders each step | `tutorial/explain_tutorial.md` |
| Batman Mode (`night-ops` theme) | The app-wide `night-ops` reskin — Workshop weapon wheel/villain traffic attacks/Detective Vision HUD, plus the separate "cave" reskin shared by all five content maps and Foundations' torch/darkness mechanic — and how it's distinct from Lock-In mode despite sharing the Bat branding | `batman-mode/explain_batman-mode.md` |
| Lock-In mode | The reading-commitment flow over a 3-lesson trilogy — state machine, chapter resolution, the interrogation gate, the victory screen | `lock-in-mode/explain_lock-in-mode.md` |
| Contributor pipeline | How `/contribute`'s self-service contributor application flow, `/admin`'s three review panels, `PrimaryNav`'s role-conditional tab, and the site-wide `ReportBugButton` actually work — the backend half of this same feature lives in `engineering-studio-backend/masterdoc/phase-contributor-pipeline/` | `contributor-pipeline/explain_contributor-pipeline.md` |

**Note on Batman Mode vs. Lock-In mode:** these are two independently-built
systems that share the "Batman"/night-ops name and villain characters but
have separate state, separate data files, and separate UI. The only wire
between them is one gate in `ThemeProvider.toggleTheme` that borrows
Lock-In's `active` state to block leaving the theme mid-run. Read both docs
if you're touching either — each one says exactly where it hands off to
the other.

## Adding to this folder

Same shape every time: one folder per component (`kebab-case`, feature name
not phase number), one `explain_<topic>.md` inside it. Read the real code
first — skim any pre-existing `docs/*.md` on the same topic only as
background, and call out anywhere the code has diverged from it. Match the
tone of the existing docs here: code-path traces with real file/line/
function references, tables where they clarify, the non-obvious *why*
spelled out, no restating of what a well-named function already makes
obvious.
