"use client";

import { useMemo } from "react";
import { Bot, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CASE_STUDIES, CASE_STUDY_CATEGORY_LABEL, type CaseStudyCategory, type CaseStudy } from "@/content/caseStudies";
import { useCaseStudyProgress } from "@/lib/caseStudyProgress";
import { CaseStudiesMap } from "@/components/maps/CaseStudiesMap";
import { ReadingRoomJourney } from "@/components/readingRoom/ReadingRoomJourney";
import { ReadingRoomAtlas } from "@/components/readingRoom/ReadingRoomAtlas";
import type { ReadingRoomView } from "@/components/readingRoom/ViewToggle";
import type { ReadingRoomGroup } from "@/components/readingRoom/types";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";

const CATEGORY_ORDER: CaseStudyCategory[] = ["agentic", "classic-hld"];

const CATEGORY_DESCRIPTION: Record<CaseStudyCategory, string> = {
  agentic: "Complete agent architectures — RAG System, AI Search, MCP Design, Trip-Planning Agent.",
  "classic-hld": "Classic large-scale system designs — Twitter, Netflix, Hotel Management, Parking Lot.",
};

/** One plain icon per category, reused across every card in that group — see `readingRoom/types.ts`'s own doc comment for why this isn't a per-lesson glyph the way Foundations' `LessonGlyph` is. */
const CATEGORY_ICON: Record<CaseStudyCategory, ReadingRoomGroup["icon"]> = {
  agentic: Bot,
  "classic-hld": Building2,
};

/**
 * `/case-studies`' body — same `useTheme()` shape `AgenticIndexView`/
 * `FoundationsIndexView`/`LLDIndexView` use: Journey/Atlas in the default
 * theme (now tied directly to theme, not a manual toggle — see `view`
 * below), the arcade `CaseStudiesMap` in Batman Mode (`night-ops`).
 * Journey/Atlas themselves are the generic `ReadingRoomJourney`/
 * `ReadingRoomAtlas` fed `CASE_STUDIES` grouped by `CaseStudyCategory` —
 * replaces the original flat-grid `CaseStudiesList` (now deleted) in the
 * default theme, same as `LLDIndexView`'s/`AgenticIndexView`'s own
 * replacements.
 *
 * `classic-hld` is currently empty (`docs/Expansion_TODO.md`'s Pillar E
 * Phase 2, deferred) — `groups` filters it out below, same as every other
 * empty category already does, so today this renders one track
 * (`agentic`, currently one case study). Both views scale up on their own
 * once more entries land; nothing here is hardcoded to "exactly one."
 */
export function CaseStudiesIndexView() {
  const { theme } = useTheme();
  // Paper gets Journey, dark gets Atlas — per the same explicit feedback
  // that settled this for `FoundationsIndexView` (see that file's own
  // comment): Atlas's environment-heavy treatment is tuned for dark's
  // near-black ground, Journey's flatter bordered-panel treatment reads
  // better against Paper's near-white ground. A manual `ViewToggle` used
  // to sit in the hero section for comparing the two live; removed along
  // with this, since the decision is no longer a per-visitor choice.
  const view: ReadingRoomView = theme === "light" ? "journey" : "atlas";
  const completedSlugs = useCaseStudyProgress();

  const groups = useMemo<ReadingRoomGroup<CaseStudy>[]>(
    () =>
      CATEGORY_ORDER.map((category) => ({
        key: category,
        title: CASE_STUDY_CATEGORY_LABEL[category],
        description: CATEGORY_DESCRIPTION[category],
        icon: CATEGORY_ICON[category],
        items: CASE_STUDIES.filter((entry) => entry.category === category),
      })).filter((group) => group.items.length > 0),
    []
  );

  const itemLabel = (count: number) => `case stud${count === 1 ? "y" : "ies"}`;

  const header = (
    <AppHeader
      back={{ href: "/learn", label: "Learn" }}
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
          <CaseStudiesMap
            entries={CASE_STUDIES}
            headerSlot={
              <>
                <Badge variant="primary">Case Studies</Badge>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text">
                  Worked reference designs
                </h1>
                <p className="mt-2 text-sm text-balance text-text-muted">
                  Scroll the map to browse complete, worked architectures.
                </p>
              </>
            }
          />
        </div>
      </main>
    );
  }

  return (
    // `isolate`/`relative`/the grid layer: identical reasoning to
    // `FoundationsIndexView`'s own `<main>` — see that file's comment for
    // the full explanation of each piece. Background follows the same
    // per-view split Foundations settled on too: journey (light theme, the
    // only branch that actually renders under Paper) gets the plain,
    // uncluttered `bg-workspace-bg` ground its bordered/shadowed cards
    // already have enough contrast against; only atlas (dark) keeps the
    // darker `bg-reading-room` tint plus the dot-grid texture below.
    // Previously both views shared `bg-reading-room` and journey additionally
    // painted `bg-blueprint-grid` right on `<main>` — direct feedback that
    // this page read "too blue" next to Foundations' whiter ground traced
    // back to exactly that drift from what Foundations itself already does.
    <main
      className={`relative isolate flex min-h-screen flex-col ${view === "journey" ? "bg-workspace-bg" : "bg-reading-room"}`}
    >
      {/* `bg-blueprint-grid` + `SystemMeshBackground`: identical to
          `FoundationsIndexView`'s own `<main>` — see that file's comment for
          why these are `absolute` (scroll with the page) rather than the
          `fixed` layer `ReadingRoomAtlas`'s own `AtlasBackdrop` used to
          paint the mesh on, and why `theme !== "light"` is redundant-but-
          defensive here (`view === "atlas"` already implies it). */}
      {view === "atlas" && (
        <>
          <div
            aria-hidden
            className={`bg-blueprint-grid pointer-events-none absolute inset-0 -z-20 ${theme === "light" ? "opacity-60" : "opacity-70"}`}
          />
          {theme !== "light" && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-screen overflow-hidden opacity-[0.35]">
              <SystemMeshBackground />
            </div>
          )}
        </>
      )}
      {header}
      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-10 pt-16 text-center sm:pt-20">
        <Badge variant="primary">Case Studies</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">Worked reference designs</h1>
        <p className="max-w-xl text-balance text-text-muted">
          Complete architectures, synthesized from the concepts taught across Agentic AI
          and Foundations — every component choice explained, with a &quot;Build it&quot;
          link into the real, simulatable version wherever one exists. Read in any order;
          nothing here is locked.
        </p>
      </section>
      {view === "atlas" ? (
        <ReadingRoomAtlas groups={groups} completedSlugs={completedSlugs} basePath="/case-studies" itemLabel={itemLabel} />
      ) : (
        <ReadingRoomJourney groups={groups} completedSlugs={completedSlugs} basePath="/case-studies" itemLabel={itemLabel} />
      )}
    </main>
  );
}
