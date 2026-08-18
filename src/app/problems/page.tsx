"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lightbulb, Search, Timer } from "lucide-react";
import { LinkButton } from "@/components/ui/LinkButton";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SCENARIOS, SCENARIO_TOPIC_LABEL } from "@/scenarios";
import type { ScenarioTopic } from "@/scenarios";
import { difficultyBorderColorClass, difficultyColorClass, difficultyMeter } from "@/lib/difficultyDisplay";
import { useProblemProgress } from "@/lib/problemProgress";
import type { ProblemStatus } from "@/lib/problemProgress";

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
 * the Workshop's `ScenariosMenu` dropdown (neither of which scales past a
 * handful of scenarios or supports narrowing by topic). Every row deep-
 * links into `/workshop?scenario=<id>` via the existing `ScenarioDeepLink`
 * (`src/app/workshop/page.tsx`) — no changes needed there.
 *
 * Status badges are wired to `src/lib/problemProgress.ts`'s localStorage
 * read once that module lands (see docs/wiggly-brewing-lamport plan §6) —
 * every row shows "Unattempted" until then, which is also the correct
 * cold-start state for a first-time visitor.
 */
export default function ProblemsPage() {
  const [query, setQuery] = useState("");
  const [topics, setTopics] = useState<Set<ScenarioTopic>>(new Set());
  const [difficulties, setDifficulties] = useState<Set<number>>(new Set());
  const progress = useProblemProgress();
  const solvedCount = SCENARIOS.filter((s) => progress[s.id]?.status === "solved").length;

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

      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-text">Problems</h1>
            <Badge variant={solvedCount > 0 ? "success" : "neutral"}>
              {solvedCount} / {SCENARIOS.length} solved
            </Badge>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
            {SCENARIOS.length} architecture problems, topic- and difficulty-tagged. Each one hands
            you a business problem and a blank canvas — design an architecture, run the
            simulation, and see whether it holds up under load and budget.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-5 border border-border bg-bg-panel p-5">
          <Input
            label="Search"
            placeholder="Search by title or story…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Topic</span>
            <div className="flex flex-wrap gap-2">
              {ALL_TOPICS.map((topic) => {
                const active = topics.has(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setTopics((prev) => toggle(prev, topic))}
                    aria-pressed={active}
                    className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
                      active
                        ? "border-signal/50 bg-signal/10 text-signal"
                        : "border-border text-text-muted hover:border-border-hover hover:text-text"
                    }`}
                  >
                    {SCENARIO_TOPIC_LABEL[topic]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Difficulty</span>
            <div className="flex flex-wrap gap-2">
              {ALL_DIFFICULTIES.map((d) => {
                const active = difficulties.has(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulties((prev) => toggle(prev, d))}
                    aria-pressed={active}
                    className={`border px-3 py-1.5 font-mono text-[11px] tracking-wide transition-colors duration-fast ease-standard ${
                      active
                        ? "border-signal/50 bg-signal/10 text-signal"
                        : `border-border ${difficultyColorClass(d)} hover:border-border-hover`
                    }`}
                  >
                    {difficultyMeter(d)} {d}/5
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border border-border bg-bg-panel px-6 py-16 text-center">
            <Search className="size-5 text-text-subtle" aria-hidden />
            <p className="text-sm text-text-muted">No problems match these filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((scenario) => {
              const status = progress[scenario.id]?.status ?? "unattempted";
              return (
                // A `<div>`, not a `<Link>` — the row needs two independent
                // destinations (plain solve vs. Timed Challenge), and an
                // anchor can't nest another interactive anchor inside it.
                <div
                  key={scenario.id}
                  className={`group flex flex-col gap-3 border border-l-[3px] border-border bg-bg-panel p-5 transition-all duration-fast ease-standard hover:border-border-hover hover:bg-bg-elevated hover:shadow-dropdown sm:flex-row sm:items-start sm:justify-between sm:gap-6 ${difficultyBorderColorClass(scenario.difficulty)}`}
                >
                  <Link
                    href={`/workshop?scenario=${scenario.id}`}
                    className="flex min-w-0 flex-1 flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-text">{scenario.title}</h3>
                      <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                      {progress[scenario.id]?.underTimeAchieved && (
                        <Badge variant="primary">⏱ Beat the clock</Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">
                      {scenario.story}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <p
                        className={`font-mono text-[11px] tracking-wide ${difficultyColorClass(scenario.difficulty)}`}
                      >
                        {difficultyMeter(scenario.difficulty)} {scenario.difficulty}/5
                      </p>
                      {scenario.topics.map((topic) => (
                        <span
                          key={topic}
                          className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-subtle"
                        >
                          {SCENARIO_TOPIC_LABEL[topic]}
                        </span>
                      ))}
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/workshop?scenario=${scenario.id}&timed=1`}
                        className="flex items-center gap-1 border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-text-subtle transition-colors duration-fast ease-standard hover:border-signal/50 hover:text-signal"
                        title="Start Timed Challenge"
                      >
                        <Timer className="size-3.5" aria-hidden />
                        Timed
                      </Link>
                      {scenario.optimalSolution && status !== "unattempted" && (
                        <Link
                          href={`/problems/${scenario.id}/solution`}
                          className="flex items-center gap-1 border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-text-subtle transition-colors duration-fast ease-standard hover:border-signal/50 hover:text-signal"
                          title="View solution"
                        >
                          <Lightbulb className="size-3.5" aria-hidden />
                          Solution
                        </Link>
                      )}
                    </div>
                    <ArrowRight
                      className="hidden size-4 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100 sm:block"
                      aria-hidden
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
