"use client";

import { useMemo, useState } from "react";
import { Layers, Puzzle, Shapes, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { LLD_LESSONS, LLD_CATEGORY_LABEL, type LLDCategory, type LLDLesson } from "@/content/lld";
import { useLLDProgress } from "@/lib/lldProgress";
import { LLDMap } from "@/components/maps/LLDMap";
import { ReadingRoomJourney } from "@/components/readingRoom/ReadingRoomJourney";
import { ReadingRoomAtlas } from "@/components/readingRoom/ReadingRoomAtlas";
import { ViewToggle, type ReadingRoomView } from "@/components/readingRoom/ViewToggle";
import type { ReadingRoomGroup } from "@/components/readingRoom/types";

const CATEGORY_ORDER: LLDCategory[] = ["fundamentals", "patterns", "case-study"];

const CATEGORY_DESCRIPTION: Record<LLDCategory, string> = {
  fundamentals: "OOP and SOLID — the vocabulary an LLD interview is actually conducted in.",
  patterns: "The three pattern families, and which problem each one actually solves.",
  "case-study": "Classic interview problems, worked end to end — Parking Lot, LRU Cache, and more.",
};

/** One plain icon per category, reused across every card in that group — see `readingRoom/types.ts`'s own doc comment for why this isn't a per-lesson glyph the way Foundations' `LessonGlyph` is. */
const CATEGORY_ICON: Record<LLDCategory, ReadingRoomGroup["icon"]> = {
  fundamentals: Layers,
  patterns: Puzzle,
  "case-study": ClipboardList,
};

/**
 * `/lld`'s body — same `useTheme()` shape `FoundationsIndexView` uses:
 * a Journey/Atlas toggle in the default theme, the arcade `LLDMap` in
 * Batman Mode (`night-ops`). Journey/Atlas themselves are the generic
 * `ReadingRoomJourney`/`ReadingRoomAtlas` (see their own doc comments) fed
 * `LLD_LESSONS` grouped by `LLDCategory` — same propagation
 * `AgenticIndexView`/`CaseStudiesIndexView` apply to their own content.
 * Replaces the original flat-grid `LLDList` (now deleted) in the default
 * theme, the same way `FoundationsJourney`/`FoundationsAtlas` replaced
 * `FoundationsList` there first — night-ops is unaffected either way,
 * it never reached the flat grid or this toggle.
 */
export function LLDIndexView() {
  const { theme } = useTheme();
  const [view, setView] = useState<ReadingRoomView>("atlas");
  const completedSlugs = useLLDProgress();

  const groups = useMemo<ReadingRoomGroup<LLDLesson>[]>(
    () =>
      CATEGORY_ORDER.map((category) => ({
        key: category,
        title: LLD_CATEGORY_LABEL[category],
        description: CATEGORY_DESCRIPTION[category],
        icon: CATEGORY_ICON[category],
        items: LLD_LESSONS.filter((lesson) => lesson.category === category),
      })).filter((group) => group.items.length > 0),
    []
  );

  const itemLabel = (count: number) => `lesson${count === 1 ? "" : "s"}`;

  const header = (
    <AppHeader
      back={{ href: "/learn", label: "Learn" }}
      right={
        <>
          <ThemeToggle />
          <LinkButton href="/lld/editor" variant="primary" size="sm" icon={<Shapes className="size-3.5" aria-hidden />}>
            Open Editor
          </LinkButton>
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
          <LLDMap
            lessons={LLD_LESSONS}
            headerSlot={
              <>
                <Badge variant="primary">Low-Level Design</Badge>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text">The code inside one box</h1>
                <p className="mt-2 text-sm text-balance text-text-muted">
                  Scroll the map to browse fundamentals, patterns, and case studies.
                </p>
              </>
            }
          />
        </div>
      </main>
    );
  }

  return (
    // `isolate`/`relative`/`bg-reading-room`/the grid layer: identical
    // reasoning to `FoundationsIndexView`'s own `<main>` — see that file's
    // comment for the full explanation of each piece.
    <main
      className={`relative isolate flex min-h-screen flex-col bg-reading-room ${view === "journey" ? "bg-blueprint-grid" : ""}`}
    >
      {view === "atlas" && (
        <div
          aria-hidden
          className={`bg-blueprint-grid pointer-events-none absolute inset-0 -z-20 ${theme === "light" ? "opacity-60" : "opacity-70"}`}
        />
      )}
      {header}
      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-10 pt-16 text-center sm:pt-20">
        <Badge variant="primary">Low-Level Design</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">The code inside one box</h1>
        <p className="max-w-xl text-balance text-text-muted">
          OOP, SOLID, UML, and the design patterns that keep showing up in real
          interviews — applied to classic case studies like Parking Lot, LRU Cache,
          and Movie Ticket Booking. Read in any order; nothing here is locked.
        </p>
        <ViewToggle view={view} onChange={setView} label="Low-Level Design layout" />
      </section>
      {view === "atlas" ? (
        <ReadingRoomAtlas groups={groups} completedSlugs={completedSlugs} basePath="/lld" itemLabel={itemLabel} />
      ) : (
        <ReadingRoomJourney groups={groups} completedSlugs={completedSlugs} basePath="/lld" itemLabel={itemLabel} />
      )}
    </main>
  );
}
