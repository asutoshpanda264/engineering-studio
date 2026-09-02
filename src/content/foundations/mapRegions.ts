/**
 * Loose thematic groupings of `/foundations` lessons, purely for the
 * forest map's background zoning (`MapRegions`) — a soft, unlabeled-edge
 * glow + a margin label per cluster, same "annotate the territory"
 * instinct `SystemMeshBackground.tsx` already uses on `/learn`. Not a new
 * data model: membership is just which lessons visually cluster together
 * on `mapLayout.ts`'s coordinates, recomputed as a bounding box at render
 * time rather than hand-placed, so editing `mapLayout.ts` can't silently
 * drift out of sync with these boxes.
 *
 * Deliberately no per-region *color* — `primitives.tsx`'s own rule
 * ("this design system reserves color for tone/status, not category")
 * applies here too: a region reads as a soft neutral glow + a label, and
 * `MapNode`'s locked/available/completed coloring stays the only color
 * that means anything on this map.
 */

export interface FoundationsMapRegion {
  label: string;
  slugs: string[];
}

export const FOUNDATIONS_MAP_REGIONS: FoundationsMapRegion[] = [
  {
    label: "Networking & the Web",
    slugs: [
      "how-the-internet-works",
      "browser-request-lifecycle",
      "client-server-architecture",
      "dns-deep-dive",
      "http-and-https",
      "rest-apis",
    ],
  },
  {
    label: "Delivery & Speed",
    slugs: ["load-balancers", "caching", "redis-deep-dive", "message-queues", "kafka-deep-dive", "cdn"],
  },
];
