import Link from "next/link";
import { Check, Clock, Lock } from "lucide-react";
import type { FoundationLesson } from "@/content/foundations/types";
import type { FoundationLessonStatus } from "@/lib/foundationsProgress";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { slugFromEntityType } from "@/lib/entityDeepDive";

export interface MapNodeProps {
  lesson: FoundationLesson;
  x: number;
  y: number;
  status: FoundationLessonStatus;
  /** `start` = the forest's one root (no prerequisites), `capstone` = its
      one true sink (nothing depends on it) — computed in `FoundationsMap`,
      not hardcoded here, so a future edit to the DAG can't drift out of
      sync with which node gets the callout. */
  emphasis?: "start" | "capstone";
  /** This visit's reveal, from `FoundationsMap`'s seen/completed diff —
      `"completing"` if this lesson finished since the reader last looked
      at the map (plays the yellow→green wipe below), `"unlocking"` if it
      just became `available` as a result (plays the dark→yellow pop).
      Undefined for everything else — old history and still-locked nodes
      render statically, no replay. */
  transition?: "completing" | "unlocking";
  /** True on the `/foundations` map's cave treatment (Batman Mode /
      `data-theme="night-ops"` — see `FoundationsMap`'s `cave` flag).
      Doesn't change *which* nodes are locked/available/completed — only
      adds the "lit chapter glowing out of the dark" look (an outer
      `box-shadow` bloom in the same tone `toneClasses` already uses) to
      an `available`/`completed` card's resting state, on top of the
      existing yellow→green wipe/pop transitions, which play identically
      either way. A `locked` node ignores this entirely — in cave mode
      it's never rendered here at all; `FoundationsMap` routes locked
      nodes through `CaveShroud` instead, which is what actually hides
      them. */
  cave?: boolean;
}

const NODE_WIDTH = 168;

// Same small hairline corner-tag convention `/learn`'s "Fig. 01" specimen
// box uses (`border-signal/50 bg-bg ... font-mono uppercase`) — reused
// here instead of inventing new chrome for "this is where you start" /
// "this is the final one."
const EMPHASIS_TAG = "border border-signal/50 bg-bg px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-signal";

const ICON_TONE: Record<FoundationLessonStatus, string> = {
  locked: "text-text-subtle",
  available: "text-signal",
  completed: "text-status-healthy",
};

// Same "full-width strip reads at a glance" reasoning as
// `ComponentNode.tsx`'s own status bar — a flat color chip carries state
// even at a zoomed-out glance across the whole forest, before the reader's
// eye has resolved the lock/check/dot glyph or the border tint. One more
// place status renders, not a competing source of truth: still keyed off
// the same `FoundationLessonStatus`.
const STRIP_TONE: Record<FoundationLessonStatus, string> = {
  locked: "bg-border",
  available: "bg-signal",
  completed: "bg-status-healthy",
};

// The icon swatch's own border/background per status — subtler than the
// card's own `toneClasses` (that already carries the loud signal), this
// just keeps the tile from reading as flat-gray on a locked node or
// fighting the card's tint on an available/completed one.
const SWATCH_TONE: Record<FoundationLessonStatus, string> = {
  locked: "border-border/50 bg-bg-elevated/60",
  available: "border-signal/40 bg-bg-elevated",
  completed: "border-status-healthy/40 bg-bg-elevated",
};

// Roughly where the wipe (`node-complete-wipe`, `globals.css`, 1000ms
// delay + 1500ms linear) has swept past the checkmark's position, near the
// card's right edge — used to delay the checkmark's own `animate-pop-in`
// so it visibly pops right as the reveal uncovers it, instead of finishing
// its 300ms pop at ~300ms while still hidden under the "available"
// overlay and just sitting there fully-scaled by the time the wipe
// arrives. Not pixel-exact (the wipe's boundary is a moving vertical line,
// the icon a fixed point near the right edge) — a decorative timing detail,
// close enough reads as intentional.
const COMPLETING_CHECK_DELAY_MS = 2350;

