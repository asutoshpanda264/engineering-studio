"use client";

import { useMemo } from "react";
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
import type { ReadingRoomView } from "@/components/readingRoom/ViewToggle";
import type { ReadingRoomGroup } from "@/components/readingRoom/types";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";

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
 * `LLDIndexView` use: Journey/Atlas in the default theme (now tied
 * directly to theme, not a manual toggle — see `view` below), the arcade
 * `AgenticMap` in Batman Mode (`night-ops`). Journey/Atlas themselves are
 * the generic `ReadingRoomJourney`/`ReadingRoomAtlas` fed `AGENTIC_LESSONS`
 * grouped by `AgenticCategory` — replaces the original flat-grid
 * `AgenticList` (now deleted) in the default theme, same as
 * `LLDIndexView`'s own replacement of `LLDList`.
 */
export function AgenticIndexView() {
  const { theme } = useTheme();
  // Paper gets Journey, dark gets Atlas — per the same explicit feedback
  // that settled this for `FoundationsIndexView` (see that file's own
  // comment): Atlas's environment-heavy treatment is tuned for dark's
  // near-black ground, Journey's flatter bordered-panel treatment reads
  // better against Paper's near-white ground. A manual `ViewToggle` used
  // to sit in the hero section for comparing the two live; removed along
  // with this, since the decision is no longer a per-visitor choice.
  const view: ReadingRoomView = theme === "light" ? "journey" : "atlas";
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
          `FoundationsIndexView`'s own `<main>` — see that file's comment
          for why the mesh layer is `fixed` (stays pinned to the viewport
          as the page scrolls, per direct feedback on `/learn`'s identical
          layer) while the grid texture behind it stays `absolute` (scrolls
          with the page), and why `theme !== "light"` is redundant-but-
          defensive here (`view === "atlas"` already implies it). */}
      {view === "atlas" && (
        <>
          <div
            aria-hidden
            className={`bg-blueprint-grid pointer-events-none absolute inset-0 -z-20 ${theme === "light" ? "opacity-60" : "opacity-70"}`}
          />
          {theme !== "light" && (
            <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-20 h-screen overflow-hidden opacity-[0.35]">
              <SystemMeshBackground />
            </div>
          )}
        </>
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
      </section>
      {view === "atlas" ? (
        <ReadingRoomAtlas groups={groups} completedSlugs={completedSlugs} basePath="/agentic" itemLabel={itemLabel} />
      ) : (
        <ReadingRoomJourney groups={groups} completedSlugs={completedSlugs} basePath="/agentic" itemLabel={itemLabel} />
      )}
    </main>
  );
}
