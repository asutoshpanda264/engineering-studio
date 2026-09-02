"use client";

import { useMemo, useState } from "react";
import { Bot, Workflow, Plug, Cpu, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AGENTIC_LESSONS, AGENTIC_CATEGORY_LABEL, type AgenticCategory, type AgenticLesson } from "@/content/agentic";
import { useAgenticProgress } from "@/lib/agenticProgress";
import { AgenticMap } from "@/components/maps/AgenticMap";
import { ReadingRoomJourney } from "@/components/readingRoom/ReadingRoomJourney";
import { ReadingRoomAtlas } from "@/components/readingRoom/ReadingRoomAtlas";
import { ViewToggle, type ReadingRoomView } from "@/components/readingRoom/ViewToggle";
import type { ReadingRoomGroup } from "@/components/readingRoom/types";

const CATEGORY_ORDER: AgenticCategory[] = [
  "fundamentals",
  "patterns",
  "protocols-and-infra",
  "inference-and-serving",
  "production",
];

const CATEGORY_DESCRIPTION: Record<AgenticCategory, string> = {
  fundamentals: "What an agent actually is, and the ReAct loop underneath every one of them.",
  patterns: "The six canonical patterns — Reflection, Tool Use, Planning, and the rest.",
  "protocols-and-infra": "MCP, A2A, and the three RAG architectures agents are actually built on.",
  "inference-and-serving": "SLM/LLM economics — quantization, caching, and what serving one actually costs.",
  production: "The documented ways agents fail, and the guardrails that catch it.",
};

/** One plain icon per category, reused across every card in that group — see `readingRoom/types.ts`'s own doc comment for why this isn't a per-lesson glyph the way Foundations' `LessonGlyph` is. */
const CATEGORY_ICON: Record<AgenticCategory, ReadingRoomGroup["icon"]> = {
  fundamentals: Bot,
  patterns: Workflow,
  "protocols-and-infra": Plug,
  "inference-and-serving": Cpu,
  production: ShieldCheck,
};

/**
 * `/agentic`'s body — same `useTheme()` shape `FoundationsIndexView`/
 * `LLDIndexView` use: a Journey/Atlas toggle in the default theme, the
 * arcade `AgenticMap` in Batman Mode (`night-ops`). Journey/Atlas
 * themselves are the generic `ReadingRoomJourney`/`ReadingRoomAtlas` fed
 * `AGENTIC_LESSONS` grouped by `AgenticCategory` — replaces the original
 * flat-grid `AgenticList` (now deleted) in the default theme, same as
 * `LLDIndexView`'s own replacement of `LLDList`.
 */
export function AgenticIndexView() {
  const { theme } = useTheme();
  const [view, setView] = useState<ReadingRoomView>("atlas");
  const completedSlugs = useAgenticProgress();

  const groups = useMemo<ReadingRoomGroup<AgenticLesson>[]>(
    () =>
      CATEGORY_ORDER.map((category) => ({
        key: category,
        title: AGENTIC_CATEGORY_LABEL[category],
        description: CATEGORY_DESCRIPTION[category],
        icon: CATEGORY_ICON[category],
        items: AGENTIC_LESSONS.filter((lesson) => lesson.category === category),
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
          <AgenticMap
            lessons={AGENTIC_LESSONS}
            headerSlot={
              <>
                <Badge variant="primary">Agentic AI</Badge>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text">
                  Agent control flow, for real
                </h1>
                <p className="mt-2 text-sm text-balance text-text-muted">
                  Scroll the map to browse patterns, protocols, and inference mechanics.
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
        <Badge variant="primary">Agentic AI</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">Agent control flow, for real</h1>
        <p className="max-w-xl text-balance text-text-muted">
          The six canonical patterns, MCP/A2A, RAG&apos;s three architectures, SLM/LLM
          inference economics, and the documented ways these systems actually fail.
          Read in any order; nothing here is locked.
        </p>
        <ViewToggle view={view} onChange={setView} label="Agentic AI layout" />
      </section>
      {view === "atlas" ? (
        <ReadingRoomAtlas groups={groups} completedSlugs={completedSlugs} basePath="/agentic" itemLabel={itemLabel} />
      ) : (
        <ReadingRoomJourney groups={groups} completedSlugs={completedSlugs} basePath="/agentic" itemLabel={itemLabel} />
      )}
    </main>
  );
}
