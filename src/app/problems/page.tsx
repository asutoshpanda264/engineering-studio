"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Lightbulb, Search, Target, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/LinkButton";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DifficultyMeter } from "@/components/ui/DifficultyMeter";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getTrackAccent, TRACK_ACCENTS, TRACK_ACCENTS_DARK } from "@/components/foundations/trackAccent";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";
import { TOPIC_ICON, getTopicAccentClasses } from "@/lib/scenarioTopicVisuals";
import { SCENARIOS, SCENARIO_TOPIC_LABEL } from "@/scenarios";
import type { Scenario, ScenarioTopic } from "@/scenarios";
import { difficultyBorderColorClass } from "@/lib/difficultyDisplay";
import { useProblemProgress } from "@/lib/problemProgress";
import type { ProblemProgressEntry, ProblemStatus } from "@/lib/problemProgress";

const ALL_TOPICS = Object.keys(SCENARIO_TOPIC_LABEL) as ScenarioTopic[];
const ALL_DIFFICULTIES = [1, 2, 3, 4, 5] as const;

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const STATUS_LABEL: Record<ProblemStatus, string> = {
  unattempted: "Unattempted",
  attempted: "Attempted",
  solved: "Solved",
};

const STATUS_BADGE_VARIANT: Record<ProblemStatus, "neutral" | "warning" | "success"> = {
  unattempted: "neutral",
  attempted: "warning",
  solved: "success",
};

/**
 * The LeetCode-shaped front door onto `src/scenarios/` — a browsable,
 * filterable list rather than the landing page's small inline teaser or
 * the Workshop's `ScenariosMenu` dropdown. Every row deep-links into
 * `/workshop?scenario=<id>` via the existing `ScenarioDeepLink`
 * (`src/app/workshop/page.tsx`) — no changes needed there.
 *
 * Re-skinned onto the same `workspace-*` tokens, `TRACK_ACCENTS`
 * per-topic color, and elevated-card language `/learn`'s reading rooms
 * (`ReadingRoomJourney`, `FoundationsJourney`) already established — see
 * this file's own card/pill treatments below. Stays a flat, unordered
 * catalog rather than adopting those pages' grouped "track" sections:
 * a `Scenario` carries an array of topics (most touch more than one),
 * not one singular category the way `LLDLesson`/`InterviewQuestion` do,
 * so there's no clean, even partition to group by — the filter toolbar
 * is what does that job here instead.
 */
