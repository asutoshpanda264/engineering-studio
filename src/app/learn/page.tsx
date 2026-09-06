import type { Metadata } from "next";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { FOUNDATION_LESSONS } from "@/content/foundations";
import { LLD_LESSONS } from "@/content/lld";
import { AGENTIC_LESSONS } from "@/content/agentic";
import { CASE_STUDIES } from "@/content/caseStudies";
import { LearnHubView } from "./LearnHubView";

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
 * Stays a server component purely for `metadata` and for reading these
 * content arrays' lengths — the actual body (`LearnHubView`) needs
 * `useTheme()`, so it's a client component one level down, same split
 * `FoundationsIndexView` and the other reading-room `*IndexView`s already
 * use.
 */
export default function LearnHubPage() {
  return (
    <LearnHubView
      rooms={[
        {
          href: "/foundations",
          icon: "BookOpen",
          title: "Foundations",
          outcome: "Speak the vocabulary everything else assumes: DNS, HTTP, databases, caching, queues.",
          meta: `${FOUNDATION_LESSONS.length} lesson${FOUNDATION_LESSONS.length === 1 ? "" : "s"}`,
        },
        {
          href: "/lld",
          icon: "Shapes",
          title: "Low-Level Design",
          outcome: "Turn a vague spec into classes that don't fall apart — OOP, SOLID, and the patterns behind them.",
          meta: `${LLD_LESSONS.length} lesson${LLD_LESSONS.length === 1 ? "" : "s"}`,
        },
        {
          href: "/entities",
          icon: "Boxes",
          title: "Entities",
          outcome: "Know exactly how every component you drag into the Workshop breaks, and how to reproduce it.",
          meta: `${ENTITY_CATALOG.length} components`,
        },
        {
          href: "/agentic",
          icon: "Bot",
          title: "Agentic AI",
          outcome: "Follow agent control flow, MCP/A2A, and RAG architectures through their documented failure modes.",
          meta: `${AGENTIC_LESSONS.length} lesson${AGENTIC_LESSONS.length === 1 ? "" : "s"}`,
        },
        {
          href: "/case-studies",
          icon: "Compass",
          title: "Case Studies",
          outcome: "See it all assembled into complete, worked architectures — RAG System, AI Search, Trip-Planning Agent.",
          meta: `${CASE_STUDIES.length} case stud${CASE_STUDIES.length === 1 ? "y" : "ies"}`,
        },
      ]}
    />
  );
}
