import { computeTieredMapLayout } from "./mapAutoLayout";
import { ENTITY_CATALOG } from "./entityCatalog";
import { slugFromEntityType } from "./entityDeepDive";

/** Node position shape every domain's map layout returns — same as `/foundations`' `FoundationsMapNode`, keyed by the entity's `/entities/[slug]` slug rather than its raw `EntityType`. */
export interface EntitiesMapNode {
  slug: string;
  x: number;
  y: number;
}

// Two tiers — the same split `EntitiesIndexPage` already renders as two
// `EntityGroup`s: the original HLD/distributed-systems catalog (no
// `domain` set) vs. the agentic-AI primitive set (`domain: "agentic"`).
const TIER_ORDER = ["core", "agentic"];

const LAYOUT = computeTieredMapLayout(
  ENTITY_CATALOG.map((item, index) => ({
    slug: slugFromEntityType(item.type),
    tier: item.domain ?? "core",
    order: index,
  })),
  TIER_ORDER
);

export function getEntitiesMapNodePosition(slug: string): EntitiesMapNode | undefined {
  const position = LAYOUT.get(slug);
  return position ? { slug, ...position } : undefined;
}

/** The same two-region split as `TIER_ORDER` above, labeled for `MapRegions`. */
export const ENTITIES_MAP_REGIONS = [
  {
    label: "Distributed Systems",
    slugs: ENTITY_CATALOG.filter((item) => !item.domain).map((item) => slugFromEntityType(item.type)),
  },
  {
    label: "Agentic AI",
    slugs: ENTITY_CATALOG.filter((item) => item.domain === "agentic").map((item) => slugFromEntityType(item.type)),
  },
].filter((region) => region.slugs.length > 0);
