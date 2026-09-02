"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useTheme } from "@/components/theme/ThemeProvider";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";
import {
  getTrackAccent,
  TRACK_ACCENTS,
  TRACK_ACCENTS_DARK,
  type TrackAccentClasses,
} from "@/components/foundations/trackAccent";
import { formatTotalTime } from "./ReadingRoomJourney";
import type { ReadingRoomGroup, ReadingRoomItem } from "./types";

/**
 * The generic form of `FoundationsAtlas` — an immersive, zone-per-track
 * take on the same tracked-index data `ReadingRoomJourney` renders as a
 * flat list, parameterized the same way that file is (see its own doc
 * comment for why Foundations keeps its bespoke original rather than
 * switching to this one: `LessonGlyph`'s 24 hand-drawn glyphs vs. one
 * plain `group.icon` reused across a whole track).
 *
 * Mirrors `FoundationsAtlas`'s current dark/light split exactly, not a
 * simplified version of it: Paper gets full per-track color throughout
 * (spine, stepper, zone blobs, "Track NN" chip, current-lesson glow);
 * dark/night-ops keep the app's plain copper "signal" accent for all of
 * that chrome, with per-track color narrowed to exactly two places — the
 * lesson card's icon chip (`iconAccent`, always colored, both themes) and
 * a single oversized low-opacity watermark icon bleeding off each zone's
 * corner (reusing `group.icon`, the same icon the cards already show) —
 * see `FoundationsAtlas`'s own doc comment for the fuller history of why
 * dark stopped short of full per-track color.
 */
export function ReadingRoomAtlas<T extends ReadingRoomItem>({
  groups,
  completedSlugs,
  basePath,
  itemLabel,
}: {
  groups: ReadingRoomGroup<T>[];
  completedSlugs: string[];
  basePath: string;
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
      <AtlasBackdrop isLight={isLight} />

      <div className="relative mx-auto w-full max-w-5xl px-6">
        <PhaseStepper
          groups={groups}
          completed={completed}
          currentGroupIndex={currentGroupIndex}
          total={items.length}
          completedCount={completedCount}
          totalMinutes={totalMinutes}
          nextItem={nextItem}
          basePath={basePath}
          itemLabel={itemLabel}
          isLight={isLight}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-14">
        {groups.map((group, index) => (
          <AtlasZone
            key={group.key}
            index={index}
            group={group}
            basePath={basePath}
            completed={completed}
            currentSlug={nextItem?.slug}
            isLight={isLight}
          />
        ))}
      </div>
    </>
  );
}

/** Dark/night-ops only — Paper's own atmosphere lives in `*IndexView`'s `<main>` (`bg-reading-room`) plus this file's zone-level blobs; see `FoundationsAtlas`'s `AtlasBackdrop` for the fuller reasoning this mirrors exactly. */
function AtlasBackdrop({ isLight }: { isLight: boolean }) {
  if (isLight) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.35]">
        <SystemMeshBackground />
      </div>
      <div className="absolute -top-32 left-1/4 h-[32rem] w-[32rem] rounded-full bg-signal/[0.06] blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-status-healthy/[0.05] blur-[120px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-transparent to-bg" />
    </div>
  );
}

