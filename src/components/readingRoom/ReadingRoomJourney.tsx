"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getTrackAccent, TRACK_ACCENTS, type TrackAccentClasses } from "@/components/foundations/trackAccent";
import type { ReadingRoomGroup, ReadingRoomItem } from "./types";

/**
 * The generic form of `FoundationsJourney` — a tracked, sequenced index
 * (readout strip, a Continue/Start Here focal point, N labeled tracks)
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
 * Paper-only accent color, matching `FoundationsJourney`'s own current
 * behavior exactly (that file's doc comment: "hasn't been asked for
 * [dark] there yet, don't extend it speculatively") — propagating the
 * *existing* Journey mode means propagating what it actually does today,
 * not adding scope Foundations' own Journey doesn't have yet.
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

  return (
    <>
      <div className="relative mx-auto w-full max-w-5xl px-6">
        <ReadoutStrip
          total={items.length}
          completedCount={completedCount}
          totalMinutes={totalMinutes}
          itemLabel={itemLabel}
        />
      </div>

      <div className="mx-auto w-full max-w-5xl px-6 pt-8 pb-6">
        <ContinueBand
          basePath={basePath}
          nextItem={nextItem}
          total={items.length}
          completedCount={completedCount}
        />
      </div>

      <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-14 px-6 py-14">
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

function ReadoutStrip({
  total,
  completedCount,
  totalMinutes,
  itemLabel,
}: {
  total: number;
  completedCount: number;
  totalMinutes: number;
  itemLabel: (count: number) => string;
}) {
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-y border-border py-4 font-mono text-xs uppercase tracking-wide text-text-subtle">
      <span>
        <strong className="text-text">{total}</strong> {itemLabel(total)}
      </span>
      <span aria-hidden className="text-border">
        /
      </span>
      <span>
        <strong className={completedCount > 0 ? "text-status-healthy" : "text-text"}>{completedCount}</strong> complete{" "}
        <span className="text-text-subtle">({percent}%)</span>
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

function ContinueBand<T extends ReadingRoomItem>({
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
      <div className="flex items-center gap-3 border-l-2 border-status-healthy bg-bg-panel px-6 py-5">
        <Check className="size-4 shrink-0 text-status-healthy" aria-hidden />
        <p className="text-sm text-text-muted">
          All {total} complete — nice work. Revisit any of them below, any time.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`${basePath}/${nextItem.slug}`}
      className="group flex flex-col gap-3 border-l-2 border-signal bg-bg-panel px-6 py-5 transition-colors duration-fast ease-standard hover:bg-bg-hover sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-signal">
          {completedCount === 0 ? "Start here" : "Continue learning"}
        </span>
        <span className="text-lg font-semibold text-text">
          {String(nextItem.number).padStart(2, "0")} — {nextItem.title}
        </span>
        <span className="text-sm text-text-muted">{nextItem.tagline}</span>
      </div>
      <span className="flex shrink-0 items-center gap-2 self-start font-mono text-xs uppercase tracking-wide text-signal sm:self-auto">
        {nextItem.estimatedMinutes} min
        <ArrowRight
          className="size-4 transition-transform duration-fast ease-standard group-hover:translate-x-1"
          aria-hidden
        />
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

  return (
    <div className="relative sm:pl-10">
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
            ? `border ${accent.borderFaint} bg-bg-elevated/50 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6`
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
    </div>
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
