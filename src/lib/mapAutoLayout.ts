export interface TieredLayoutItem {
  slug: string;
  /** Which column this item belongs in — must be one of `tierOrder`'s entries; an item whose tier isn't listed there is silently dropped. */
  tier: string;
  /** Stable sort key within a tier's own lane column (course/catalog order, not global rank). */
  order: number;
}

// Percent-space padding from the canvas edges — keeps a tier's first/last
// lane, and the leftmost/rightmost tier itself, from sitting flush against
// the viewport edge where a node card would get half-clipped by the pan
// container's own edge.
const TIER_MARGIN = 8;
const LANE_MARGIN = 12;

/**
 * Deterministic "level select" layout for a map with no hand-tuned
 * positions — tier = column (left to right, in `tierOrder`'s order),
 * lane = row within a tier (top to bottom, by `order`). Used by
 * `EntitiesMap`/`LLDMap`/`AgenticMap`'s own `mapLayout.ts` files instead
 * of `/foundations`' original approach (every node's `x`/`y` hand-placed
 * and iteratively nudged apart — see that module's own `mapLayout.ts` doc
 * comment for the crossing-detection work that took). Not as bespoke, but
 * consistent and needs no manual re-tuning as content grows — reasonable
 * for 3 more maps at this node count.
 *
 * Positions are evenly spread within each axis (`TIER_MARGIN`/
 * `LANE_MARGIN` from the edges, then split evenly across however many
 * tiers/lanes actually have content), so every tier's node count can
 * differ without leaving one column looking sparse relative to another.
 */
export function computeTieredMapLayout(
  items: readonly TieredLayoutItem[],
  tierOrder: readonly string[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  const byTier = new Map<string, TieredLayoutItem[]>();
  for (const item of items) {
    const bucket = byTier.get(item.tier);
    if (bucket) bucket.push(item);
    else byTier.set(item.tier, [item]);
  }

  const activeTiers = tierOrder.filter((tier) => (byTier.get(tier)?.length ?? 0) > 0);
  const tierCount = activeTiers.length;

  activeTiers.forEach((tier, tierIndex) => {
    const x = tierCount === 1 ? 50 : TIER_MARGIN + (tierIndex / (tierCount - 1)) * (100 - 2 * TIER_MARGIN);
    const lane = (byTier.get(tier) ?? []).slice().sort((a, b) => a.order - b.order);
    const laneCount = lane.length;
    lane.forEach((item, laneIndex) => {
      const y = laneCount === 1 ? 50 : LANE_MARGIN + (laneIndex / (laneCount - 1)) * (100 - 2 * LANE_MARGIN);
      positions.set(item.slug, { x, y });
    });
  });

  return positions;
}
