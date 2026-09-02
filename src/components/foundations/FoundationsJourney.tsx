"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Clock } from "lucide-react";
import type { FoundationLesson } from "@/content/foundations/types";
import { groupLessonsByTrack, type FoundationTrack } from "@/content/foundations/tracks";
import { useFoundationsProgress } from "@/lib/foundationsProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Badge } from "@/components/ui/Badge";
import { LessonGlyph } from "./lessonGlyphs";
import { TrackBadge } from "./TrackBadge";
import { sectionRevealVariants, staticRevealVariants } from "./sectionRevealVariants";
import { getTrackAccent, TRACK_ACCENTS, type TrackAccentClasses } from "./trackAccent";

/**
 * The default-theme `/foundations` index body — everything below the page
 * header (the readout strip, the Continue/Start Here focal point, and the
 * five-track lesson grid). Renamed from `FoundationsList` and substantially
 * rebuilt: that version was a single flat 24-card grid with identical
 * visual weight everywhere and no sense of progress or sequence — reported
 * back as reading like "a static grid of identical cards," not a learning
 * journey. This version stays within the same design tokens/idioms the
 * rest of the app already established (the `/problems` page's readout
 * badges and left-accent-border rows, `Card.tsx`'s corner-bracket "reticle"
 * motif) rather than introducing new decoration — the fix is composition
 * (hierarchy, sequence, differentiated completion) and hand-authored
 * grouping (`FOUNDATION_TRACKS`), not more visual noise. The only new
 * decorative element is a hairline "rail" connecting the five track
 * markers down the left margin: it's a real structural cue (it literally
 * traces the sequence a reader moves through), not a floating illustration
 * — a deliberate reversal from an earlier pass on this page that tried a
 * circuit-schematic/wires/neumorphic-tile background layer and landed as
 * disconnected decorative noise every time.
 *
 * `/foundations/[slug]` stays directly reachable regardless of track/
 * completion state ("browsing is always free," same as ever) — the
 * Continue/Start Here band is a recommendation, not a gate.
 *
 * Paper (the light theme) gets one more thing dark/night-ops don't: each
 * track's marker/header rule/card corners pick up that track's own hue
 * from `trackAccent.ts` (the same map `FoundationsAtlas` uses) instead of
 * the plain border-gray this page used everywhere before — flagged back
 * as "bland, no color" once seen next to Atlas. `ContinueBand`'s signal
 * accent and the green "complete" language stay universal across every
 * track on purpose (one consistent "do this next"/"done" cue, not five)
 * — only the passive/structural chrome picks up per-track color.
 *
 * `TrackSection`'s zone panel went through the same back-and-forth Atlas's
 * did, and landed in the same place — see that file's own doc comment for
 * the fuller history. Short version: a flat full-saturation `wash` fill
 * read as "the whole section is just filled in [color]" and swallowed a
 * same-toned card (a completed lesson's old green tint) whole; a dot-grid
 * texture read as "bizarre"; what's here now is two large, softly blurred
 * blobs in the zone's own single hue (never several different hues
 * overlapping — that's specifically what read as a muddy "spray" the one
 * time this file tried a multi-hue blurred backdrop), plus a real border
 * and a lifted, elevated fill so the zone reads as a bordered box on the
 * page rather than a borderless wash blending into it. Completed lessons
 * lost their own green background for the same reason — the `Badge`
 * already says "Done"; a color fill on top of it was redundant and fought
 * the zone's own accent underneath.
 */
