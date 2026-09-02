"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import type { TrackAccentClasses } from "./trackAccent";

/**
 * Replaces the old `TRACK_WATERMARK_ICONS` (a single giant lucide icon at
 * 7% opacity bleeding off each Atlas zone's bottom-right corner — see the
 * git history on `FoundationsAtlas.tsx` for that version). Flagged back
 * directly as barely visible and not worth the space it sat in. This is
 * the replacement: a small badge — same visual weight as a lesson's icon
 * chip, not a background watermark — sitting left of each track's title,
 * that replays its themed animation every time it scrolls into view
 * (`useInView({ once: false })`) — scrolling back up to revisit an earlier
 * track sees it again, not a one-shot intro that's spent after the first
 * pass down the page.
 *
 * Deliberately hand-drawn line art in this file's own `Glyph`-style
 * vocabulary (plain strokes on `currentColor`, `lessonGlyphs.tsx`'s exact
 * recipe) rather than an imported icon set with a generic pulse/spin
 * slapped on — this page's own history already has two illustration
 * attempts that read as "disconnected noise" or "childish" (see this
 * file's — well, `FoundationsAtlas.tsx`'s — doc comments); staying in the
 * app's existing thin-stroke idiom is what keeps this one from repeating
 * that.
 *
 * Five variants, one per `FOUNDATION_TRACKS` entry, each animated in a way
 * that actually evokes its theme rather than a shared generic "fade up":
 * electric bolt draws itself in with two spark pops, database's three
 * layers drop into their stack top to bottom, the gauge's needle sweeps
 * up from a low reading, network's nodes pop in before the connecting
 * path draws between them, and the checklist's three ticks land one after
 * another. `prefers-reduced-motion` skips straight to the resting frame
 * (same convention as `HeroDiagram`'s packet animation).
 *
 * Every variant's `visible` transition also carries `repeat: Infinity,
 * repeatType: "mirror"` — once `isInView` flips `animate` to `"visible"`,
 * Motion plays forward, holds (`repeatDelay`), plays the same transition in
 * reverse back to `hidden`'s values, holds again, and repeats for as long as
 * the badge stays in view (a gauge needle actually reads as sweeping back
 * and forth, a bolt as flickering on and off — not just a one-off intro).
 * Scrolling the badge out of view flips `animate` back to `"hidden"` (no
 * `repeat` on that target, so it just resets) and re-entering starts the
 * whole loop fresh, rather than the loop continuing to run off-screen.
 */

const VIEW_BOX = "0 0 28 28";

const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 16, repeat: Infinity, repeatType: "mirror", repeatDelay: 1.1 },
  },
};

const drawIn: Variants = {
  hidden: { opacity: 0, pathLength: 0 },
  visible: {
    opacity: 1,
    pathLength: 1,
    transition: { duration: 0.55, ease: "easeOut", repeat: Infinity, repeatType: "mirror", repeatDelay: 0.9 },
  },
};

const dropIn: Variants = {
  hidden: { opacity: 0, y: -5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 20, repeat: Infinity, repeatType: "mirror", repeatDelay: 1.1 },
  },
};

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};

export type TrackBadgeVariant = "electric" | "database" | "gauge" | "network" | "checklist";

const VARIANT_ORDER: readonly TrackBadgeVariant[] = ["electric", "database", "gauge", "network", "checklist"];

/** Maps a `FOUNDATION_TRACKS` index to its badge — same order as the old `TRACK_WATERMARK_ICONS`. */
export function getTrackBadgeVariant(trackIndex: number): TrackBadgeVariant {
  return VARIANT_ORDER[trackIndex % VARIANT_ORDER.length];
}

// Internet & Web Fundamentals — a bolt that draws itself, then two quick
// spark pops once it lands.
function ElectricContent() {
  return (
    <>
      <motion.path d="M15.5 2 7 15.5h5.5L10 26l11-14h-6.5L17 2Z" variants={drawIn} />
      <motion.circle cx={23} cy={7} r={1} fill="currentColor" stroke="none" variants={popIn} />
      <motion.circle cx={5} cy={21} r={1} fill="currentColor" stroke="none" variants={popIn} />
    </>
  );
}

// Data & Storage — the same three-layer cylinder `DataStorage` (lesson 08)
// draws, but each layer drops into the stack instead of appearing at once.
function DatabaseContent() {
  return (
    <>
      <motion.ellipse cx={14} cy={6.5} rx={9} ry={3} variants={dropIn} />
      <motion.path d="M5 6.5v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" variants={dropIn} />
      <motion.path d="M5 12.5v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" variants={dropIn} />
    </>
  );
}

