import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Boxes, Shapes } from "lucide-react";
import { LinkButton } from "@/components/ui/LinkButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { FOUNDATION_LESSONS } from "@/content/foundations";
import { LLD_LESSONS } from "@/content/lld";

export const metadata: Metadata = {
  title: "Learn — Engineering Studio",
  description:
    "Three reading rooms: core system-design theory (Foundations), code-level design (LLD), and the simulated infrastructure components (Entities).",
};

/**
 * The one hub every reading room hangs off of — `WorkshopHeader`'s "Learn"
 * button and the landing page both point here rather than straight at
 * `/entities`, so adding a reading room is one more card here, not a new
 * nav button somewhere else. `/lld` is the third (Foundations and Entities
 * were the first two); it's the "third reading room" this file's own
 * comment used to say would land here later.
 */
export default function LearnHubPage() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
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

      {/* Three cards, still centered in the space below the header rather
          than pinned to the top — on a tall viewport that reads as a
          deliberately minimal chooser screen instead of a page that ran
          out of content. */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-12 text-center">
          <span className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
            Three reading rooms
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">Learn</h1>
          <p className="max-w-xl text-balance text-text-muted">
            Read the theory, then go prove it to yourself in the Workshop.
          </p>
        </section>

        <section className="mx-auto grid w-full max-w-4xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/foundations"
            className="group flex flex-col gap-3 border border-border bg-bg-panel p-6 transition-all duration-fast ease-standard hover:-translate-y-1 hover:border-border-hover hover:bg-bg-elevated hover:shadow-dropdown"
          >
            <div className="flex items-center justify-between">
              <BookOpen className="size-5 text-signal" aria-hidden />
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-text-subtle">01</span>
                <ArrowRight
                  className="size-4 text-text-subtle transition-transform duration-fast ease-standard group-hover:translate-x-0.5 group-hover:text-signal"
                  aria-hidden
                />
              </div>
            </div>
            <h2 className="font-medium text-text">Foundations</h2>
            <p className="text-sm text-text-muted">
              The internet, DNS, HTTP, databases, caching, queues — the vocabulary
              everything else assumes.
            </p>
            <p className="mt-auto pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
              {FOUNDATION_LESSONS.length} lesson{FOUNDATION_LESSONS.length === 1 ? "" : "s"}
            </p>
          </Link>

          <Link
            href="/lld"
            className="group flex flex-col gap-3 border border-border bg-bg-panel p-6 transition-all duration-fast ease-standard hover:-translate-y-1 hover:border-border-hover hover:bg-bg-elevated hover:shadow-dropdown"
          >
            <div className="flex items-center justify-between">
              <Shapes className="size-5 text-signal" aria-hidden />
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-text-subtle">02</span>
                <ArrowRight
                  className="size-4 text-text-subtle transition-transform duration-fast ease-standard group-hover:translate-x-0.5 group-hover:text-signal"
                  aria-hidden
                />
              </div>
            </div>
            <h2 className="font-medium text-text">Low-Level Design</h2>
            <p className="text-sm text-text-muted">
              OOP, SOLID, UML, and design patterns — applied to classic case studies
              like Parking Lot and LRU Cache.
            </p>
            <p className="mt-auto pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
              {LLD_LESSONS.length} lesson{LLD_LESSONS.length === 1 ? "" : "s"}
            </p>
          </Link>

          <Link
            href="/entities"
            className="group flex flex-col gap-3 border border-border bg-bg-panel p-6 transition-all duration-fast ease-standard hover:-translate-y-1 hover:border-border-hover hover:bg-bg-elevated hover:shadow-dropdown"
          >
            <div className="flex items-center justify-between">
              <Boxes className="size-5 text-signal" aria-hidden />
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-text-subtle">03</span>
                <ArrowRight
                  className="size-4 text-text-subtle transition-transform duration-fast ease-standard group-hover:translate-x-0.5 group-hover:text-signal"
                  aria-hidden
                />
              </div>
            </div>
            <h2 className="font-medium text-text">Entities</h2>
            <p className="text-sm text-text-muted">
              Every component you can drag into the Workshop, how it breaks, and how to
              reproduce that yourself.
            </p>
            <p className="mt-auto pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
              {ENTITY_CATALOG.length} components
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
