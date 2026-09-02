"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { CaseStudy } from "@/content/caseStudies/types";
import { getCaseStudyMapNodePosition, CASE_STUDY_MAP_REGIONS } from "@/content/caseStudies/mapLayout";
import { getCompletedCaseStudySlugs, useCaseStudyProgress } from "@/lib/caseStudyProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { PannableMapCanvas } from "./PannableMapCanvas";
import { MapRegions } from "./MapRegions";
import { MapEdges, type MapEdge } from "./MapEdges";
import { MapLegend } from "./MapLegend";
import { ArcadeNode } from "./ArcadeNode";

const MAP_WIDTH = 2400;
const MAP_HEIGHT = 1100;

/**
 * `/case-studies`' Batman-Mode-only arcade map — same shape as
 * `AgenticMap`/`LLDMap`/`FoundationsMap`: algorithmic tiered layout
 * (category = column), purely decorative sequence edges, every node
 * always open, `completed` (green) the only state a node carries.
 */
export function CaseStudiesMap({ entries, headerSlot }: { entries: CaseStudy[]; headerSlot?: ReactNode }) {
  const completedSlugs = useCaseStudyProgress();
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
    for (let i = 1; i < entries.length; i++) {
      const from = getCaseStudyMapNodePosition(entries[i - 1].slug);
      const to = getCaseStudyMapNodePosition(entries[i].slug);
      if (!from || !to) continue;
      result.push({
        from,
        to,
        targetStatus: completed.has(entries[i].slug) ? "completed" : "available",
        justUnlocked: false,
      });
    }
    return result;
  }, [entries, completed]);

  const getInitialFocus = useCallback(() => {
    const completedNow = new Set(getCompletedCaseStudySlugs());
    const target = entries.find((entry) => !completedNow.has(entry.slug)) ?? entries[0];
    return (target && getCaseStudyMapNodePosition(target.slug)) ?? null;
  }, [entries]);

  function renderNode(entry: CaseStudy) {
    const position = getCaseStudyMapNodePosition(entry.slug);
    if (!position) return null;
    return (
      <ArcadeNode
        key={entry.slug}
        href={`/case-studies/${entry.slug}`}
        x={position.x}
        y={position.y}
        title={entry.title}
        numberLabel={String(entry.number).padStart(2, "0")}
        footer={`${entry.estimatedMinutes} min`}
        completed={completed.has(entry.slug)}
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
      legendSlot={<MapLegend completed={completedSlugs.length} total={entries.length} />}
    >
      <MapRegions regions={CASE_STUDY_MAP_REGIONS} getPosition={(slug) => getCaseStudyMapNodePosition(slug)} />
      <MapEdges edges={edges} cave={cave} />
      {entries.map(renderNode)}
    </PannableMapCanvas>
  );
}
