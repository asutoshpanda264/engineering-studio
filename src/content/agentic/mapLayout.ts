import { computeTieredMapLayout } from "@/lib/mapAutoLayout";
import { AGENTIC_LESSONS, AGENTIC_CATEGORY_LABEL } from "./index";
import type { AgenticCategory } from "./types";

/** Node position shape every domain's map layout returns — same as `/foundations`' `FoundationsMapNode`. */
export interface AgenticMapNode {
  slug: string;
  x: number;
  y: number;
}

// Column order for `AgenticMap` — the five categories `docs/Agentic_AI.md`
// Part 3 groups this track's content into, in the same order
// `/agentic/page.tsx`'s own grid already uses.
const TIER_ORDER: AgenticCategory[] = [
  "fundamentals",
  "patterns",
  "protocols-and-infra",
  "inference-and-serving",
  "production",
];

const LAYOUT = computeTieredMapLayout(
  AGENTIC_LESSONS.map((lesson) => ({ slug: lesson.slug, tier: lesson.category, order: lesson.number })),
  TIER_ORDER
);

export function getAgenticMapNodePosition(slug: string): AgenticMapNode | undefined {
  const position = LAYOUT.get(slug);
  return position ? { slug, ...position } : undefined;
}

/** Category regions for `MapRegions` — same grouping as the tiers above, reusing the index page's own category labels. */
export const AGENTIC_MAP_REGIONS = TIER_ORDER.map((category) => ({
  label: AGENTIC_CATEGORY_LABEL[category],
  slugs: AGENTIC_LESSONS.filter((lesson) => lesson.category === category).map((lesson) => lesson.slug),
})).filter((region) => region.slugs.length > 0);
