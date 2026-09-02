/**
 * Shared rendering for `Scenario.difficulty` (1-5) — previously
 * duplicated verbatim across the landing page's scenario cards
 * (`src/app/page.tsx`) and the Workshop's `ScenariosMenu.tsx` dropdown,
 * plus a third, differently-styled star-glyph variant in
 * `InspectorPanel.tsx`'s `ScenarioBriefing`. Consolidated here so the
 * `/problems` catalog page (and any future scenario surface) doesn't
 * become a fourth copy.
 *
 * Bracket meter, not star glyphs — reads as an instrument readout rather
 * than a review-site rating widget (see `difficultyMeter`'s original
 * comment on the landing page). `InspectorPanel.tsx`'s old `★`/`☆`
 * variant is folded into this one meter — a single consistent look
 * beats "the Inspector's own accent," which was never a deliberate
 * design choice, just an earlier, unreconciled duplicate.
 *
 * ASCII `#`/`-`, not the Geometric Shapes block chars (`▮`/`▯`) this
 * originally shipped with: `layout.tsx`'s `IBM_Plex_Mono` only loads the
 * `latin` Google Fonts subset (U+0000-00FF plus a little punctuation),
 * which doesn't cover U+25AE/U+25AF — so those rendered as inconsistent
 * fallback-font tofu wherever this meter appeared. `#`/`-` render
 * identically everywhere and keep the same instrument-readout feel.
 */

export function difficultyMeter(difficulty: number): string {
  return "[" + "#".repeat(difficulty) + "-".repeat(5 - difficulty) + "]";
}

/** Difficulty is a real property of the scenario, not decoration — color it
    with the same status vocabulary the simulation itself uses for real
    node health, so low/medium/high reads as green/amber/red on sight. */
export function difficultyColorClass(difficulty: number): string {
  if (difficulty <= 2) return "text-status-healthy";
  if (difficulty === 3) return "text-status-degraded";
  return "text-status-critical";
}

/** Same thresholds as `difficultyColorClass`, as a left-edge border accent
    instead of text color — used by `/problems`' cards to give each row a
    scannable at-a-glance difficulty cue without adding another badge. */
export function difficultyBorderColorClass(difficulty: number): string {
  if (difficulty <= 2) return "border-l-status-healthy/60";
  if (difficulty === 3) return "border-l-status-degraded/60";
  return "border-l-status-critical/60";
}

/** Same thresholds again, as a solid fill — for `DifficultyMeter`'s bars,
    which need an actual background color rather than text/border color. */
export function difficultyFillColorClass(difficulty: number): string {
  if (difficulty <= 2) return "bg-status-healthy";
  if (difficulty === 3) return "bg-status-degraded";
  return "bg-status-critical";
}
