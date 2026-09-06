"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getTrackAccent, TRACK_ACCENTS, type TrackAccentClasses } from "@/components/foundations/trackAccent";
import { sectionRevealVariants, staticRevealVariants } from "@/components/foundations/sectionRevealVariants";
import { ReadingRoomBadge } from "./ReadingRoomBadge";
import type { ReadingRoomGroup, ReadingRoomItem } from "./types";

/**
 * The generic form of `FoundationsJourney` — a tracked, sequenced index
 * (a Continue/Progress dashboard row, a milestone strip, N labeled tracks)
 * parameterized over any content module shaped like `ReadingRoomItem`
 * grouped into `ReadingRoomGroup`s, instead of hardcoded to
 * `FoundationLesson`/`FOUNDATION_TRACKS`. Foundations itself keeps its own
 * `FoundationsJourney` rather than switching to this one — its
 * `LessonGlyph` per-lesson glyphs are a bespoke investment this generic
 * version deliberately doesn't have (one plain icon per *group* instead,
 * see `types.ts`), so re-pointing Foundations at this component would be a
 * visible downgrade for the one reading room that earned the fancier
 * treatment. This is for every reading room *after* Foundations: same
 * tracked-index shape, a plainer icon language.
 *
 * The dashboard row (`ContinueCard`/`ProgressCard`/`MilestoneStrip`) used to
 * be a plain-text `ReadoutStrip` plus a left-accent-border `ContinueBand` —
 * the older, plainer shape `FoundationsJourney` itself moved past a while
 * back. Brought in sync here too, so LLD/Agentic/Case Studies get the same
 * "continue learning" focal point Foundations has instead of lagging behind
 * it.
 *
 * Paper-only accent color, matching `FoundationsJourney`'s own current
 * behavior exactly (that file's doc comment: "hasn't been asked for
 * [dark] there yet, don't extend it speculatively") — propagating the
 * *existing* Journey mode means propagating what it actually does today,
 * not adding scope Foundations' own Journey doesn't have yet. That also
 * means the scroll-reveal animation on `TrackSection` (`sectionRevealVariants`,
 * `once: false`), the two-layer elevation shadow on its panel, and the
 * `ReadingRoomBadge` (the generic form of `TrackBadge`) next to each
 * track's title are all propagated too — Foundations' own `TrackSection`
 * has had these for a while; this file had drifted behind on all three.
 */
