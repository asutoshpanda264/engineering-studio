"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { LLDLesson } from "@/content/lld/types";
import { getLLDMapNodePosition, LLD_MAP_REGIONS } from "@/content/lld/mapLayout";
import { getCompletedLLDSlugs, useLLDProgress } from "@/lib/lldProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { PannableMapCanvas } from "./PannableMapCanvas";
import { MapRegions } from "./MapRegions";
import { MapEdges, type MapEdge } from "./MapEdges";
import { MapLegend } from "./MapLegend";
import { ArcadeNode } from "./ArcadeNode";

const MAP_WIDTH = 2000;
const MAP_HEIGHT = 900;

/**
 * `/lld`'s Batman-Mode-only arcade map — same shell (`PannableMapCanvas`,
 * `MapRegions`, `MapEdges`, `MapLegend`) `/foundations`' own
 * `FoundationsMap` uses, laid out via `mapLayout.ts`'s algorithmic
 * tiering (category = column) instead of hand-placed positions. Unlike
 * Foundations, there's no prerequisite DAG here — `LLDLesson.number`'s
 * own doc comment states browsing is always free — so edges are purely
 * decorative (one segment per consecutive lesson in course order) and
 * every node is always open; the only state a node carries is
 * `completed` (green, via `MarkCompleteButton` on the lesson page).
 */
export function LLDMap({ lessons, headerSlot }: { lessons: LLDLesson[]; headerSlot?: ReactNode }) {
  const completedSlugs = useLLDProgress();
  const completed = useMemo(() => new Set(completedSlugs), [completedSlugs]);
  const { theme } = useTheme();
  const cave = theme === "night-ops";

  // `useLLDProgress()` must render its first client pass as empty to
  // match the server (no `localStorage` during SSR) — deferring paint
  // until after mount means the legend/completed nodes never flash
  // "0 complete" for a real returning reader before self-correcting a
  // moment later. Same `useSyncExternalStore` no-op-subscription shape
  // `FoundationsMap` uses for the same reason.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const edges: MapEdge[] = useMemo(() => {
    const result: MapEdge[] = [];
    for (let i = 1; i < lessons.length; i++) {
      const from = getLLDMapNodePosition(lessons[i - 1].slug);
      const to = getLLDMapNodePosition(lessons[i].slug);
      if (!from || !to) continue;
      result.push({
        from,
        to,
        targetStatus: completed.has(lessons[i].slug) ? "completed" : "available",
        justUnlocked: false,
      });
    }
    return result;
  }, [lessons, completed]);

  // Centers on the first not-yet-completed lesson (a fresh visit's "start
  // here"), falling back to the first lesson once everything's done.
  // Reads `getCompletedLLDSlugs()` directly (a synchronous localStorage
  // read) rather than the `completed` derived from `useLLDProgress()`
  // above — same hydration-race sidestep `FoundationsMap`'s own
  // `getInitialFocus` uses, see that component's doc comment.
  const getInitialFocus = useCallback(() => {
    const completedNow = new Set(getCompletedLLDSlugs());
    const target = lessons.find((lesson) => !completedNow.has(lesson.slug)) ?? lessons[0];
    return (target && getLLDMapNodePosition(target.slug)) ?? null;
  }, [lessons]);

  function renderNode(lesson: LLDLesson) {
    const position = getLLDMapNodePosition(lesson.slug);
    if (!position) return null;
    return (
      <ArcadeNode
        key={lesson.slug}
        href={`/lld/${lesson.slug}`}
        x={position.x}
        y={position.y}
        title={lesson.title}
        numberLabel={String(lesson.number).padStart(2, "0")}
        footer={`${lesson.estimatedMinutes} min`}
        completed={completed.has(lesson.slug)}
        cave={cave}
      />
    );
  }

  return (
    <PannableMapCanvas
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      getInitialFocus={getInitialFocus}
      ready={mounted}
      headerSlot={headerSlot}
      legendSlot={<MapLegend completed={completedSlugs.length} total={lessons.length} />}
    >
      <MapRegions regions={LLD_MAP_REGIONS} getPosition={(slug) => getLLDMapNodePosition(slug)} />
      <MapEdges edges={edges} cave={cave} />
      {lessons.map(renderNode)}
    </PannableMapCanvas>
  );
}
