import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import type { EntityCatalogItem } from "@/lib/entityCatalog";
import { getEntityDeepDive, slugFromEntityType } from "@/lib/entityDeepDive";
import { Card } from "@/components/ui/Card";

/**
 * The default-theme `/entities` index — the original always-shipped
 * grid, extracted unchanged here so `EntitiesIndexView` can switch it
 * against the new arcade `EntitiesMap` (Batman Mode only). Every other
 * reading room (`/foundations`, `/lld`, `/agentic`, `/case-studies`) has
 * since moved to a tracked/sequenced Journey/Atlas pair instead of this
 * flat-grid shape — `/entities` deliberately keeps it: unlike a lesson
 * curriculum, its catalog has no natural read-order or "current entity"
 * to track (see `EntitiesMap`'s own doc comment), so the Journey/Atlas
 * metaphor doesn't fit here the way it does everywhere else.
 */
export function EntitiesList() {
  return (
    <>
      <EntityGroup
        title="Distributed Systems"
        description="The load balancers, caches, queues, and databases HLD interviews are built from."
        items={ENTITY_CATALOG.filter((item) => !item.domain)}
      />
      <EntityGroup
        title="Agentic AI"
        description="The primitives an LLM-agent architecture is built from — separate curriculum, separate sandbox."
        items={ENTITY_CATALOG.filter((item) => item.domain === "agentic")}
      />
    </>
  );
}

/**
 * One catalog section. Split by `domain` (see entityCatalog.ts) so
 * distributed-systems components and agentic-AI primitives read as two
 * curricula, not one undifferentiated grid — mirrors the Workshop
 * sidebar's Core/Modules vs. "Agentic AI" split.
 */
function EntityGroup({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: EntityCatalogItem[];
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-16 last:pb-24">
      <div className="mb-6 flex flex-col gap-1.5 border-b border-border pb-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-text-muted">{title}</h2>
        <p className="text-sm text-text-subtle">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const deepDive = getEntityDeepDive(item.type);
          return (
            <Card
              key={item.type}
              href={`/entities/${slugFromEntityType(item.type)}`}
              number={String(i + 1).padStart(2, "0")}
              icon={item.icon}
              title={item.name}
              description={deepDive.tagline}
              meta={
                <>
                  {deepDive.failureModes.length} named failure mode
                  {deepDive.failureModes.length === 1 ? "" : "s"}
                </>
              }
            />
          );
        })}
      </div>
    </section>
  );
}
