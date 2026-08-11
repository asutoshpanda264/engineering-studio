"use client";

import Link from "next/link";
import { WORLD_MAP_NODES } from "@/content/quest/worldMap";
import { LessonNode } from "@/components/quest/LessonNode";
import { MapPath } from "@/components/quest/MapPath";
import { useQuestProgressStore } from "@/store/questProgressStore";

/**
 * Client half of `/quest/map` — split from `page.tsx` purely so that
 * file can stay a server component and keep exporting `metadata`, while
 * this one reads session progress (needs a client-side store
 * subscription) to override a completed lesson's status. No other
 * locked node changes when a lesson completes — this slice only has
 * one real lesson, so there's nothing real to unlock yet.
 */
export function QuestMapView() {
  const completedLessonIds = useQuestProgressStore((state) => state.completedLessonIds);

  const nodes = WORLD_MAP_NODES.map((node) =>
    completedLessonIds.includes(node.id) ? { ...node, status: "completed" as const } : node
  );

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-6 py-10">
      <div className="flex w-full max-w-sm items-center justify-between">
        <Link
          href="/quest"
          data-quest-display
          className="text-sm font-semibold text-[var(--quest-ink-on-dark-muted)] transition-colors hover:text-[var(--quest-ink-on-dark)]"
        >
          ← Back
        </Link>
        <h1 className="text-sm font-semibold uppercase tracking-wide">The World Map</h1>
        <span className="w-10" aria-hidden />
      </div>

      {/* Tall on purpose — the world extends past the fold, so scrolling
          up toward the locked peak is itself part of "there's more up
          there" curiosity, not just a layout consequence. */}
      <div className="relative h-[1200px] w-full max-w-sm">
        <MapPath points={nodes} />
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <LessonNode title={node.title} status={node.status} href={node.href} />
          </div>
        ))}
      </div>
    </main>
  );
}
