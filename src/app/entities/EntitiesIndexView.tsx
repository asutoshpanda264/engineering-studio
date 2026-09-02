"use client";

import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { EntitiesMap } from "@/components/maps/EntitiesMap";
import { EntitiesList } from "@/components/entities/EntitiesList";

/**
 * `/entities`' body — same `useTheme()` shape the other three reading
 * rooms use: `EntitiesList` (the original two-group grid) in the default
 * theme, the arcade `EntitiesMap` in Batman Mode (`night-ops`). No
 * completion tracking here — `EntitiesMap`'s own doc comment explains why
 * (no lesson content, no natural read-order).
 */
export function EntitiesIndexView() {
  const { theme } = useTheme();

  const header = (
    <AppHeader
      back={{ href: "/", label: "Engineering Studio" }}
      right={
        <>
          <ThemeToggle />
          <LinkButton href="/workshop" variant="secondary" size="sm" className="bg-bg-elevated">
            Enter Workshop
          </LinkButton>
        </>
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
    // `bg-reading-room` (see globals.css): identical to `bg-bg` outside
    // Paper, a few points darker under it — the same "piercing white
    // background, borderless card" fix `/foundations` went through first.
    <main className="flex min-h-screen flex-col bg-reading-room">
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
      </section>
      <EntitiesList />
    </main>
  );
}