export default function ProblemsPage() {
  const [query, setQuery] = useState("");
  const [topics, setTopics] = useState<Set<ScenarioTopic>>(new Set());
  const [difficulties, setDifficulties] = useState<Set<number>>(new Set());
  const progress = useProblemProgress();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const solvedCount = SCENARIOS.filter((s) => progress[s.id]?.status === "solved").length;
  const solvedPercent = Math.round((solvedCount / SCENARIOS.length) * 100);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCENARIOS.filter((scenario) => {
      if (q && !scenario.title.toLowerCase().includes(q) && !scenario.story.toLowerCase().includes(q)) {
        return false;
      }
      if (topics.size > 0 && !scenario.topics.some((t) => topics.has(t))) return false;
      if (difficulties.size > 0 && !difficulties.has(scenario.difficulty)) return false;
      return true;
    });
  }, [query, topics, difficulties]);

  return (
    <main className="relative isolate flex min-h-screen flex-col bg-workspace-bg">
      {/* Same structural background every reading room shares — a scrolling
          dot-grid texture plus a fixed, dimmed `SystemMeshBackground` graph
          pinned to the viewport. `main`'s `isolate` is what keeps these
          negative-z layers trapped behind this page's own content instead
          of escaping to the document root — see `FoundationsIndexView`'s
          identical `<main>` comment for the fuller reasoning. */}
      <div
        aria-hidden
        className={`bg-blueprint-grid pointer-events-none absolute inset-0 -z-20 ${isLight ? "opacity-60" : "opacity-70"}`}
      />
      {!isLight && (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-20 h-screen overflow-hidden opacity-[0.35]">
          <SystemMeshBackground />
        </div>
      )}

      <AppHeader
        back={{ href: "/", label: "Engineering Studio" }}
        className="!bg-workspace-bg/90"
        maxWidthClassName="max-w-5xl"
        right={
          <>
            <Link
              href="/interview-questions"
              className="hidden items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-workspace-text-muted transition-colors duration-fast ease-standard hover:text-workspace-accent sm:inline-flex"
            >
              <Building2 className="size-4" aria-hidden />
              Interviews
            </Link>
            <ThemeToggle />
            <LinkButton href="/workshop" variant="secondary" size="sm" className="bg-bg-elevated">
              Enter Workshop
            </LinkButton>
          </>
        }
      />

      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-10 pt-16 text-center sm:pt-20">
        <Badge variant="primary" className="!border-workspace-accent/50 !bg-workspace-accent/10 !text-workspace-accent">
          {SCENARIOS.length} problems
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-workspace-text sm:text-4xl">
          Design it, then prove it
        </h1>
        <p className="max-w-xl text-balance text-workspace-text-muted">
          Topic- and difficulty-tagged architecture problems. Each one hands you a business
          problem and a blank canvas — design an architecture, run the simulation, and see
          whether it holds up under load and budget.
        </p>
      </section>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-16">
        <ProgressStat
          icon={Target}
          label="Your progress"
          current={solvedCount}
          total={SCENARIOS.length}
          unit={(n) => `problem${n === 1 ? "" : "s"} solved`}
          percent={solvedPercent}
        />

        {/* Filters — one bordered surface, sub-groups separated by labels
            and spacing rather than a box each. */}
        <div className="flex flex-col gap-5 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface p-5 shadow-[var(--shadow-workspace-card)] sm:p-6">
          <Input
            label="Search"
            placeholder="Search by title or story…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-workspace-text-muted">Topic</span>
            <div className="flex flex-wrap gap-2">
              {ALL_TOPICS.map((topic, index) => {
                const active = topics.has(topic);
                const accent = (isLight ? TRACK_ACCENTS : TRACK_ACCENTS_DARK)[getTrackAccent(index)];
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setTopics((prev) => toggle(prev, topic))}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
                      active
                        ? `${accent.border} ${accent.soft} ${accent.text}`
                        : "border-transparent bg-workspace-surface-soft text-workspace-text-muted hover:border-workspace-border hover:text-workspace-text"
                    }`}
                  >
                    {SCENARIO_TOPIC_LABEL[topic]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-workspace-text-muted">Difficulty</span>
            <div className="flex flex-wrap gap-2">
              {ALL_DIFFICULTIES.map((d) => {
                const active = difficulties.has(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulties((prev) => toggle(prev, d))}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 transition-colors duration-fast ease-standard ${
                      active
                        ? "border-workspace-accent/50 bg-workspace-accent-soft"
                        : "border-transparent bg-workspace-surface-soft hover:border-workspace-border"
                    }`}
                  >
                    <DifficultyMeter level={d} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface px-6 py-16 text-center shadow-[var(--shadow-workspace-card)]">
            <Search className="size-5 text-workspace-text-subtle" aria-hidden />
            <p className="text-sm text-workspace-text-muted">No problems match these filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                status={progress[scenario.id]?.status ?? "unattempted"}
                entry={progress[scenario.id]}
                isLight={isLight}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * The compact "here's where you stand" readout under the hero —
 * `ReadingRoomJourney`'s `ProgressCard` idea, condensed to a single row
 * since a flat, unordered catalog has no "continue learning" focal point
 * to sit next to (see this file's own header comment on why there's no
 * grouped-track shape here either).
 */
function ProgressStat({
  icon: Icon,
  label,
  current,
  total,
  unit,
  percent,
}: {
  icon: LucideIcon;
  label: string;
  current: number;
  total: number;
  unit: (n: number) => string;
  percent: number;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface p-5 shadow-[var(--shadow-workspace-card)] sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-workspace-accent-soft text-workspace-accent">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wide text-workspace-text-subtle">{label}</p>
          <p className="text-lg font-semibold text-workspace-text">
            {current} / {total} <span className="text-sm font-normal text-workspace-text-muted">{unit(total)}</span>
          </p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-1.5 sm:w-56">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-workspace-surface-soft">
          <div
            className="h-full rounded-full bg-workspace-accent transition-[width] duration-slow ease-standard"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-right font-mono text-[11px] text-workspace-text-muted">{percent}% complete</span>
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario,
  status,
  entry,
  isLight,
}: {
  scenario: Scenario;
  status: ProblemStatus;
  entry: ProblemProgressEntry | undefined;
  isLight: boolean;
}) {
  const primaryTopic = scenario.topics[0];
  const Icon = TOPIC_ICON[primaryTopic];
  const accent = getTopicAccentClasses(primaryTopic, isLight);

  return (
    // A `<div>`, not a `<Link>` — the row needs two independent
    // destinations (plain solve vs. Timed Challenge), and an anchor can't
    // nest another interactive anchor inside it.
    <div
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-workspace-lg)] border border-workspace-border border-l-[3px] bg-workspace-surface p-5 shadow-[var(--shadow-workspace-card)] transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-[var(--shadow-workspace-hover)] sm:flex-row sm:items-start sm:gap-5 ${difficultyBorderColorClass(scenario.difficulty)}`}
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
        <Icon className="size-5" aria-hidden />
      </span>

      <Link
        href={`/workshop?scenario=${scenario.id}`}
        className="flex min-w-0 flex-1 flex-col gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-accent"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-workspace-text">{scenario.title}</h3>
          <Badge variant={STATUS_BADGE_VARIANT[status]} dot={status === "solved"}>
            {STATUS_LABEL[status]}
          </Badge>
          {entry?.underTimeAchieved && <Badge variant="primary">⏱ Beat the clock</Badge>}
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-workspace-text-muted">{scenario.story}</p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <DifficultyMeter level={scenario.difficulty} />
          {scenario.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full border border-workspace-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-workspace-text-subtle"
            >
              {SCENARIO_TOPIC_LABEL[topic]}
            </span>
          ))}
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-2.5">
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/workshop?scenario=${scenario.id}&timed=1`}
            className="flex items-center gap-1 rounded-full border border-workspace-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-workspace-text-subtle transition-colors duration-fast ease-standard hover:border-workspace-accent/50 hover:text-workspace-accent"
            title="Start Timed Challenge"
          >
            <Timer className="size-3.5" aria-hidden />
            Timed
          </Link>
          {scenario.optimalSolution && status !== "unattempted" && (
            <Link
              href={`/problems/${scenario.id}/solution`}
              className="flex items-center gap-1 rounded-full border border-workspace-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-workspace-text-subtle transition-colors duration-fast ease-standard hover:border-workspace-accent/50 hover:text-workspace-accent"
              title="View solution"
            >
              <Lightbulb className="size-3.5" aria-hidden />
              Solution
            </Link>
          )}
        </div>
        <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide sm:inline-flex ${accent.soft} ${accent.text}`}>
          Solve
          <ArrowRight
            className="size-3 shrink-0 transition-transform duration-fast ease-standard group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </div>
  );
}