export function ReadingRoomJourney<T extends ReadingRoomItem>({
  basePath,
  groups,
  completedSlugs,
  itemLabel,
}: {
  /** e.g. `/lld` — every item/lesson link is `${basePath}/${slug}`. */
  basePath: string;
  groups: ReadingRoomGroup<T>[];
  completedSlugs: string[];
  /** Pluralizes the noun for a count, e.g. `(n) => \`${n} lesson${n === 1 ? "" : "s"}\`` or the "case study/case studies" equivalent. */
  itemLabel: (count: number) => string;
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const completed = useMemo(() => new Set(completedSlugs), [completedSlugs]);

  const items = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const totalMinutes = useMemo(
    () => items.reduce((sum, item) => sum + item.estimatedMinutes, 0),
    [items]
  );
  const completedCount = useMemo(
    () => items.filter((item) => completed.has(item.slug)).length,
    [items, completed]
  );
  const nextItem = useMemo(
    () => items.find((item) => !completed.has(item.slug)) ?? null,
    [items, completed]
  );
  const currentGroupIndex = useMemo(() => {
    if (!nextItem) return groups.length - 1;
    const index = groups.findIndex((group) => group.items.some((item) => item.slug === nextItem.slug));
    return index === -1 ? 0 : index;
  }, [groups, nextItem]);

  return (
    <>
      {/* The dashboard row: a large primary "what's next" card next to a
          small supporting progress card, plus a compact milestone strip
          summarizing every group at a glance — `FoundationsJourney`'s own
          dashboard row (`ContinueCard`/`ProgressCard`/`MilestoneStrip`),
          brought over here so every reading room after Foundations gets the
          same "continue learning" focal point instead of the older plain-
          text `ReadoutStrip` + left-accent-border `ContinueBand` this used
          to render. */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 pt-8 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <ContinueCard
            basePath={basePath}
            nextItem={nextItem}
            total={items.length}
            completedCount={completedCount}
          />
          <ProgressCard totalItems={items.length} completedCount={completedCount} totalMinutes={totalMinutes} itemLabel={itemLabel} />
        </div>
        <MilestoneStrip groups={groups} completed={completed} currentGroupIndex={currentGroupIndex} />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-14 px-6 py-14">
        <div aria-hidden className="absolute top-3 bottom-3 left-2.5 hidden w-px bg-border sm:block" />
        {groups.map((group, index) => (
          <TrackSection
            key={group.key}
            index={index}
            group={group}
            basePath={basePath}
            completed={completed}
            isLight={isLight}
          />
        ))}
      </section>
    </>
  );
}

/** Same "~4.5 hrs"/"35 min" formatter `FoundationsJourney`/`FoundationsAtlas` share — duplicated here rather than imported cross-module since it's a two-line pure function, not worth a shared-utils detour. */
export function formatTotalTime(totalMinutes: number): string {
  const hours = totalMinutes / 60;
  if (hours < 1) return `${totalMinutes} min`;
  const rounded = Math.round(hours * 10) / 10;
  return `~${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} hrs`;
}

/**
 * Compact group-by-group summary sitting under the continue/progress row —
 * `FoundationsJourney`'s `MilestoneStrip`, generalized over `groups` instead
 * of `trackGroups`.
 */
function MilestoneStrip<T extends ReadingRoomItem>({
  groups,
  completed,
  currentGroupIndex,
}: {
  groups: ReadingRoomGroup<T>[];
  completed: Set<string>;
  currentGroupIndex: number;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-[var(--radius-workspace)] border border-workspace-border bg-workspace-surface px-5 py-3 shadow-[var(--shadow-workspace-card)]">
      {groups.map((group, index) => {
        const done = group.items.length > 0 && group.items.every((item) => completed.has(item.slug));
        const isCurrent = !done && index === currentGroupIndex;
        const accent = TRACK_ACCENTS[getTrackAccent(index)];
        return (
          <div key={group.key} className="flex shrink-0 items-center gap-2">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
                done
                  ? "bg-workspace-success text-white"
                  : isCurrent
                    ? `${accent.solid} text-white`
                    : `${accent.soft} ${accent.text}`
              }`}
            >
              {done ? <Check className="size-3" aria-hidden /> : index + 1}
            </span>
            <span className="hidden font-mono text-[10px] whitespace-nowrap uppercase tracking-wide text-workspace-text-subtle sm:inline">
              {group.title}
            </span>
            {index < groups.length - 1 && (
              <span aria-hidden className={`h-px w-6 sm:w-10 ${done ? "bg-workspace-success/50" : accent.lineFaint}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The compact supporting card next to `ContinueCard` — total items,
 * completion, and a slim accent progress bar. `FoundationsJourney`'s
 * `ProgressCard`, generalized to `itemLabel`'s pluralized noun instead of
 * a hardcoded "lessons".
 */
function ProgressCard({
  totalItems,
  completedCount,
  totalMinutes,
  itemLabel,
}: {
  totalItems: number;
  completedCount: number;
  totalMinutes: number;
  itemLabel: (count: number) => string;
}) {
  const percent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  return (
    <div className="flex flex-col justify-between gap-4 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface p-5 shadow-[var(--shadow-workspace-card)] lg:w-72 lg:shrink-0">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide text-workspace-text-subtle">Your progress</span>
        <span className="font-mono text-xs font-semibold text-workspace-accent">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-workspace-surface-soft">
        <div
          className="h-full rounded-full bg-workspace-accent transition-[width] duration-slow ease-standard"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-xs text-workspace-text-muted">
        <span>
          <strong className="text-workspace-text">{completedCount}</strong>/{totalItems} {itemLabel(totalItems)}
        </span>
        <span>
          <strong className="text-workspace-text">{formatTotalTime(totalMinutes)}</strong> total
        </span>
      </div>
    </div>
  );
}

/**
 * The one clear focal point on the page — `FoundationsJourney`'s
 * `ContinueCard`, generalized over `ReadingRoomItem`.
 */
function ContinueCard<T extends ReadingRoomItem>({
  basePath,
  nextItem,
  total,
  completedCount,
}: {
  basePath: string;
  nextItem: T | null;
  total: number;
  completedCount: number;
}) {
  if (!nextItem) {
    return (
      <div className="flex flex-1 items-center gap-3 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface p-6 shadow-[var(--shadow-workspace-card)]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-workspace-success/10 text-workspace-success">
          <Check className="size-5" aria-hidden />
        </span>
        <p className="text-sm text-workspace-text-muted">
          All {total} complete — nice work. Revisit any of them below, any time.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`${basePath}/${nextItem.slug}`}
      className="group flex flex-1 flex-col justify-between gap-4 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-accent-soft p-6 shadow-[var(--shadow-workspace-card)] transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-[var(--shadow-workspace-hover)] sm:flex-row sm:items-center sm:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-workspace-accent">
          {completedCount === 0 ? "Start here" : "Continue learning"}
        </span>
        <span className="truncate text-lg font-semibold text-workspace-text">
          {String(nextItem.number).padStart(2, "0")} — {nextItem.title}
        </span>
        <span className="text-sm text-workspace-text-muted">{nextItem.tagline}</span>
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-workspace-accent px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-white transition-transform duration-fast ease-standard group-hover:translate-x-0.5 sm:self-auto">
        {nextItem.estimatedMinutes} min
        <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  );
}

function TrackSection<T extends ReadingRoomItem>({
  index,
  group,
  basePath,
  completed,
  isLight,
}: {
  index: number;
  group: ReadingRoomGroup<T>;
  basePath: string;
  completed: Set<string>;
  isLight: boolean;
}) {
  const trackDone = group.items.length > 0 && group.items.every((item) => completed.has(item.slug));
  const accent = isLight ? TRACK_ACCENTS[getTrackAccent(index)] : null;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      // `once: false` — replays every time this track section (re-)enters
      // the viewport, not just the first pass; scrolling back up to an
      // earlier track sees it fade/slide in again too. Same timing
      // `FoundationsJourney`'s own `TrackSection` uses.
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

      <div
        className={`relative isolate overflow-hidden rounded-[var(--landing-radius-lg)] ${
          accent
            ? // Real resting elevation shadow, not the barely-visible 1px/2px
              // contact shadow this panel used to share with every other
              // bordered surface — matches `FoundationsJourney`'s own
              // `TrackSection` panel fix. Paper only (`accent` is already
              // the light-mode gate); dark/night-ops keep the flat,
              // borderless look this `div` has always had there.
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
              {/* Paper-only, same as `accent` itself — `ReadingRoomJourney`
                  only ever renders under the light theme now, but this
                  mirrors `FoundationsJourney`'s own `accent &&` gate rather
                  than assuming that. */}
              {accent && <ReadingRoomBadge icon={group.icon} accent={accent} />}
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
                <h3 className="mt-1.5 text-lg font-semibold text-text">{group.title}</h3>
              </div>
            </div>
            <p className="max-w-sm text-xs text-text-subtle sm:text-right">{group.description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item, i) => (
              <LessonCard
                key={item.slug}
                item={item}
                basePath={basePath}
                icon={group.icon}
                completed={completed.has(item.slug)}
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

function LessonCard<T extends ReadingRoomItem>({
  item,
  basePath,
  icon: Icon,
  completed,
  featured,
  accent,
}: {
  item: T;
  basePath: string;
  icon: ReadingRoomGroup["icon"];
  completed: boolean;
  featured: boolean;
  accent: TrackAccentClasses | null;
}) {
  const iconClasses = completed ? "text-status-healthy/70" : accent ? `${accent.soft} ${accent.text}` : "text-text-subtle";

  return (
    <Link
      href={`${basePath}/${item.slug}`}
      className={`group relative flex flex-col gap-3 rounded-[var(--landing-radius)] border bg-bg-elevated p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.16)] ${
        accent ? accent.borderFaint : "border-border"
      } ${featured ? "sm:col-span-2" : ""}`}
    >
      <LessonCardCorners completed={completed} accent={accent} />
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClasses}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        {completed ? (
          <Badge variant="success" dot>
            Done
          </Badge>
        ) : (
          <span className="pt-1 font-mono text-[10px] text-text-subtle">{String(item.number).padStart(2, "0")}</span>
        )}
      </div>
      <h4 className={`font-semibold text-text ${featured ? "text-lg" : "text-base"}`}>{item.title}</h4>
      <p className={`text-sm leading-relaxed text-text-muted ${featured ? "" : "line-clamp-2"}`}>{item.tagline}</p>
      <div className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
        <Clock className="size-3" aria-hidden />
        {item.estimatedMinutes} min
        <ArrowRight
          className="ml-auto size-3.5 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </Link>
  );
}

function LessonCardCorners({ completed, accent }: { completed: boolean; accent: TrackAccentClasses | null }) {
  const base = "pointer-events-none absolute size-2 transition-colors duration-fast ease-standard";
  const color = completed
    ? "border-status-healthy/60 group-hover:border-status-healthy"
    : accent
      ? `border-border ${accent.cornerHover}`
      : "border-border group-hover:border-signal/70";
  return (
    <>
      <span aria-hidden className={`${base} ${color} top-0 left-0 border-t border-l`} />
      <span aria-hidden className={`${base} ${color} top-0 right-0 border-t border-r`} />
      <span aria-hidden className={`${base} ${color} bottom-0 left-0 border-b border-l`} />
      <span aria-hidden className={`${base} ${color} bottom-0 right-0 border-r border-b`} />
    </>
  );
}
