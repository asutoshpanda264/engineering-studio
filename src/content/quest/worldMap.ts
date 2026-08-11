import type { LessonNodeStatus } from "@/components/quest/LessonNode";

export interface WorldMapNode {
  id: string;
  title: string;
  /** Percent coordinates (0–100) within the map's viewBox — keeps the
      layout resolution-independent instead of hardcoded pixels. Shared
      by `LessonNode`'s CSS positioning and `MapPath`'s SVG points. */
  x: number;
  y: number;
  status: LessonNodeStatus;
  /** Only set for the one real lesson in this slice. */
  href?: string;
}

/**
 * The one vertical slice's world — see docs-game/CLAUDE.md §3. Only
 * "The Load Balancer Gate" is a real lesson; everything above it is a
 * locked silhouette so the world reads as bigger than one lesson
 * without four more lessons needing to exist yet. Ordered bottom-to-top
 * (index 0 is the entry point) to match how `/quest/map` renders it —
 * the player starts at the bottom and the unexplored world stretches
 * upward.
 *
 * No progress is persisted (see AGENTS.md/the project brief's
 * constraints) — this is the map's state for every fresh visit, not
 * just the first one. Wiring real completion tracking is deferred to
 * milestone 8, once a lesson can actually be finished.
 */
export const WORLD_MAP_NODES: WorldMapNode[] = [
  {
    id: "load-balancers",
    title: "The Load Balancer Gate",
    x: 50,
    y: 85,
    status: "current",
    href: "/quest/lesson/load-balancers",
  },
  { id: "network-forest", title: "Network Forest", x: 28, y: 67, status: "locked" },
  { id: "caching-caves", title: "Caching Caves", x: 72, y: 49, status: "locked" },
  { id: "database-city", title: "Database City", x: 28, y: 31, status: "locked" },
  { id: "distributed-peaks", title: "The Distributed Peaks", x: 72, y: 13, status: "locked" },
];