export function FoundationsJourney({ lessons }: { lessons: FoundationLesson[] }) {
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
  // The earliest not-yet-complete lesson in course order — "pick up where
  // you left off," not just "any unfinished lesson." `null` once every
  // lesson is done.
  const nextLesson = useMemo(
    () => lessons.find((lesson) => !completed.has(lesson.slug)) ?? null,
    [lessons, completed]
  );
  const trackGroups = useMemo(() => groupLessonsByTrack(lessons), [lessons]);

  return (
    <>
      <div className="relative mx-auto w-full max-w-7xl px-6">
        <ReadoutStrip
          totalLessons={lessons.length}
          completedCount={completedCount}
          totalMinutes={totalMinutes}
        />
      </div>

      {/* `pb-6` (on top of the track section's own `py-14` top padding
          right below) — flagged back as too tight: the band and the first
          zone panel read as one run-on block without a clearer gap
          between "here's what's next" and "here's everything." */}
      <div className="mx-auto w-full max-w-7xl px-6 pt-8 pb-6">
        <ContinueBand nextLesson={nextLesson} totalLessons={lessons.length} completedCount={completedCount} />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-14 px-6 py-14">
        {/* The rail: one continuous hairline behind every track marker,
            centered on the 20px (`size-5`) markers below (10px from the
            section's own left edge — `left-2.5` is the closest Tailwind
            step to that center). Purely structural: it starts at the first
            marker and ends at the last, tracing the order a reader moves
            through the five tracks, top to bottom. */}
        <div
          aria-hidden
          className="absolute top-3 bottom-3 left-2.5 hidden w-px bg-border sm:block"
        />
        {trackGroups.map((group, index) => (
          <TrackSection
            key={group.track.title}
            index={index}
            track={group.track}
            lessons={group.lessons}
            completed={completed}
            isLight={isLight}
          />
        ))}
      </section>
    </>
  );
}

/** Shared with `FoundationsAtlas` — one place that turns a minute count into "~4.5 hrs"/"35 min". */
export function formatTotalTime(totalMinutes: number): string {
  const hours = totalMinutes / 60;
  if (hours < 1) return `${totalMinutes} min`;
  const rounded = Math.round(hours * 10) / 10;
  return `~${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} hrs`;
}

/**
 * A single-row instrument readout, not a row of stat cards — this app's
 * own design language calls itself "an instrument, not an app"
 * (globals.css's banner comment), so lesson count / completion / total
 * time read as one hairline-bounded strip of mono figures rather than the
 * three-icon-tile stat-card recipe most SaaS dashboards reach for here.
 */
function ReadoutStrip({
  totalLessons,
  completedCount,
  totalMinutes,
}: {
  totalLessons: number;
  completedCount: number;
  totalMinutes: number;
}) {
  const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-y border-border py-4 font-mono text-xs uppercase tracking-wide text-text-subtle">
      <span>
        <strong className="text-text">{totalLessons}</strong> lessons
      </span>
      <span aria-hidden className="text-border">
        /
      </span>
      <span>
        <strong className={completedCount > 0 ? "text-status-healthy" : "text-text"}>
          {completedCount}
        </strong>{" "}
        complete <span className="text-text-subtle">({percent}%)</span>
      </span>
      <span aria-hidden className="text-border">
        /
      </span>
      <span>
        <strong className="text-text">{formatTotalTime(totalMinutes)}</strong> total
      </span>
    </div>
  );
}

/**
 * The one clear focal point on the page — everything else is a grid of
 * equal-weight entry points, this is the single "do this next" answer.
 * Same left-accent-border row shape `/problems` already uses for its list
 * rows, at a larger scale and in the signal accent, so it reads as
 * unmistakably different from a lesson card, not just a bigger one.
 */
