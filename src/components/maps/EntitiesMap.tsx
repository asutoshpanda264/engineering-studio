"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { getEntityDeepDive, slugFromEntityType } from "@/lib/entityDeepDive";
import { getEntitiesMapNodePosition, ENTITIES_MAP_REGIONS } from "@/lib/entitiesMapLayout";
import { useTheme } from "@/components/theme/ThemeProvider";
import { PannableMapCanvas } from "./PannableMapCanvas";
import { MapRegions } from "./MapRegions";
import { ArcadeNode } from "./ArcadeNode";

const MAP_WIDTH = 2000;
const MAP_HEIGHT = 1100;

/**
 * `/entities`' Batman-Mode-only arcade map — same shell as `LLDMap`/
 * `AgenticMap`, but the simplest of the four: `ENTITY_CATALOG` has no
 * lesson content and no natural read-order, so there's no "mark
 * complete" progress and no connecting path between nodes (a fabricated
 * sequence through an unordered catalog would just be noise) — every
 * entity is just an always-open card, grouped into the same two regions
 * `EntitiesIndexPage` already renders as two `EntityGroup`s (the
 * distributed-systems catalog vs. the agentic-AI primitive set).
 */
export function EntitiesMap({ headerSlot }: { headerSlot?: ReactNode }) {
  const { theme } = useTheme();
  const cave = theme === "night-ops";

  // No progress store to hydrate here, but the map still needs a client-
  // only mount gate so `PannableMapCanvas`'s mount-centering effect (and
  // this component's own first paint) don't run ahead of hydration — same
  // `useSyncExternalStore` no-op-subscription shape every other map in
  // this app uses for the same reason.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <PannableMapCanvas
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      getInitialFocus={() => getEntitiesMapNodePosition(slugFromEntityType(ENTITY_CATALOG[0].type)) ?? null}
      ready={mounted}
      headerSlot={headerSlot}
    >
      <MapRegions regions={ENTITIES_MAP_REGIONS} getPosition={(slug) => getEntitiesMapNodePosition(slug)} />
      {ENTITY_CATALOG.map((item) => {
        const slug = slugFromEntityType(item.type);
        const position = getEntitiesMapNodePosition(slug);
        if (!position) return null;
        const deepDive = getEntityDeepDive(item.type);
        return (
          <ArcadeNode
            key={item.type}
            href={`/entities/${slug}`}
            x={position.x}
            y={position.y}
            title={item.name}
            icon={item.icon}
            footer={`${deepDive.failureModes.length} failure mode${deepDive.failureModes.length === 1 ? "" : "s"}`}
            cave={cave}
          />
        );
      })}
    </PannableMapCanvas>
  );
}
