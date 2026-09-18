"use client";

import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { EntitiesMap } from "@/components/maps/EntitiesMap";
import { EntitiesList } from "@/components/entities/EntitiesList";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { slugFromEntityType } from "@/lib/entityDeepDive";
import { useEntitiesProgress } from "@/lib/entitiesProgress";

/**
 * `/entities`' body — same `useTheme()` shape the other three reading
 * rooms use: `EntitiesList` (the original two-group grid) in the default
 * theme, the arcade `EntitiesMap` in Batman Mode (`night-ops`). No
 * Continue/Start-Here card or track sequencing here — `EntitiesMap`'s own
 * doc comment explains why (no lesson content, no natural read-order) — but
 * a plain "X/Y components viewed" `ProgressCard` still earns its place
 * (Paper only, matching every other reading room's progress card): direct
 * feedback specifically asked for a progress indicator here too, once the
 * other reading rooms all had one. Viewed state comes from
 * `entitiesProgress.ts` (`EntityViewTracker`, mounted on each entity's own
 * page), a lighter concept than Foundations'/LLD's "completed" — just "has
 * this reader opened this component's page," recorded automatically rather
 * than via an explicit "mark complete" click.
 */
export function EntitiesIndexView() {
  const { theme } = useTheme();
  const viewedSlugs = new Set(useEntitiesProgress());
  const totalEntities = ENTITY_CATALOG.length;
  // Count against the current catalog, not the raw stored length — a stray
  // slug from a since-removed entity shouldn't inflate the count past 100%.
  const viewedCount = ENTITY_CATALOG.filter((item) => viewedSlugs.has(slugFromEntityType(item.type))).length;

  const header = (
    <AppHeader
      back={{ href: "/", label: "Engineering Studio" }}
      right={
        <LinkButton href="/workshop" variant="secondary" size="sm" className="bg-bg-elevated">
          Enter Workshop
        </LinkButton>
      }
    />
  );

  if (theme === "night-ops") {
    return (
      <main className="flex h-screen flex-col overflow-hidden bg-bg">
        {header}
        <div className="relative min-h-0 flex-1">
          <EntitiesMap
            headerSlot={
              <>
                <span className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                  Reference, not a build surface
                </span>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text">
                  Every component, explained
                </h1>
                <p className="mt-2 text-sm text-balance text-text-muted">
                  Scroll the map to browse the catalog by region.
                </p>
              </>
            }
          />
        </div>
      </main>
    );
  }

  return (
    // `bg-workspace-bg` under Paper — plain `--color-bg` (the same
    // `#f4f7fc` ground `/foundations`'/`/lld`'s/etc. light-theme journey
    // view uses), not `bg-reading-room`'s darker/bluer `--color-bg-panel`
    // swap: `.reading-room-card` already gets a real border + shadow under
    // Paper (see globals.css), so this page doesn't need a tinted page
    // background for its cards to read against, and matching Foundations'
    // ground here specifically fixed feedback that this page (among others)
    // read "too blue" next to it. `bg-reading-room` stays the dark-theme
    // background (identical to plain `bg-bg` there).
    <main className={`flex min-h-screen flex-col ${theme === "light" ? "bg-workspace-bg" : "bg-reading-room"}`}>
      {header}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-12 pt-16 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
          Reference, not a build surface
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">Every component, explained</h1>
        <p className="max-w-xl text-balance text-text-muted">
          What it is, the tradeoffs it makes, how it compares to what production
          systems actually run — and exactly how to reproduce its named failure
          modes yourself in the Workshop.
        </p>
        {theme === "light" && <EntitiesProgressCard total={totalEntities} viewedCount={viewedCount} />}
      </section>
      <EntitiesList />
    </main>
  );
}

/**
 * A smaller, Continue-card-less sibling of `ReadingRoomJourney`'s
 * `ProgressCard` — same visual language (workspace tokens, slim accent bar)
 * but no paired "what's next" card, since there's no natural next entity to
 * recommend (see this file's own doc comment).
 */
function EntitiesProgressCard({ total, viewedCount }: { total: number; viewedCount: number }) {
  const percent = total > 0 ? Math.round((viewedCount / total) * 100) : 0;
  return (
    <div className="mt-2 flex w-full max-w-sm flex-col gap-4 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface p-5 text-left shadow-[var(--shadow-workspace-card)]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide text-workspace-text-subtle">Your progress</span>
        <span className="font-mono text-xs font-semibold text-workspace-accent">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-workspace-surface-soft">
        <div
          className="h-full rounded-full bg-workspace-accent transition-[width] duration-slow ease-standard"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-mono text-xs text-workspace-text-muted">
        <strong className="text-workspace-text">{viewedCount}</strong>/{total} components viewed
      </span>
    </div>
  );
}
