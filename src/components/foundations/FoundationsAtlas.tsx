"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Clock, MapPin } from "lucide-react";
import type { FoundationLesson } from "@/content/foundations/types";
import { groupLessonsByTrack, type FoundationTrack } from "@/content/foundations/tracks";
import { useFoundationsProgress } from "@/lib/foundationsProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Badge } from "@/components/ui/Badge";
import { LessonGlyph } from "./lessonGlyphs";
import { formatTotalTime } from "./FoundationsJourney";
import { TrackBadge } from "./TrackBadge";
import { sectionRevealVariants, staticRevealVariants } from "./sectionRevealVariants";
import { getTrackAccent, TRACK_ACCENTS, TRACK_ACCENTS_DARK, type TrackAccentClasses } from "./trackAccent";

/**
 * An alternate `/foundations` index body, shown side-by-side with
 * `FoundationsJourney` behind `FoundationsIndexView`'s "Journey / Atlas"
 * toggle so the two can actually be compared rather than one replacing
 * the other outright. Same data, same "browsing is always free" rule —
 * this changes composition, not content or access.
 *
 * The brief this was built against: cards that sit *inside* a designed
 * environment rather than on a flat page, a visual metaphor per lesson,
 * a real sense of position/progression, and subtle graph-like connective
 * tissue between lessons — reinterpreted through this app's own existing
 * vocabulary (the instrument-readout strip, the corner-bracket card, the
 * hairline "rail" `FoundationsJourney` already draws) rather than a new
 * illustration style, so it still reads as *this* product and not a
 * generic onboarding screen. Two ideas are genuinely new:
 *
 * - `AtlasBackdrop`: a fixed atmosphere layer behind the whole page
 *   instead of a flat `bg-bg`.
 * - Each track renders as a "bus": one hairline spine running the width
 *   of the zone, every lesson hanging off it by a short tick — a real
 *   dependency-order cue (a reader moves left-to-right, top-to-bottom
 *   along the same rail `FoundationsJourney` draws vertically down the
 *   margin) rather than a floating illustration.
 *
 * Dark and night-ops (the latter never actually reaches this component —
 * `FoundationsIndexView` branches to `FoundationsMap` before this file is
 * ever rendered) render exactly one accent — the app's plain copper
 * "signal" — for almost everything: the stepper, the zone header rule and
 * spine, the current-lesson glow ring, the corner color leak. This was
 * tried as full per-track color throughout (mirroring Paper via
 * `TRACK_ACCENTS_DARK` in `trackAccent.ts`) and flagged back directly —
 * that many simultaneously-colored elements diluted the one copper glow
 * `AtlasBackdrop` is actually built around, rather than complementing it.
 * Two things stayed from that pass, deliberately narrower: every lesson
 * card's icon chip (`iconAccent`, always `TRACK_ACCENTS_DARK` in dark —
 * see `AtlasLessonNode`'s own comment on why this is a *separate* prop from
 * the Paper-only `accent`) and each zone's `TrackBadge` — a per-track "logo"
 * was the actual ask; recoloring everything else wasn't. `TrackBadge`
 * itself replaced an earlier big background watermark icon (bottom-right,
 * 7% opacity) that got flagged back as barely visible and not worth the
 * space — see that file's own doc comment for the fuller history and why
 * it's a small animated badge in the header now instead. Paper
 * (`theme === "light"`) is the one theme with full per-track color
 * throughout, unchanged from before: one hue per track (`trackAccent.ts`)
 * threaded through the spine, the glyph swatches, the stepper markers, the
 * current-lesson glow, and each `AtlasZone`'s own solid color-block
 * background. Every `isLight`/`accent` branch below exists so dark stays
 * copper-only outside the icon chip and `TrackBadge` — don't widen it back
 * to full per-track color without new, explicit feedback asking for that
 * again.
 */
