import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Boxes, Shapes } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { FOUNDATION_LESSONS } from "@/content/foundations";
import { LLD_LESSONS } from "@/content/lld";

/**
 * Static "map" of the three reading rooms — same node-on-a-line motif as
 * the landing page's HeroDiagram, but with no simulation dependency and no
 * motion: this is orientation, not a demo. Sits inside a hairline
 * "specimen" frame with a corner Fig. tag, same convention as the landing
 * page's `Fig. 01 — Live Architecture` box, so /learn's hero reads as
 * another issue of the same reference instead of a bare text block.
 */
const READING_ROOMS = [
  { icon: BookOpen, label: "Foundations", sub: "theory" },
  { icon: Shapes, label: "LLD", sub: "code-level" },
  { icon: Boxes, label: "Entities", sub: "components" },
] as const;

function ReadingRoomsDiagram() {
  return (
    <div className="relative flex items-stretch justify-between gap-3">
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden />
      {READING_ROOMS.map((room) => (
        <div
          key={room.label}
          className="relative z-10 flex flex-1 flex-col items-center gap-2 border border-border bg-bg-panel px-4 py-5"
        >
          <room.icon className="size-5 text-signal" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-wide text-text">{room.label}</span>
          <span className="font-mono text-[10px] text-text-subtle">{room.sub}</span>
        </div>
      ))}
    </div>
  );
}

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
          out of content. `SystemMeshBackground` sits behind this whole
          block (not the header, which stays a clean solid strip) via a
          negative z-index — a plain in-flow background-image would paint
          *above* it per normal stacking order, since a positioned
          descendant with z-index:auto stacks after in-flow siblings. */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <SystemMeshBackground />
        </div>
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-10 text-center">
          <Badge variant="primary">Three reading rooms</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">Learn</h1>
          <p className="max-w-xl text-balance text-text-muted">
            Read the theory, then go prove it to yourself in the Workshop.
          </p>
        </section>

        <section className="mx-auto w-full max-w-lg px-6 pb-12">
          <div className="relative border border-border bg-bg-elevated p-5">
            <span className="absolute -top-px -left-px border border-signal/50 bg-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
              Fig. 01 — Reading Rooms
            </span>
            <ReadingRoomsDiagram />
          </div>
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
