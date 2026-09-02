import type { Metadata } from "next";
import { BookOpen, Bot, Boxes, Compass, Shapes } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { Card } from "@/components/ui/Card";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { FOUNDATION_LESSONS } from "@/content/foundations";
import { LLD_LESSONS } from "@/content/lld";
import { AGENTIC_LESSONS } from "@/content/agentic";
import { CASE_STUDIES } from "@/content/caseStudies";

export const metadata: Metadata = {
  title: "Learn — Engineering Studio",
  description:
    "Five reading rooms: core system-design theory (Foundations), code-level design (LLD), the simulated infrastructure components (Entities), agent control flow (Agentic AI), and worked reference designs (Case Studies).",
};

/**
 * The one hub every reading room hangs off of — `WorkshopHeader`'s "Learn"
 * button and the landing page both point here rather than straight at
 * `/entities`, so adding a reading room is one more card here, not a new
 * nav button somewhere else. `/agentic` is the fourth (Foundations, LLD,
 * and Entities came first).
 *
 * Used to also render a bordered "Fig. 01 — Reading Rooms" strip of the
 * same five icons above this exact grid — a second, smaller copy of the
 * same five destinations directly on top of the real cards. Cut: the
 * cards below already carry the icon, the label, and (unlike the strip)
 * a description and a lesson count, so the strip was pure duplication,
 * not orientation.
 */
export default function LearnHubPage() {
  return (
    // `bg-reading-room` (see globals.css): identical to `bg-bg` outside
    // Paper, a few points darker under it — the same "piercing white
    // background, borderless card" fix `/foundations` went through first,
    // now shared by every reading-room index. A plain CSS class (not a
    // `theme === "light"` JS check) since this page has no client
    // boundary of its own to read `useTheme()` from.
    <main className="flex min-h-screen flex-col bg-reading-room">
      {/* max-w-6xl, not the 5xl this used to carry — every other reading-room
          index page (`/entities`, `/foundations`, `/agentic`, `/case-studies`,
          `/lld`) already sits at 6xl, so this was the one outlier: navigating
          here from any of them visibly shifted the back-link ~130px sideways. */}
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

      {/* Still centered in the space below the header rather than pinned to
          the top — on a tall viewport that reads as a deliberately minimal
          chooser screen instead of a page that ran out of content.
          `SystemMeshBackground` sits behind this whole block (not the
          header, which stays a clean solid strip) via a negative z-index —
          a plain in-flow background-image would paint *above* it per
          normal stacking order, since a positioned descendant with
          z-index:auto stacks after in-flow siblings. */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <SystemMeshBackground />
        </div>
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-12 text-center">
          <Badge variant="primary">Five reading rooms</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">Learn</h1>
          <p className="max-w-xl text-balance text-text-muted">
            Read the theory, then go prove it to yourself in the Workshop.
          </p>
        </section>

        <section className="mx-auto grid w-full max-w-4xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            href="/foundations"
            number="01"
            icon={BookOpen}
            title="Foundations"
            description="The internet, DNS, HTTP, databases, caching, queues — the vocabulary everything else assumes."
            meta={`${FOUNDATION_LESSONS.length} lesson${FOUNDATION_LESSONS.length === 1 ? "" : "s"}`}
          />
          <Card
            href="/lld"
            number="02"
            icon={Shapes}
            title="Low-Level Design"
            description="OOP, SOLID, UML, and design patterns — applied to classic case studies like Parking Lot and LRU Cache."
            meta={`${LLD_LESSONS.length} lesson${LLD_LESSONS.length === 1 ? "" : "s"}`}
          />
          <Card
            href="/entities"
            number="03"
            icon={Boxes}
            title="Entities"
            description="Every component you can drag into the Workshop, how it breaks, and how to reproduce that yourself."
            meta={`${ENTITY_CATALOG.length} components`}
          />
          <Card
            href="/agentic"
            number="04"
            icon={Bot}
            title="Agentic AI"
            description="Agent control flow, MCP/A2A, RAG architectures, and the documented ways these systems actually fail."
            meta={`${AGENTIC_LESSONS.length} lesson${AGENTIC_LESSONS.length === 1 ? "" : "s"}`}
          />
          <Card
            href="/case-studies"
            number="05"
            icon={Compass}
            title="Case Studies"
            description={'Complete, worked architectures — RAG System, AI Search, MCP Design, Trip-Planning Agent — with a "Build it" link where one exists.'}
            meta={`${CASE_STUDIES.length} case stud${CASE_STUDIES.length === 1 ? "y" : "ies"}`}
          />
        </section>
      </div>
    </main>
  );
}