// Scale & Performance — an arc draws in, then the needle sweeps up from a
// low reading to rest near the top.
function GaugeContent() {
  return (
    <>
      <motion.path d="M4 21a10 10 0 0 1 20 0" variants={drawIn} />
      <motion.line
        x1={14}
        y1={21}
        x2={14}
        y2={9.5}
        style={{ transformOrigin: "14px 21px" }}
        variants={{
          hidden: { opacity: 0, rotate: -55 },
          visible: {
            opacity: 1,
            rotate: 0,
            transition: {
              type: "spring",
              stiffness: 140,
              damping: 13,
              delay: 0.35,
              repeat: Infinity,
              repeatType: "mirror",
              repeatDelay: 0.9,
            },
          },
        }}
      />
      <motion.circle cx={14} cy={21} r={1.4} fill="currentColor" stroke="none" variants={popIn} />
    </>
  );
}

// Distributed Systems Patterns — three nodes pop in, then the path
// connecting them draws.
function NetworkContent() {
  return (
    <>
      <motion.circle cx={6} cy={21} r={2} variants={popIn} />
      <motion.circle cx={14} cy={6} r={2} variants={popIn} />
      <motion.circle cx={22} cy={21} r={2} variants={popIn} />
      <motion.path d="M7.7 19.2 12.6 8M15.4 8l4.9 11.2" variants={drawIn} />
    </>
  );
}

// Interview Framework — three ticks land one after another.
function ChecklistContent() {
  return (
    <>
      <motion.path d="M3 8.5l2 2 4-4" variants={popIn} />
      <motion.path d="M3 15l2 2 4-4" variants={popIn} />
      <motion.path d="M3 21.5l2 2 4-4" variants={popIn} />
      <motion.path d="M13 9.5h12M13 16h12M13 22.5h12" strokeWidth={1.1} variants={drawIn} />
    </>
  );
}

const CONTENT_BY_VARIANT: Record<TrackBadgeVariant, () => ReactNode> = {
  electric: ElectricContent,
  database: DatabaseContent,
  gauge: GaugeContent,
  network: NetworkContent,
  checklist: ChecklistContent,
};

/**
 * The badge chip itself — same recipe as a lesson card's icon chip
 * (`iconAccent.soft`/`.text`/`.iconGlow`/`.iconShadow`), just larger, so it
 * reads as this track's own logo rather than a new decorative language.
 * `iconGlow` (dark) and `iconShadow` (Paper) are each empty in the other
 * theme's table, so exactly one of the two ever actually renders here.
 */
export function TrackBadge({ trackIndex, accent }: { trackIndex: number; accent: TrackAccentClasses }) {
  const ref = useRef<SVGSVGElement>(null);
  // `-15% 0px` margin: the badge starts its animation slightly before the
  // zone's header is dead-center in the viewport, so a reader scrolling
  // down sees it fire right as the section's title arrives, not after.
  // `once: false` — it replays every time the badge (re-)enters the
  // viewport in either scroll direction, not just the first pass.
  const isInView = useInView(ref, { once: false, margin: "0px 0px -15% 0px" });
  const prefersReducedMotion = useReducedMotion();
  const Content = CONTENT_BY_VARIANT[getTrackBadgeVariant(trackIndex)];

  // A `repeat: Infinity`/`repeatType: "mirror"` transition (see the variants
  // above) tracks its own internal progress across every mirror bounce, and
  // interrupting it mid-cycle — which is exactly what happens whenever
  // `isInView` flips to `false` and back — can hand it back a stale
  // in-between state instead of cleanly restarting, so the badge comes back
  // stuck near its `hidden` frame (looks "vanished") instead of animating.
  // Bumping `loopKey` on every false→true transition and keying the `motion.g`
  // on it forces React to fully unmount and remount the animated content
  // each time the badge re-enters view, so every loop always starts from a
  // fresh `hidden` mount rather than resuming interrupted animation state.
  const [loopKey, setLoopKey] = useState(0);
  const wasInView = useRef(false);
  useEffect(() => {
    if (isInView && !wasInView.current) {
      setLoopKey((key) => key + 1);
    }
    wasInView.current = isInView;
  }, [isInView]);

  return (
    <span
      className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text} ${accent.iconGlow} ${accent.iconShadow}`}
    >
      <svg
        ref={ref}
        viewBox={VIEW_BOX}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-6"
        aria-hidden
        focusable="false"
      >
        <motion.g
          key={prefersReducedMotion ? "static" : loopKey}
          initial={prefersReducedMotion ? "visible" : "hidden"}
          animate={prefersReducedMotion || isInView ? "visible" : "hidden"}
          variants={containerVariants}
        >
          <Content />
        </motion.g>
      </svg>
    </span>
  );
}
