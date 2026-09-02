"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { AgenticLesson } from "@/content/agentic/types";
import { getAgenticMapNodePosition, AGENTIC_MAP_REGIONS } from "@/content/agentic/mapLayout";
import { getCompletedAgenticSlugs, useAgenticProgress } from "@/lib/agenticProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { PannableMapCanvas } from "./PannableMapCanvas";
import { MapRegions } from "./MapRegions";
import { MapEdges, type MapEdge } from "./MapEdges";
import { MapLegend } from "./MapLegend";
import { ArcadeNode } from "./ArcadeNode";

const MAP_WIDTH = 2400;
const MAP_HEIGHT = 1100;

/**
 * `/agentic`'s Batman-Mode-only arcade map — same shape as `LLDMap`
 * (itself modeled on `/foundations`' `FoundationsMap`): algorithmic
 * tiered layout (category = column), purely decorative course-order
 * edges, every node always open, `completed` (green) the only state a
 * node carries. See `LLDMap`'s own doc comment for why there's no
 * locking here either — `AgenticLesson.number`'s doc comment states
 * browsing is always free, same as `/lld`.
 */
export function AgenticMap({ lessons, headerSlot }: { lessons: AgenticLesson[]; headerSlot?: ReactNode }) {
  const completedSlugs = useAgenticProgress();
  const completed = useMemo(() => new Set(completedSlugs), [completedSlugs]);
  const { theme } = useTheme();
  const cave = theme === "night-ops";

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const edges: MapEdge[] = useMemo(() => {
    const result: MapEdge[] = [];
    for (let i = 1; i < lessons.length; i++) {
      const from = getAgenticMapNodePosition(lessons[i - 1].slug);
      const to = getAgenticMapNodePosition(lessons[i].slug);
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

  const getInitialFocus = useCallback(() => {
    const completedNow = new Set(getCompletedAgenticSlugs());
    const target = lessons.find((lesson) => !completedNow.has(lesson.slug)) ?? lessons[0];
    return (target && getAgenticMapNodePosition(target.slug)) ?? null;
  }, [lessons]);

  function renderNode(lesson: AgenticLesson) {
    const position = getAgenticMapNodePosition(lesson.slug);
    if (!position) return null;
    return (
      <ArcadeNode
        key={lesson.slug}
        href={`/agentic/${lesson.slug}`}
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
      <MapRegions regions={AGENTIC_MAP_REGIONS} getPosition={(slug) => getAgenticMapNodePosition(slug)} />
      <MapEdges edges={edges} cave={cave} />
      {lessons.map(renderNode)}
    </PannableMapCanvas>
  );
}