function PhaseStepper<T extends ReadingRoomItem>({
  groups,
  completed,
  currentGroupIndex,
  total,
  completedCount,
  totalMinutes,
  nextItem,
  basePath,
  itemLabel,
  isLight,
}: {
  groups: ReadingRoomGroup<T>[];
  completed: Set<string>;
  currentGroupIndex: number;
  total: number;
  completedCount: number;
  totalMinutes: number;
  nextItem: T | null;
  basePath: string;
  itemLabel: (count: number) => string;
  isLight: boolean;
}) {
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="border-y border-border bg-bg/60 py-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="flex items-center">
          {groups.map((group, index) => {
            const groupDone = group.items.length > 0 && group.items.every((item) => completed.has(item.slug));
            const isCurrent = !groupDone && index === currentGroupIndex;
            const accent = isLight ? TRACK_ACCENTS[getTrackAccent(index)] : null;
            return (
              <div key={group.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={`flex size-7 items-center justify-center border font-mono text-[10px] transition-colors duration-fast ease-standard ${
                      groupDone
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
                    {groupDone ? <Check className="size-3.5" aria-hidden /> : String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="max-w-20 text-center font-mono text-[9px] uppercase tracking-wide text-text-subtle">
                    {group.title}
                  </span>
                </div>
                {index < groups.length - 1 && (
                  <span
                    aria-hidden
                    className={`mx-2 h-px w-6 shrink-0 sm:w-12 ${
                      groupDone ? "bg-status-healthy/50" : accent ? accent.lineFaint : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-wide text-text-subtle">
          <span>
            <strong className={completedCount > 0 ? "text-status-healthy" : "text-text"}>{completedCount}</strong>/
            {total} complete <span className="text-text-subtle">({percent}%)</span>
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
        {nextItem ? (
          <Link href={`${basePath}/${nextItem.slug}`} className="group inline-flex min-w-0 items-center gap-2.5 text-sm">
            <MapPin className="size-3.5 shrink-0 text-signal" aria-hidden />
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-signal">
              {completedCount === 0 ? "Start here" : "You are here"}
            </span>
            <span className="min-w-0 truncate text-text-muted group-hover:text-text">
              {String(nextItem.number).padStart(2, "0")} — {nextItem.title}
            </span>
            <ArrowRight
              className="size-3.5 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100"
              aria-hidden
            />
          </Link>
        ) : (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Check className="size-3.5 shrink-0 text-status-healthy" aria-hidden />
            All {itemLabel(total)} complete — revisit any of them below, any time.
          </p>
        )}
      </div>
    </div>
  );
}

function AtlasZone<T extends ReadingRoomItem>({
  index,
  group,
  basePath,
  completed,
  currentSlug,
  isLight,
}: {
  index: number;
  group: ReadingRoomGroup<T>;
  basePath: string;
  completed: Set<string>;
  currentSlug?: string;
  isLight: boolean;
}) {
  const doneCount = group.items.filter((item) => completed.has(item.slug)).length;
  const groupDone = group.items.length > 0 && doneCount === group.items.length;
  const accent = isLight ? TRACK_ACCENTS[getTrackAccent(index)] : null;
  const iconAccent = (isLight ? TRACK_ACCENTS : TRACK_ACCENTS_DARK)[getTrackAccent(index)];
  const WatermarkIcon = group.icon;

  return (
    <section
      className={`relative isolate overflow-hidden rounded-[var(--landing-radius-lg)] ${
        accent ? `border ${accent.borderFaint} bg-bg-elevated/50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-8` : ""
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
      {!isLight && (
        <WatermarkIcon
          aria-hidden
          className={`pointer-events-none absolute -bottom-16 -right-10 z-0 size-64 -rotate-12 opacity-[0.07] sm:size-80 ${iconAccent.text}`}
          strokeWidth={1}
        />
      )}
      <div className="relative z-10">
        <div
          className={`mb-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-2 ${accent ? accent.borderFaint : "border-border"}`}
        >
          <div className="flex items-baseline gap-3">
            {accent ? (
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
            <h2 className="text-lg font-semibold text-text">{group.title}</h2>
          </div>
          <p className="max-w-sm text-xs text-text-subtle sm:text-right">{group.description}</p>
        </div>

        <div className="relative">
          <span
            aria-hidden
            className={`absolute inset-x-0 top-0 hidden h-px sm:block ${accent ? accent.lineFaint : "bg-border"}`}
          />
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 pt-6 sm:grid-cols-2 sm:pt-8 lg:grid-cols-3">
            {group.items.map((item) => (
              <AtlasLessonNode
                key={item.slug}
                item={item}
                basePath={basePath}
                icon={group.icon}
                completed={completed.has(item.slug)}
                current={item.slug === currentSlug}
                accent={accent}
                iconAccent={iconAccent}
              />
            ))}
          </div>
        </div>

        {doneCount > 0 && (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-text-subtle">
            {doneCount}/{group.items.length} complete{groupDone ? " — track done" : ""}
          </p>
        )}
      </div>
    </section>
  );
}

function AtlasLessonNode<T extends ReadingRoomItem>({
  item,
  basePath,
  icon: Icon,
  completed,
  current,
  accent,
  iconAccent,
}: {
  item: T;
  basePath: string;
  icon: ReadingRoomGroup["icon"];
  completed: boolean;
  current: boolean;
  accent: TrackAccentClasses | null;
  iconAccent: TrackAccentClasses;
}) {
  const tickColor = current
    ? accent
      ? accent.solid
      : "bg-signal"
    : completed
      ? "bg-status-healthy/60"
      : accent
        ? accent.lineFaint
        : "bg-border";

  const iconClasses = completed
    ? "text-status-healthy/70"
    : `${iconAccent.soft} ${iconAccent.text} ${iconAccent.iconGlow}`;

  const glow = current
    ? accent
      ? accent.glow
      : "shadow-[0_0_0_1px_hsl(28_85%_58%/0.35),0_20px_45px_-24px_hsl(28_85%_58%/0.4)]"
    : "";

  const arrowColor = iconAccent.text;

  return (
    <div className={`relative flex flex-col ${current ? "sm:col-span-2" : ""}`}>
      <span aria-hidden className={`absolute -top-6 left-7 hidden h-6 w-px sm:block ${tickColor}`} />
      <Link
        href={`${basePath}/${item.slug}`}
        className={`group relative flex h-full flex-col gap-3 overflow-hidden rounded-xl border p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-fast ease-standard hover:-translate-y-0.5 ${
          current
            ? `border-transparent bg-bg-elevated ${glow}`
            : "border-border bg-bg-elevated hover:border-border hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.16)]"
        }`}
      >
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
            <Icon className="size-5" aria-hidden />
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
            <span className="pt-1 font-mono text-[10px] text-text-subtle">{String(item.number).padStart(2, "0")}</span>
          )}
        </div>
        <h4 className={`font-semibold text-text ${current ? "text-lg" : "text-base"}`}>{item.title}</h4>
        <p className={`text-sm leading-relaxed text-text-muted ${current ? "" : "line-clamp-2"}`}>{item.tagline}</p>
        <div className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
          <Clock className="size-3" aria-hidden />
          {item.estimatedMinutes} min
          <ArrowRight
            className={`ml-auto size-3.5 shrink-0 opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100 ${arrowColor}`}
            aria-hidden
          />
        </div>
      </Link>
    </div>
  );
}