function ContinueBand({
  nextLesson,
  totalLessons,
  completedCount,
}: {
  nextLesson: FoundationLesson | null;
  totalLessons: number;
  completedCount: number;
}) {
  if (!nextLesson) {
    return (
      <div className="flex items-center gap-3 border-l-2 border-status-healthy bg-bg-panel px-6 py-5">
        <Check className="size-4 shrink-0 text-status-healthy" aria-hidden />
        <p className="text-sm text-text-muted">
          All {totalLessons} lessons complete — nice work. Revisit any of them below, any time.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/foundations/${nextLesson.slug}`}
      className="group flex flex-col gap-3 border-l-2 border-signal bg-bg-panel px-6 py-5 transition-colors duration-fast ease-standard hover:bg-bg-hover sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-signal">
          {completedCount === 0 ? "Start here" : "Continue learning"}
        </span>
        <span className="text-lg font-semibold text-text">
          {String(nextLesson.number).padStart(2, "0")} — {nextLesson.title}
        </span>
        <span className="text-sm text-text-muted">{nextLesson.tagline}</span>
      </div>
      <span className="flex shrink-0 items-center gap-2 self-start font-mono text-xs uppercase tracking-wide text-signal sm:self-auto">
        {nextLesson.estimatedMinutes} min
        <ArrowRight
          className="size-4 transition-transform duration-fast ease-standard group-hover:translate-x-1"
          aria-hidden
        />
      </span>
    </Link>
  );
}

function TrackSection({
  index,
  track,
  lessons,
  completed,
  isLight,
}: {
  index: number;
  track: FoundationTrack;
  lessons: FoundationLesson[];
  completed: Set<string>;
  isLight: boolean;
}) {
  const trackDone = lessons.length > 0 && lessons.every((lesson) => completed.has(lesson.slug));
  const accent = isLight ? TRACK_ACCENTS[getTrackAccent(index)] : null;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      // `once: false` — replays every time this track section (re-)enters
      // the viewport, not just the first pass; scrolling back up to an
      // earlier track sees it fade/slide in again too.
      viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
      variants={prefersReducedMotion ? staticRevealVariants : sectionRevealVariants}
      className="relative sm:pl-10"
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0 hidden size-5 items-center justify-center border font-mono text-[10px] sm:flex ${
          trackDone
            ? "border-status-healthy bg-status-healthy/10 text-status-healthy"
            : accent
              ? `${accent.border} ${accent.soft} ${accent.text}`
              : "border-border bg-bg text-text-subtle"
        }`}
      >
        {trackDone ? <Check className="size-3" aria-hidden /> : String(index + 1).padStart(2, "0")}
      </span>

      {/* Wrapped separately from the marker above so the zone's own padding
          never shifts the marker's own absolute position — the marker
          stays pinned to this section's outer edge regardless. See the
          file's doc comment above for why this is a bordered, blob-lit
          panel now instead of a flat `wash` fill. */}
      {/* `isolate` — load-bearing, same reason `<main>` needs it (see
          `FoundationsIndexView`'s own comment): without it, the `z-10`
          content div below isn't scoped to this panel — it's compared
          against every other z-indexed element in `<main>`'s shared
          stacking context, header included, and being later in the DOM
          than the sticky `AppHeader` (also `z-10`) meant it painted on
          *top* of the header while scrolling. */}
      <div
        className={`relative isolate overflow-hidden rounded-[var(--landing-radius-lg)] ${
          accent
            ? // A real resting elevation shadow, not the barely-visible
              // 1px/2px contact shadow this panel (and the equivalent
              // `AtlasZone` panel) used to share with every other bordered
              // surface in the app — flagged back as too flat to read as
              // "raised" at this panel's size. Plain neutral gray (not the
              // track's own hue — this is a whole content block, not a
              // per-track logo like `iconShadow`), a tight contact layer
              // plus a soft, wider lift so the whole track section reads
              // as sitting a little above the page. Paper only (`accent`
              // is already the light-mode gate); dark/night-ops keep the
              // flat, borderless look this `div` has always had there.
              `border ${accent.borderFaint} bg-bg-elevated/50 p-4 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_16px_32px_-16px_rgba(15,23,42,0.18)] sm:p-6`
            : ""
        }`}
      >
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
            className={`mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-2 ${accent ? accent.borderFaint : "border-border"}`}
          >
            <div className="flex items-center gap-4">
              {/* Atlas's per-track animated badge, brought over here for
                  Paper only — Journey has no dark-theme `iconAccent` table
                  the way Atlas does (`TRACK_ACCENTS_DARK`; see this file's
                  own doc comment: "still only reads `TRACK_ACCENTS`
                  [Paper]... don't extend it speculatively" — now asked for,
                  but only for Paper, not as a blanket dark-mode addition).
                  `accent` is already `null` outside Paper, so the `accent &&`
                  check below doubles as the theme gate — no separate
                  `isLight` check needed. */}
              {accent && <TrackBadge trackIndex={index} accent={accent} />}
              <div>
                <h2
                  className={
                    accent
                      ? `inline-flex -translate-y-0.5 items-center rounded-md border border-white/25 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm ${accent.solid}`
                      : "font-mono text-[10px] uppercase tracking-wide text-text-subtle"
                  }
                >
                  {`Track ${String(index + 1).padStart(2, "0")}`}
                </h2>
                <h3 className="mt-1.5 text-lg font-semibold text-text">{track.title}</h3>
              </div>
            </div>
            <p className="max-w-sm text-xs text-text-subtle sm:text-right">{track.description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {lessons.map((lesson, i) => (
              <LessonCard
                key={lesson.slug}
                lesson={lesson}
                completed={completed.has(lesson.slug)}
                featured={i === 0}
                accent={accent}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * The track opener (`featured`) spans two columns and shows its full
 * tagline instead of a two-line clamp — one differently-weighted card per
 * track (5 of 24 total), not a random assortment, so the grid reads as
 * "this one starts the section" rather than an arbitrary size change.
 */
function LessonCard({
  lesson,
  completed,
  featured,
  accent,
}: {
  lesson: FoundationLesson;
  completed: boolean;
  featured: boolean;
  accent: TrackAccentClasses | null;
}) {
  // Same track-accent color whether or not the lesson is done — completion
  // no longer recolors the icon green; the `Badge` below already says
  // "Done," and a second green cue on top of it was redundant (flagged back
  // directly, along with `AtlasLessonNode`'s matching green icon/tick). The
  // tinted chip *background* + `iconShadow` elevation stay completed-only
  // though, same reasoning as that file: an upcoming lesson gets a bare
  // colored icon, no box; only a finished one earns the filled, shadowed chip.
  const iconClasses = accent
    ? completed
      ? `${accent.soft} ${accent.text} ${accent.iconShadow}`
      : accent.text
    : "text-text-subtle";

  return (
    <Link
      href={`/foundations/${lesson.slug}`}
      // A completed lesson used to get its own green fill, and an upcoming
      // one a full accent-tinted fill — both replaced with the same plain
      // bordered white surface (see the file's doc comment above): the
      // `Badge` already says "Done," and a full-card tint fought the
      // zone's own accent color underneath it either way.
      className={`group relative flex flex-col gap-3 rounded-[var(--landing-radius)] border bg-bg-elevated p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.16)] ${
        accent ? accent.borderFaint : "border-border"
      } ${featured ? "sm:col-span-2" : ""}`}
    >
      <LessonCardCorners accent={accent} />
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClasses}`}>
          <LessonGlyph number={lesson.number} className="size-5" />
        </span>
        {completed ? (
          <Badge variant="success" dot>
            Done
          </Badge>
        ) : (
          <span className="pt-1 font-mono text-[10px] text-text-subtle">
            {String(lesson.number).padStart(2, "0")}
          </span>
        )}
      </div>
      <h4 className={`font-semibold text-text ${featured ? "text-lg" : "text-base"}`}>{lesson.title}</h4>
      <p className={`text-sm leading-relaxed text-text-muted ${featured ? "" : "line-clamp-2"}`}>
        {lesson.tagline}
      </p>
      <div className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
        <Clock className="size-3" aria-hidden />
        {lesson.estimatedMinutes} min
        <ArrowRight
          className="ml-auto size-3.5 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </Link>
  );
}

/**
 * `Card.tsx`'s corner-bracket "reticle" mark. No longer distinguishes
 * completed from not — that used to tint completed corners status-healthy
 * green at all times, a persistent green frame the `Badge` already made
 * redundant (flagged back directly). Under Paper, the hover color is the
 * lesson's own track accent (`accent`, `null` on dark/night-ops) instead of
 * the universal signal-on-hover every other theme still uses.
 */
function LessonCardCorners({ accent }: { accent: TrackAccentClasses | null }) {
  const base = "pointer-events-none absolute size-2 transition-colors duration-fast ease-standard";
  const color = accent ? `border-border ${accent.cornerHover}` : "border-border group-hover:border-signal/70";
  return (
    <>
      <span aria-hidden className={`${base} ${color} top-0 left-0 border-t border-l`} />
      <span aria-hidden className={`${base} ${color} top-0 right-0 border-t border-r`} />
      <span aria-hidden className={`${base} ${color} bottom-0 left-0 border-b border-l`} />
      <span aria-hidden className={`${base} ${color} bottom-0 right-0 border-r border-b`} />
    </>
  );
}
