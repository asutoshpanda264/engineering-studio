import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/ui/LinkButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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
 *
 * Same "Trace" component language as the landing page: hairline tags
 * instead of pills, mono for nav/chrome, serif for the reading-oriented
 * hero copy (this page is left at the ambient serif default — no
 * `font-mono` root override, unlike the Workshop). No scroll-triggered
 * fade-in — content is visible the instant it paints.
 */
export default function EntitiesIndexPage() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Engineering Studio
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LinkButton href="/workshop" variant="secondary" size="sm" className="bg-bg-elevated">
              Enter Workshop
            </LinkButton>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-12 pt-16 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
          Reference, not a build surface
        </span>
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
              <Link
                key={item.type}
                href={`/entities/${slugFromEntityType(item.type)}`}
                className="group relative flex h-full flex-col gap-3 border border-border bg-bg-panel p-5 transition-all duration-fast ease-standard hover:-translate-y-1 hover:border-border-hover hover:bg-bg-elevated hover:shadow-dropdown"
              >
                <span className="absolute right-3 top-3 font-mono text-[10px] text-text-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-2 pr-6">
                  <item.icon className="size-4 text-signal" aria-hidden />
                  <h2 className="font-medium text-text">{item.name}</h2>
                </div>
                <p className="text-sm text-text-muted">{deepDive.tagline}</p>
                <p className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
                  {deepDive.failureModes.length} named failure mode
                  {deepDive.failureModes.length === 1 ? "" : "s"}
                  <ArrowRight
                    className="size-3.5 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden
                  />
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
