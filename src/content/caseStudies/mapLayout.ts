import { computeTieredMapLayout } from "@/lib/mapAutoLayout";
import { CASE_STUDIES, CASE_STUDY_CATEGORY_LABEL } from "./index";
import type { CaseStudyCategory } from "./types";

/** Node position shape every domain's map layout returns — same as `/foundations`' `FoundationsMapNode`. */
export interface CaseStudyMapNode {
  slug: string;
  x: number;
  y: number;
}

// Column order for `CaseStudiesMap` — Phase 1 (agentic) then the
// deferred Phase 2 (classic-hld), same order `docs/Expansion_TODO.md`
// scopes them in. Only "agentic" has any entries until Phase 2 lands;
// `computeTieredMapLayout`/`MapRegions` both already handle an empty
// tier gracefully (see their own filters).
const TIER_ORDER: CaseStudyCategory[] = ["agentic", "classic-hld"];

const LAYOUT = computeTieredMapLayout(
  CASE_STUDIES.map((entry) => ({ slug: entry.slug, tier: entry.category, order: entry.number })),
  TIER_ORDER
);

export function getCaseStudyMapNodePosition(slug: string): CaseStudyMapNode | undefined {
  const position = LAYOUT.get(slug);
  return position ? { slug, ...position } : undefined;
}

/** Category regions for `MapRegions` — same grouping as the tiers above, reusing the index page's own category labels. */
export const CASE_STUDY_MAP_REGIONS = TIER_ORDER.map((category) => ({
  label: CASE_STUDY_CATEGORY_LABEL[category],
  slugs: CASE_STUDIES.filter((entry) => entry.category === category).map((entry) => entry.slug),
})).filter((region) => region.slugs.length > 0);