export function FoundationsAtlas({ lessons }: { lessons: FoundationLesson[] }) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const completedSlugs = useFoundationsProgress();
  const completed = useMemo(() => new Set(completedSlugs), [completedSlugs]);

  const totalMinutes = useMemo(
    () => lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0),
    [lessons]
  );
  const completedCount = useMemo(
    () => lessons.filter((lesson) => completed.has(lesson.slug)).length,
    [lessons, completed]
  );
  const nextLesson = useMemo(
    () => lessons.find((lesson) => !completed.has(lesson.slug)) ?? null,
    [lessons, completed]
  );
  const trackGroups = useMemo(() => groupLessonsByTrack(lessons), [lessons]);
  const currentTrackIndex = useMemo(() => {
    if (!nextLesson) return trackGroups.length - 1;
    const index = trackGroups.findIndex((group) => group.lessons.some((lesson) => lesson.slug === nextLesson.slug));
    return index === -1 ? 0 : index;
  }, [trackGroups, nextLesson]);

  return (
    <>
      <AtlasBackdrop isLight={isLight} />

      <div className="relative mx-auto w-full max-w-7xl px-6">
        <PhaseStepper
          trackGroups={trackGroups}
          completed={completed}
          currentTrackIndex={currentTrackIndex}
          totalLessons={lessons.length}
          completedCount={completedCount}
          totalMinutes={totalMinutes}
          nextLesson={nextLesson}
          isLight={isLight}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-14">
        {trackGroups.map((group, index) => (
          <AtlasZone
            key={group.track.title}
            index={index}
            track={group.track}
            lessons={group.lessons}
            completed={completed}
            currentSlug={nextLesson?.slug}
            isLight={isLight}
          />
        ))}
      </div>
    </>
  );
}

/**
 * The one thing left genuinely fixed: two soft blurred color blobs (copper
 * signal top-left, status-healthy green bottom-right) plus a top/bottom
 * fade, behind the whole scrolling page — a constant, ambient light source
 * the structural elements (grid, mesh graph, cards) all drift past, rather
 * than something that itself needs to track scroll position. Every layer
 * sits at a low, hand-tuned opacity — meant to survive being ignored, never
 * to compete with a lesson card's text.
 *
 * Paper does *not* get a colored version of this — an earlier pass tried
 * five overlapping blurred color blobs here and it read as a muddy
 * "spray" (their overlaps desaturate toward brown, the opposite of
 * "punchy"). Real saturation under Paper lives in `AtlasZone`'s `wash`
 * instead: one confidently solid color block per track, sharp-edged, no
 * blur — closer to how a genuinely well-designed colorful UI actually
 * blocks color (flat fields, not diffuse glow) than a soft-focus wash
 * ever was.
 *
 * Two things used to live here too and both moved out to
 * `FoundationsIndexView`'s own `<main>`, as a normal-flow `absolute` layer
 * instead of painted onto this `fixed` one: the `bg-blueprint-grid` dot
 * texture, and `SystemMeshBackground`'s node/edge graph (including its one
 * copper-colored "highlighted path" line). Both got flagged back by name as
 * "still staying in the same place" while scrolling — a `fixed` layer
 * behind scrolling cards means every zone scrolls past the exact same
 * frozen structure, which reads as static graph paper under the cards
 * rather than a space the cards sit *in*. The two blobs below are the
 * intentional exception: they're meant to stay put. Don't move the
 * grid/mesh back here, and don't make the blobs scroll, without new
 * explicit feedback asking for either.
 *
 * Its own opaque base fill (`bg-bg`/`bg-bg-panel`) moved out along with the
 * grid, for a related reason: this layer needs to stay *transparent* so the
 * scrolling grid/mesh layer behind it (in stacking order, but painted after
 * `main`'s own background) actually shows through instead of being papered
 * over by an opaque fill sitting in front of it. `main` itself already
 * carries that same color as a plain (non-fixed) background — see
 * `bg-reading-room` in `FoundationsIndexView` — so nothing is actually
 * missing a fill; Paper's branch below has nothing left to contribute and
 * returns `null`.
 *
 * (A "Parallax" mode that drifted these blobs with scroll position was
 * tried and removed again — back to plain and fixed, per the reasoning
 * above.)
 */
