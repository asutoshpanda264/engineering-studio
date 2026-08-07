import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/landing/Reveal";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { getEntityDeepDive, slugFromEntityType } from "@/lib/entityDeepDive";

export const metadata: Metadata = {
  title: "Entities — Engineering Studio",
  description:
    "What each infrastructure component does, the tradeoffs it makes, and how to trigger its named failure modes in the Workshop.",
};

/**
 * Index of every entity's deep-dive page. Deliberately separate from the
 * Workshop's Component Library sidebar — this is the reading room, not the
 * build surface. Each card links to /entities/[slug] for the full writeup.
 */
export default function EntitiesIndexPage() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-text transition-colors duration-fast ease-standard hover:text-text-muted"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Engineering Studio
          </Link>
          <Link
            href="/workshop"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-bg-elevated px-4 text-sm font-medium text-text transition-colors duration-fast ease-standard hover:border-border-hover hover:bg-bg-panel"
          >
            Enter Workshop
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-12 pt-16 text-center sm:pt-20">
        <Badge variant="primary">Reference, not a build surface</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          Every component, explained
        </h1>
        <p className="max-w-xl text-balance text-text-muted">
          What it is, the tradeoffs it makes, how it compares to what production
          systems actually run — and exactly how to reproduce its named failure
          modes yourself in the Workshop.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENTITY_CATALOG.map((item, i) => {
            const deepDive = getEntityDeepDive(item.type);
            return (
              <Reveal key={item.type} delay={i * 0.05}>
                <Link
                  href={`/entities/${slugFromEntityType(item.type)}`}
                  className="group flex h-full flex-col gap-3 rounded-lg border border-border bg-bg-panel p-5 transition-colors duration-fast ease-standard hover:border-border-hover hover:bg-bg-elevated"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="size-4 text-primary" aria-hidden />
                      <h2 className="font-medium text-text">{item.name}</h2>
                    </div>
                    <ArrowRight
                      className="size-4 shrink-0 text-text-subtle transition-transform duration-fast ease-standard group-hover:translate-x-0.5 group-hover:text-text"
                      aria-hidden
                    />
                  </div>
                  <p className="text-sm text-text-muted">{deepDive.tagline}</p>
                  <p className="mt-auto pt-2 text-[11px] text-text-subtle">
                    {deepDive.failureModes.length} named failure mode
                    {deepDive.failureModes.length === 1 ? "" : "s"}
                  </p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>
    </main>
  );
}
