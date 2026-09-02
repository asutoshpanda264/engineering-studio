import { computeTieredMapLayout } from "@/lib/mapAutoLayout";
import { LLD_LESSONS, LLD_CATEGORY_LABEL } from "./index";
import type { LLDCategory } from "./types";

/** Node position shape every domain's map layout returns — same as `/foundations`' `FoundationsMapNode`. */
export interface LLDMapNode {
  slug: string;
  x: number;
  y: number;
}

// Column order for `LLDMap` — fundamentals, then patterns, then applying
// them to a full case study, the same three-phase reading order
// `/lld/page.tsx`'s own grid already groups lessons into.
const TIER_ORDER: LLDCategory[] = ["fundamentals", "patterns", "case-study"];

const LAYOUT = computeTieredMapLayout(
  LLD_LESSONS.map((lesson) => ({ slug: lesson.slug, tier: lesson.category, order: lesson.number })),
  TIER_ORDER
);

export function getLLDMapNodePosition(slug: string): LLDMapNode | undefined {
  const position = LAYOUT.get(slug);
  return position ? { slug, ...position } : undefined;
}

/** Category regions for `MapRegions` — same grouping as the tiers above, reusing the index page's own category labels. */
export const LLD_MAP_REGIONS = TIER_ORDER.map((category) => ({
  label: LLD_CATEGORY_LABEL[category],
  slugs: LLD_LESSONS.filter((lesson) => lesson.category === category).map((lesson) => lesson.slug),
})).filter((region) => region.slugs.length > 0);