function AtlasBackdrop({ isLight }: { isLight: boolean }) {
  if (isLight) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 left-1/4 h-[32rem] w-[32rem] rounded-full bg-signal/[0.1] blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-status-healthy/[0.08] blur-[120px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-transparent to-bg" />
    </div>
  );
}

/**
 * The page's one progression readout: five track markers connected by a
 * line (phase progress), the usual lesson/time/percent figures, and a
 * "you are here" line pointing at `nextLesson` — the map-legend idea
 * `FoundationsMap` already uses for Batman Mode, translated into the
 * default theme's flatter, non-cave vocabulary.
 */
function PhaseStepper({
  trackGroups,
  completed,
  currentTrackIndex,
  totalLessons,
  completedCount,
  totalMinutes,
  nextLesson,
  isLight,
}: {
  trackGroups: { track: FoundationTrack; lessons: FoundationLesson[] }[];
  completed: Set<string>;
  currentTrackIndex: number;
  totalLessons: number;
  completedCount: number;
  totalMinutes: number;
  nextLesson: FoundationLesson | null;
  isLight: boolean;
}) {
  const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Explicit two-row grid (markers+connectors on row 1, labels on row 2)
  // instead of the previous flex-column-per-track layout, which centered
  // each connecting line within that *whole track's* height (marker +
  // label) rather than the marker's own height alone — a two-line label
  // ("Internet & Web Fundamentals") made that track's item taller than a
  // neighboring one-line label ("Data & Storage"), so each local line
  // segment centered at a different height and the "connecting" line
  // visibly zigzagged across the row instead of running straight through
  // every marker. Markers/connectors all sit on row 1 (uniform height,
  // since every marker is the same `size-8`, independent of any label's
  // line count), labels sit on row 2 in the same columns — alignment is
  // guaranteed by the grid's column boundaries, not by the two rows
  // happening to compute the same heights.
  // Connector tracks are `minmax(3.5rem, 1fr)` — a floor so they never
  // collapse thinner than before, but otherwise free to grow — combined
  // with `flex-1` on the grid itself below, this stretches the five
  // markers out to actually use the row's own width (previously fixed at
  // `3.5rem` each, the whole stepper sat in a cramped ~380px on the left
  // while the rest of the row up to the stats block sat empty — flagged
  // back directly as "tacky"/wasted space). The page's own `max-w-7xl`
  // ancestor still caps how far this can stretch on an ultra-wide monitor,
  // so it grows to fill the row without ever running unbounded.
  const trackCount = trackGroups.length;
  const gridTemplateColumns = Array.from({ length: trackCount * 2 - 1 }, (_, i) =>
    i % 2 === 0 ? "2rem" : "minmax(3.5rem, 1fr)"
  ).join(" ");

  return (
    <div className="border-y border-border bg-bg/60 py-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="grid flex-1 items-center gap-y-2.5" style={{ gridTemplateColumns }}>
          {trackGroups.map((group, index) => {
            const trackDone = group.lessons.length > 0 && group.lessons.every((l) => completed.has(l.slug));
            const isCurrent = !trackDone && index === currentTrackIndex;
            // Paper only, same as before this file's dark pass — the
            // stepper stays the app's plain copper "you are here" signal
            // under dark rather than picking up per-track color, so that
            // one consistent readout doesn't compete with the per-card
            // logo colors below for what's "the accent" on this page.
            const accent = isLight ? TRACK_ACCENTS[getTrackAccent(index)] : null;
            const markerColumn = index * 2 + 1;
            return (
              <span
                key={`marker-${group.track.title}`}
                style={{ gridColumn: markerColumn, gridRow: 1 }}
                className={`flex size-8 items-center justify-center justify-self-center border font-mono text-xs transition-colors duration-fast ease-standard ${
                  trackDone
                    ? "border-status-healthy bg-status-healthy/10 text-status-healthy"
                    : isCurrent
                      ? accent
                        ? `${accent.border} ${accent.soft} ${accent.text}`
                        : "border-signal bg-signal/10 text-signal shadow-[0_0_0_4px_hsl(28_85%_58%/0.12)]"
                      : accent
                        ? `${accent.borderFaint} text-text-subtle`
                        : "border-border text-text-subtle"
                }`}
              >
                {trackDone ? <Check className="size-4" aria-hidden /> : String(index + 1).padStart(2, "0")}
              </span>
            );
          })}
          {trackGroups.slice(0, -1).map((group, index) => {
            const trackDone = group.lessons.length > 0 && group.lessons.every((l) => completed.has(l.slug));
            const accent = isLight ? TRACK_ACCENTS[getTrackAccent(index)] : null;
            return (
              <span
                key={`connector-${group.track.title}`}
                aria-hidden
                style={{ gridColumn: index * 2 + 2, gridRow: 1 }}
                className={`h-px justify-self-stretch ${
                  trackDone ? "bg-status-healthy/50" : accent ? accent.lineFaint : "bg-border"
                }`}
              />
            );
          })}
          {trackGroups.map((group, index) => (
            <span
              key={`label-${group.track.title}`}
              style={{ gridColumn: index * 2 + 1, gridRow: 2 }}
              className="w-24 max-w-24 justify-self-center self-start text-center font-mono text-[9px] uppercase tracking-wide text-text-subtle"
            >
              {group.track.title}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-wide text-text-subtle">
          <span>
            <strong className={completedCount > 0 ? "text-status-healthy" : "text-text"}>{completedCount}</strong>/
            {totalLessons} complete <span className="text-text-subtle">({percent}%)</span>
          </span>
          <span aria-hidden className="text-border">
            /
          </span>
          <span>
            <strong className="text-text">{formatTotalTime(totalMinutes)}</strong> total
          </span>
        </div>
      </div>

      <div className="mt-5">
        {nextLesson ? (
          <Link href={`/foundations/${nextLesson.slug}`} className="group inline-flex min-w-0 items-center gap-2.5 text-sm">
            <MapPin className="size-3.5 shrink-0 text-signal" aria-hidden />
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-signal">
              {completedCount === 0 ? "Start here" : "You are here"}
            </span>
            <span className="min-w-0 truncate text-text-muted group-hover:text-text">
              {String(nextLesson.number).padStart(2, "0")} — {nextLesson.title}
            </span>
            <ArrowRight
              className="size-3.5 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden
            />
          </Link>
        ) : (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Check className="size-3.5 shrink-0 text-status-healthy" aria-hidden />
            All {totalLessons} lessons complete — revisit any of them below, any time.
          </p>
        )}
      </div>
    </div>
  );
}

function AtlasZone({
  index,
  track,
  lessons,
  completed,
  currentSlug,
  isLight,
}: {
  index: number;
  track: FoundationTrack;
  lessons: FoundationLesson[];
  completed: Set<string>;
  currentSlug?: string;
  isLight: boolean;
}) {
  const doneCount = lessons.filter((lesson) => completed.has(lesson.slug)).length;
  const trackDone = lessons.length > 0 && doneCount === lessons.length;
  // The zone chrome itself (header rule, spine, blur wash, "Track NN"
  // label) stays Paper-only, same as before this file's dark pass — see
  // the note by `PhaseStepper`'s own `accent`. Dark's one zone-level accent
  // is the watermark icon below (`iconAccent`, used for its color only),
  // kept deliberately separate from this `accent` so a feedback round
  // asking "why did the copper glow disappear" can't happen again by
  // accident — `accent` staying `null` here means every other bit of zone
  // chrome falls straight back to its original neutral/copper dark look.
  const accent = isLight ? TRACK_ACCENTS[getTrackAccent(index)] : null;
  // Always defined, both themes — passed to `AtlasLessonNode` as the icon
  // chip's own color, independent of `accent` above.
  const iconAccent = (isLight ? TRACK_ACCENTS : TRACK_ACCENTS_DARK)[getTrackAccent(index)];
  const prefersReducedMotion = useReducedMotion();

  return (
    // `isolate` — load-bearing, same reason `<main>` needs it (see
    // `FoundationsIndexView`'s own comment): without it, this section's
    // inner `z-10` content div isn't scoped to this section at all — it's
    // compared against every other z-indexed element in `<main>`'s shared
    // stacking context, header included, and being later in the DOM than
    // the sticky `AppHeader` (also `z-10`) meant it painted on *top* of
    // the header while scrolling. `isolate` walls this section's z-index
    // layering off as its own local stacking context so it can never leak
    // out and compete with the page chrome again.
    <motion.section
      initial="hidden"
      whileInView="visible"
      // `once: false` — replays every time the zone (re-)enters the
      // viewport, not just the first pass down the page; scrolling back up
      // to an earlier track sees it fade/slide in again too.
      viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
      variants={prefersReducedMotion ? staticRevealVariants : sectionRevealVariants}
      className={`relative isolate overflow-hidden rounded-[var(--landing-radius-lg)] ${
        accent ? `border ${accent.borderFaint} bg-bg-elevated/50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-8` : ""
      }`}
    >
      {/* Replaces the old flat `accent.wash` fill — a whole zone solid-color
          behind white/near-white cards read as "the section is just filled
          in green" and swallowed any card using a similarly-toned fill
          (e.g. a completed card's `status-healthy` tint) whole. A dot-grid
          texture was tried next and called out as "bizarre" — this instead
          follows the reference the user pointed at directly: one or two
          large, softly blurred color blobs bleeding in from a corner,
          clipped by the zone's own edge, rather than a texture tiled across
          the whole area. Each zone only ever uses its own single hue here
          (never several different-colored blobs overlapping in the same
          view) — that overlap is specifically what read as "muddy" the one
          time this file tried a multi-hue blurred backdrop before. Paper
          only — dark's zone-level wash is the fixed copper/status-healthy
          blobs in `AtlasBackdrop` plus the `TrackBadge` in the header below;
          stacking a second, per-track-colored blur pair on top of those
          muddied the one copper glow that page was actually built around,
          per direct feedback. `z-0`/`z-10` (not DOM order) keeps both blobs
          under the actual zone content below. */}
      {accent && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-20 z-0 size-72 rounded-full blur-3xl"
            style={{ backgroundColor: `hsl(${accent.hue} / 16%)` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 z-0 size-56 rounded-full blur-3xl"
            style={{ backgroundColor: `hsl(${accent.hue} / 12%)` }}
          />
        </>
      )}
      <div className="relative z-10">
        <div
          className={`mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b pb-4 ${accent ? accent.borderFaint : "border-border"}`}
        >
          <div className="flex items-center gap-4">
            {/* The zone's own visual metaphor now — see `TrackBadge`'s doc
                comment for why this replaced the old background watermark.
                Rendered on both themes (`iconAccent` already covers both),
                unlike the Paper-only `accent` chip/rule below it. */}
            <TrackBadge trackIndex={index} accent={iconAccent} />
            <div className="flex items-baseline gap-3">
              {accent ? (
                // A real chip under Paper, not plain colored text — bordered,
                // solidly filled in the track's own hue (not a 10% tint) so
                // it reads as this zone's own color-coded stamp at a glance,
                // and lifted a couple of px above the header's baseline so it
                // sits slightly proud of the row instead of inline with it.
                <span
                  className={`inline-flex -translate-y-0.5 items-center rounded-md border border-white/25 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm ${accent.solid}`}
                >
                  {`Track ${String(index + 1).padStart(2, "0")}`}
                </span>
              ) : (
                <span className="font-mono text-[10px] text-text-subtle">
                  {`// track ${String(index + 1).padStart(2, "0")}`}
                </span>
              )}
              <h2 className="text-lg font-semibold text-text">{track.title}</h2>
            </div>
          </div>
          <p className="max-w-sm text-xs text-text-subtle sm:text-right">{track.description}</p>
        </div>

        {/* The bus: one spine the width of the zone, every lesson in the
            grid's first visual row hanging off it by a short tick — see
            this file's doc comment for why this replaces a floating
            illustration. Tinted by the zone's own accent under Paper, so a
            whole track reads as "one color-coded region" at a glance, not
            just its current lesson. Only row-1 items get a tick (see
            `AtlasLessonNode`'s own comment on `rowIndex`) — the spine only
            exists at the very top of this multi-row grid, so a lesson
            wrapped onto row 2+ has nothing above it for a tick to reach;
            one used to render there anyway, a short vertical dash floating
            in the row gap, connected to nothing (flagged back as looking
            like the card was "flying"). */}
        <div className="relative">
          <span
            aria-hidden
            className={`absolute inset-x-0 top-0 hidden h-px sm:block ${accent ? accent.lineFaint : "bg-border"}`}
          />
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 pt-6 sm:grid-cols-2 sm:pt-8 lg:grid-cols-3 xl:grid-cols-4">
            {lessons.map((lesson, i) => (
              <AtlasLessonNode
                key={lesson.slug}
                lesson={lesson}
                rowIndex={i}
                completed={completed.has(lesson.slug)}
                current={lesson.slug === currentSlug}
                accent={accent}
                iconAccent={iconAccent}
              />
            ))}
          </div>
        </div>

        {doneCount > 0 && (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-text-subtle">
            {doneCount}/{lessons.length} complete{trackDone ? " — track done" : ""}
          </p>
        )}
      </div>
    </motion.section>
  );
}

/**
 * The lesson grid's own column count steps at three breakpoints
 * (`sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — see `AtlasZone`), and
 * the "bus" spine only exists once, at the very top of the whole (possibly
 * multi-row) grid — so a lesson's tick only has something to connect to
 * while it's still in the grid's first visual row at whatever breakpoint
 * is active. `rowIndex < N` mirrors each breakpoint's own column count:
 * visible from `sm` on for the first 2 (every narrower grid has ≤2
 * columns), from `lg` on for the first 3, from `xl` on for the first 4 —
 * beyond index 3 a lesson is never in row 1 at any breakpoint this grid
 * supports, so its tick stays hidden outright. (Doesn't account for the
 * `current` lesson's own `sm:col-span-2` shifting later items' actual grid
 * position — a rare enough combination, and cosmetic enough a miss, that
 * exact grid auto-placement math didn't seem worth replicating here.)
 */
function getTickVisibilityClass(rowIndex: number): string {
  if (rowIndex < 2) return "hidden sm:block";
  if (rowIndex === 2) return "hidden lg:block";
  if (rowIndex === 3) return "hidden xl:block";
  return "hidden";
}

function AtlasLessonNode({
  lesson,
  rowIndex,
  completed,
  current,
  accent,
  iconAccent,
}: {
  lesson: FoundationLesson;
  /** This lesson's position within its track's lesson grid — see `getTickVisibilityClass`. */
  rowIndex: number;
  completed: boolean;
  current: boolean;
  /** Paper-only (`null` under dark) — everything on this card *except* the
   * icon chip: the tick, the current-lesson glow ring, the corner color
   * leak. Kept `null` in dark on purpose so those pieces fall straight back
   * to the app's plain copper "signal" accent — see `AtlasZone`'s header
   * comment for why (a round of feedback specifically wanted dark's copper
   * glow left alone). */
  accent: TrackAccentClasses | null;
  /** Always present, both themes — just the icon chip's color, the actual
   * "glow saturated logos, different colors" ask. */
  iconAccent: TrackAccentClasses;
}) {
  // A round of feedback called the previous version of this card (a solid
  // saturated color block standing in for an illustration, a bold rounded
  // pill button) "childish" next to the rest of the app's flatter,
  // instrument-like language — fair: that treatment borrowed straight from
  // a consumer onboarding-carousel reference without translating it into
  // this product's own idiom. This version keeps the one real idea worth
  // keeping from that pass (Paper's per-track color coding a reader can
  // scan at a glance) but expresses it the way the rest of this app already
  // does color: a small tinted icon chip, a hairline border, a restrained
  // hover lift — not a full-bleed banner or a saturated button.
  // No longer branches on `completed` — that used to tint the tick green,
  // a persistent status-healthy cue the `Badge` below already made
  // redundant (flagged back directly, along with the same green on the
  // icon chip below). Only `current` still gets its own distinct color.
  const tickColor = current
    ? accent
      ? accent.solid
      : "bg-signal"
    : accent
      ? accent.lineFaint
      : "bg-border";

  // Every card's icon carries the track's color regardless of completion
  // now — no more green tint on done (the `Badge` already says "Done"; a
  // second green cue on top of it was redundant). The tinted chip
  // *background* (`iconAccent.soft`), its `iconGlow` halo (dark), and its
  // `iconShadow` elevation (Paper) are all completed-only, though — an
  // upcoming chapter gets a bare colored icon, no box behind it; only a
  // finished one earns the filled, shadowed/glowing chip.
  const iconClasses = completed
    ? `${iconAccent.soft} ${iconAccent.text} ${iconAccent.iconGlow} ${iconAccent.iconShadow}`
    : iconAccent.text;

  const glow = current
    ? accent
      ? accent.glow
      : "shadow-[0_0_0_1px_hsl(28_85%_58%/0.35),0_20px_45px_-24px_hsl(28_85%_58%/0.4)]"
    : "";

  const arrowColor = iconAccent.text;

  return (
    <div className={`relative flex flex-col ${current ? "sm:col-span-2" : ""}`}>
      <span aria-hidden className={`absolute -top-6 left-7 h-6 w-px ${getTickVisibilityClass(rowIndex)} ${tickColor}`} />
      <Link
        href={`/foundations/${lesson.slug}`}
        // Completed used to carry its own green tint here — redundant next
        // to the "Done" badge already sitting on the card, and it fought
        // with the zone's own accent color underneath. A completed card now
        // gets the plain surface treatment below like any other lesson;
        // the badge alone carries the status. Every state gets a real
        // border plus a resting shadow (not just a hairline that matches
        // `AtlasBackdrop`'s own panel color) — on the page's slightly
        // darker backdrop a flat white card still needs its own edge to
        // read as a raised surface rather than a shape cut out of the page.
        className={`group relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-fast ease-standard hover:-translate-y-0.5 ${
          current
            ? `border-transparent bg-bg-elevated ${glow}`
            : "border-border bg-bg-elevated hover:border-border hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.16)]"
        }`}
      >
        {/* The one decorative touch this card gets under Paper: a flat-edged
            triangle of the track's own hue, tucked into the top corner and
            clipped by the card's own rounded border — a "color leak" a
            reader notices without it doing any work (no icon, no text),
            rather than the previous pass's full-bleed saturated banner.
            `-z-10` (not DOM order) keeps it behind the icon chip and badge
            above; sharp-edged and flat on purpose, matching this file's
            established "solid blocks, not diffuse glow" rule for color
            under Paper. Dark gets its glow from the icon chip's own
            `iconGlow` above instead — a second flat triangle would just
            compete with that. */}
        {accent && (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-5 -left-5 -z-10 size-24"
            style={{
              backgroundColor: `hsl(${accent.hue} / 12%)`,
              clipPath: "polygon(0 0, 100% 0, 0 100%)",
            }}
          />
        )}
        <div className="flex items-start justify-between gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClasses}`}>
            <LessonGlyph number={lesson.number} className="size-5" />
          </span>
          {completed ? (
            <Badge variant="success" dot>
              Done
            </Badge>
          ) : current ? (
            <Badge variant="primary" dot>
              Current
            </Badge>
          ) : (
            <span className="pt-1 font-mono text-[10px] text-text-subtle">{String(lesson.number).padStart(2, "0")}</span>
          )}
        </div>
        <h4 className={`font-semibold text-text ${current ? "text-lg" : "text-base"}`}>{lesson.title}</h4>
        <p className={`text-sm leading-relaxed text-text-muted ${current ? "" : "line-clamp-2"}`}>{lesson.tagline}</p>
        <div className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
          <Clock className="size-3" aria-hidden />
          {lesson.estimatedMinutes} min
          <ArrowRight
            className={`ml-auto size-3.5 shrink-0 opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100 ${arrowColor}`}
            aria-hidden
          />
        </div>
      </Link>
    </div>
  );
}