/**
 * One checkpoint on the `/foundations` forest map (`FoundationsMap`) —
 * absolutely positioned by percent coordinates from `mapLayout.ts`. A
 * bordered card (title, minutes, corner number tag, related-entity icon)
 * rather than a bare circular badge — reuses this project's `BoxTone`
 * vocabulary for state instead of new colors: `locked` reads as
 * dimmed/neutral, `available` as `signal` (the one accent, "do this
 * next"), `completed` as `healthy`.
 *
 * Internally shaped like `ComponentNode.tsx`'s Workshop canvas card (top
 * status strip, icon in its own bordered swatch, a `border-t`-separated
 * footer for the minutes readout) rather than one flat padded box — a
 * single bordered rectangle with plain text inside read as dull/interchangeable
 * (every node the same gray box regardless of state), so this borrows the
 * one card language the app already uses for "this is a distinct, stateful
 * thing on a canvas" instead of inventing a second one.
 *
 * A locked node is a plain `<div>`, not a `<Link>` — there's nothing to
 * click. Visibility is entirely the torch's job (`FoundationsMap` routes
 * locked nodes, and their incoming trail, through `CaveShroud`), and a
 * card that's only ever visible while continuously lit has nothing left
 * for a click to *do*: no toggle to persist past the beam moving on, no
 * separate "peek" state to fall out of sync with what's actually shown.
 * `aria-hidden` for the same reason — this is a sighted, mouse-driven
 * preview of what's ahead, not a second way to reach lesson content
 * (visiting a lesson directly always works regardless of its map status,
 * see `FoundationLesson.prerequisites`'s doc comment; the default theme's
 * `FoundationsJourney` is the fully keyboard/screen-reader-reachable index).
 *
 * `transition === "completing"` renders the real card (already its true
 * `"completed"` colors — `status` doesn't lie here) with a second,
 * decorative "available"-styled duplicate stacked directly on top of it
 * (`pointer-events-none`, `aria-hidden`, exact same position/size). That
 * duplicate is what animates: `animate-node-complete-wipe` (`globals.css`)
 * holds it fully opaque for a beat — long enough for the reader to
 * actually register "this was yellow" before anything moves, the same
 * problem an earlier single-layer crossfade had — then clips it away from
 * the left edge over 1500ms (slowed from an initial 700ms, reported back
 * as still too quick to actually watch the color sweep across rather than
 * just notice it had), so the real green card underneath gets uncovered
 * left-to-right, like a progress bar's fill sweeping across rather than
 * the whole card flashing to its new color at once. See the
 * keyframe's own comment for why a clip-path wipe instead of a `transition
 * -colors` crossfade, and why `forwards` is safe on this one layer where
 * it wasn't on `node-light-in`.
 */
export function MapNode({ lesson, x, y, status, emphasis, transition, cave }: MapNodeProps) {
  const isCompleting = transition === "completing";

  // The lesson's "logo" — same `ENTITY_CATALOG` icon shown on that entity's
  // Workshop canvas card and `/entities/[slug]` hero, so a lesson reads as
  // "the Load Balancer one" at a glance instead of needing its title read
  // first. Opt-in, same as `DiagramBox`'s own `icon` prop: only the first
  // `relatedEntitySlugs` entry, and only when one actually exists (several
  // lessons — DNS, TCP/UDP, REST — have no simulated counterpart at all,
  // and get no icon rather than a wrong/generic one).
  const relatedSlug = lesson.relatedEntitySlugs?.[0];
  const Icon = relatedSlug
    ? ENTITY_CATALOG.find((entity) => slugFromEntityType(entity.type) === relatedSlug)?.icon
    : undefined;

  // Parameterized so the "completing" overlay can render the same card
  // shape with a different (fake, decorative) status — `checkDelayMs`
  // only ever set on the real card's own checkmark, never the overlay's
  // (the overlay never shows a checkmark at all; it's stuck at
  // "available"). Three tiers, edge to edge rather than one padded block:
  // a top status strip (no padding — it needs to run flush to all three
  // sides), a header (icon swatch + number/status glyph + title), and a
  // `border-t`-separated footer for the minutes readout, same three-tier
  // shape `ComponentNode.tsx` uses for its own status bar / header /
  // metadata-row split.
  function renderContent(contentStatus: FoundationLessonStatus, checkDelayMs?: number) {
    return (
      <>
        <div className={`h-[3px] w-full shrink-0 ${STRIP_TONE[contentStatus]}`} aria-hidden />
        <div className="flex items-start gap-2 px-2.5 pt-2 pb-1.5">
          <span
            className={`flex size-6 shrink-0 items-center justify-center border ${SWATCH_TONE[contentStatus]}`}
            aria-hidden
          >
            {Icon ? (
              <Icon className={`size-3.5 ${ICON_TONE[contentStatus]}`} />
            ) : (
              <span className="font-mono text-[9px] text-text-subtle">{String(lesson.number).padStart(2, "0")}</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              {Icon && (
                <span className="font-mono text-[9px] text-text-subtle">{String(lesson.number).padStart(2, "0")}</span>
              )}
              <span className={Icon ? "" : "ml-auto"} aria-hidden>
                {contentStatus === "locked" && <Lock className="size-3 text-text-subtle" />}
                {contentStatus === "completed" && (
                  <Check
                    className="size-3 animate-pop-in text-status-healthy"
                    style={checkDelayMs ? { animationDelay: `${checkDelayMs}ms` } : undefined}
                  />
                )}
                {contentStatus === "available" && <span className="block size-1.5 rounded-full bg-signal" />}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-text">{lesson.title}</p>
          </div>
        </div>
        <p className="flex items-center gap-1 border-t border-border/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide text-text-subtle">
          <Clock className="size-2.5" aria-hidden />
          {lesson.estimatedMinutes} min
        </p>
        {emphasis && (
          <span className={`absolute -top-3 left-1/2 -translate-x-1/2 ${EMPHASIS_TAG}`}>
            {emphasis === "start" ? "Start" : "Final challenge"}
          </span>
        )}
      </>
    );
  }

  // The cave's "dark → glow" language, layered onto the exact same
  // resting classes the default theme already uses (same border color,
  // same hover behavior) rather than a parallel color scheme — only an
  // outer `box-shadow` bloom gets added, in whichever tone `toneClasses`
  // was already going to use, so a lit card genuinely reads as "glowing
  // out of the dark" instead of just "still has its normal border." The
  // `start` node gets a slower, more visible pulse on top — it's the
  // forest's one always-on beacon, worth calling out beyond the flat glow
  // every other lit card gets.
  const glowClasses = !cave
    ? ""
    : status === "completed"
      ? " shadow-[0_0_16px_2px_var(--color-status-healthy)]"
      : status === "available"
        ? emphasis === "start"
          ? " shadow-[0_0_20px_4px_var(--color-signal)] animate-cave-beacon-pulse"
          : " shadow-[0_0_14px_2px_var(--color-signal)]"
        : "";

  const toneClasses =
    (status === "completed"
      ? "border-status-healthy/50 bg-bg-panel"
      : status === "available"
        ? "border-signal/70 bg-bg-panel hover:-translate-y-1 hover:border-signal hover:bg-bg-elevated hover:shadow-dropdown"
        : "border-border/50 bg-bg-panel opacity-60") + glowClasses;

  const style = {
    left: `${x}%`,
    top: `${y}%`,
    width: NODE_WIDTH,
    transform: "translate(-50%, -50%)",
  };

  // A locked node is a plain, `aria-hidden` `<div>` — see this component's
  // own doc comment above. In cave mode (Batman Mode) it's wrapped in
  // `FoundationsMap`'s `CaveShroud`, which is what actually hides it until
  // the torch sweeps over. Outside cave mode this still renders inline
  // (dimmed, per `toneClasses`), just never shrouded.
  if (status === "locked") {
    return (
      <div
        aria-hidden
        className={`absolute z-10 flex flex-col border ${toneClasses}`}
        style={style}
      >
        {renderContent(status)}
      </div>
    );
  }

  return (
    <>
      <Link
        href={`/foundations/${lesson.slug}`}
        className={`absolute z-10 flex flex-col border transition-all duration-fast ease-standard ${
          transition === "unlocking" ? "animate-node-light-in" : ""
        } ${toneClasses}`}
        style={style}
      >
        {renderContent(status, isCompleting ? COMPLETING_CHECK_DELAY_MS : undefined)}
      </Link>
      {isCompleting && (
        <div
          aria-hidden
          className="animate-node-complete-wipe pointer-events-none absolute z-20 flex flex-col border border-signal/70 bg-bg-panel"
          style={style}
        >
          {renderContent("available")}
        </div>
      )}
    </>
  );
}
