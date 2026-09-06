"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Brain,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  Network,
  Puzzle,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getTrackAccent, TRACK_ACCENTS, TRACK_ACCENTS_DARK } from "@/components/foundations/trackAccent";
import type { TrackAccentClasses } from "@/components/foundations/trackAccent";
import { ReadingRoomBadge } from "@/components/readingRoom/ReadingRoomBadge";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";
import {
  INTERVIEW_QUESTIONS,
  INTERVIEW_QUESTION_COMPANIES,
  INTERVIEW_QUESTION_TAGS,
  QUESTION_CATEGORY_LABEL,
  QUESTION_TAG_LABEL,
} from "@/content/interviewQuestions";
import type { InterviewQuestion, QuestionCategory, QuestionTag } from "@/content/interviewQuestions";
import { useAnswerProgress } from "@/lib/interviewAnswerProgress";
import type { AnswerStatus } from "@/lib/interviewAnswerProgress";

// Same five-category order `QUESTION_CATEGORY_LABEL` is declared in —
// grouping the list into named sections by this field (rather than
// leaving it flat, unlike `/problems`) works here specifically because
// `category` is singular per question, the same "one bucket, evenly
// partitions the catalog" shape `LLD_CATEGORY_LABEL`/`CaseStudyCategory`
// group their own reading rooms by.
const CATEGORY_ORDER: QuestionCategory[] = [
  "system-design",
  "ml-ai-system-design",
  "lld-ood",
  "fde-agentic",
  "scenario-operational",
];

const CATEGORY_ICON: Record<QuestionCategory, LucideIcon> = {
  "system-design": Network,
  "ml-ai-system-design": Brain,
  "lld-ood": Puzzle,
  "fde-agentic": Bot,
  "scenario-operational": ClipboardList,
};

const CATEGORY_DESCRIPTION: Record<QuestionCategory, string> = {
  "system-design": "Classic large-scale design rounds — scale, storage, and tradeoffs under real constraints.",
  "ml-ai-system-design": "ML/AI-flavored design rounds — retrieval, ranking, and serving pipelines at scale.",
  "lld-ood": "Object-oriented design rounds — class boundaries, extensibility, and clean interfaces.",
  "fde-agentic": "Forward-deployed and agentic rounds — tool use, orchestration, and reliability.",
  "scenario-operational": "Operational and behavioral prompts — incidents, rollouts, and judgment calls.",
};

// Most-populous tags first — puts the patterns that actually repeat
// across companies (what this filter is for) ahead of the long tail.
const ALL_TAGS = [...INTERVIEW_QUESTION_TAGS].sort((a, b) => {
  const countOf = (tag: QuestionTag) =>
    INTERVIEW_QUESTIONS.filter((q) => q.tags.includes(tag)).length;
  return countOf(b) - countOf(a) || QUESTION_TAG_LABEL[a].localeCompare(QUESTION_TAG_LABEL[b]);
});

const STATUS_LABEL: Record<AnswerStatus, string> = {
  unattempted: "Unattempted",
  answered: "Answered",
};

const STATUS_BADGE_VARIANT: Record<AnswerStatus, "neutral" | "success"> = {
  unattempted: "neutral",
  answered: "success",
};

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Real, sourced interview questions, company-tagged — a companion to
 * `/problems`'s original scenarios rather than a replacement for it.
 * Every question here cites a real source (see each card's "Source"
 * link); nothing is presented as a verbatim leak we can't back up.
 * See `docs/interview_exp.md` for the research process, and its
 * "Explicitly excluded" notes for what got left out and why.
 *
 * Re-skinned onto `/learn`'s reading-room language — `workspace-*`
 * tokens, elevated cards, and grouped "track" sections keyed by
 * `category` (see `CATEGORY_ORDER` above) with a `ReadingRoomBadge` icon
 * per section, the same shape `ReadingRoomJourney`'s `TrackSection` uses.
 * The search/company/category/tag toolbar stays a flat filter above the
 * sections rather than moving inside any one of them — it narrows across
 * every section at once.
 */
export default function InterviewQuestionsPage() {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<QuestionCategory>>(new Set());
  const [tags, setTags] = useState<Set<QuestionTag>>(new Set());
  const [topicsOpen, setTopicsOpen] = useState(false);
  const answerProgress = useAnswerProgress();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const answeredCount = INTERVIEW_QUESTIONS.filter(
    (q) => answerProgress[q.id]?.markedComplete
  ).length;
  const answeredPercent = Math.round((answeredCount / INTERVIEW_QUESTIONS.length) * 100);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTERVIEW_QUESTIONS.filter((question) => {
      if (
        q &&
        !question.title.toLowerCase().includes(q) &&
        !question.prompt.toLowerCase().includes(q) &&
        !question.tags.some((t) => QUESTION_TAG_LABEL[t].toLowerCase().includes(q))
      ) {
        return false;
      }
      if (companies.size > 0 && !companies.has(question.company)) return false;
      if (categories.size > 0 && !categories.has(question.category)) return false;
      if (tags.size > 0 && !question.tags.some((t) => tags.has(t))) return false;
      return true;
    });
  }, [query, companies, categories, tags]);

  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: filtered.filter((q) => q.category === category),
      })).filter((group) => group.items.length > 0),
    [filtered]
  );

  return (
    <main className="relative isolate flex min-h-screen flex-col bg-workspace-bg">
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
        right={<ThemeToggle />}
      />

      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-10 pt-16 text-center sm:pt-20">
        <Badge variant="primary" className="!border-workspace-accent/50 !bg-workspace-accent/10 !text-workspace-accent">
          {INTERVIEW_QUESTIONS.length} questions
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-workspace-text sm:text-4xl">
          Real questions, real companies
        </h1>
        <p className="max-w-2xl text-balance text-workspace-text-muted">
          Real, company-tagged questions pulled from public candidate reports and question
          databases — not invented, and not presented as verbatim leaks we can&apos;t back up.
          Every card cites where it came from and how confident that source is.
        </p>
      </section>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-16">
        <div className="flex flex-col gap-4 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface p-5 shadow-[var(--shadow-workspace-card)] sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-workspace-accent-soft text-workspace-accent">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-workspace-text-subtle">Your progress</p>
              <p className="text-lg font-semibold text-workspace-text">
                {answeredCount} / {INTERVIEW_QUESTIONS.length}{" "}
                <span className="text-sm font-normal text-workspace-text-muted">answered</span>
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:w-56">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-workspace-surface-soft">
              <div
                className="h-full rounded-full bg-workspace-accent transition-[width] duration-slow ease-standard"
                style={{ width: `${answeredPercent}%` }}
              />
            </div>
            <span className="text-right font-mono text-[11px] text-workspace-text-muted">{answeredPercent}% complete</span>
          </div>
        </div>

        {/* Filters — one bordered surface, sub-groups separated by labels
            and spacing rather than a box each. */}
        <div className="flex flex-col gap-5 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface p-5 shadow-[var(--shadow-workspace-card)] sm:p-6">
          <Input
            label="Search"
            placeholder="Search by title, question text, or topic (e.g. “idempotency”, “fanout”)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-workspace-text-muted">Company</span>
            <div className="flex flex-wrap gap-2">
              {INTERVIEW_QUESTION_COMPANIES.map((company) => {
                const active = companies.has(company);
                return (
                  <button
                    key={company}
                    type="button"
                    onClick={() => setCompanies((prev) => toggle(prev, company))}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
                      active
                        ? "border-workspace-accent/50 bg-workspace-accent-soft text-workspace-accent"
                        : "border-transparent bg-workspace-surface-soft text-workspace-text-muted hover:border-workspace-border hover:text-workspace-text"
                    }`}
                  >
                    {company}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-workspace-text-muted">Category</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER.map((category, index) => {
                const active = categories.has(category);
                const accent = (isLight ? TRACK_ACCENTS : TRACK_ACCENTS_DARK)[getTrackAccent(index)];
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategories((prev) => toggle(prev, category))}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
                      active
                        ? `${accent.border} ${accent.soft} ${accent.text}`
                        : "border-transparent bg-workspace-surface-soft text-workspace-text-muted hover:border-workspace-border hover:text-workspace-text"
                    }`}
                  >
                    {QUESTION_CATEGORY_LABEL[category]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-workspace-border pt-5">
            <button
              type="button"
              onClick={() => setTopicsOpen((open) => !open)}
              aria-expanded={topicsOpen}
              className="flex items-center gap-2 self-start text-xs font-medium uppercase tracking-wide text-workspace-text-muted transition-colors duration-fast ease-standard hover:text-workspace-text"
            >
              <ChevronDown
                className={`size-3.5 transition-transform duration-fast ease-standard ${topicsOpen ? "rotate-0" : "-rotate-90"}`}
                aria-hidden
              />
              Topic — the pattern being tested, shared across companies
              {tags.size > 0 && <Badge variant="primary">{tags.size}</Badge>}
            </button>

            {topicsOpen ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {ALL_TAGS.map((tag) => {
                  const active = tags.has(tag);
                  const count = INTERVIEW_QUESTIONS.filter((q) => q.tags.includes(tag)).length;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags((prev) => toggle(prev, tag))}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
                        active
                          ? "border-workspace-accent/50 bg-workspace-accent-soft text-workspace-accent"
                          : "border-transparent bg-workspace-surface-soft text-workspace-text-muted hover:border-workspace-border hover:text-workspace-text"
                      }`}
                    >
                      {QUESTION_TAG_LABEL[tag]} ({count})
                    </button>
                  );
                })}
              </div>
            ) : (
              tags.size > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {[...tags].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags((prev) => toggle(prev, tag))}
                      className="rounded-full border border-workspace-accent/50 bg-workspace-accent-soft px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-workspace-accent transition-colors duration-fast ease-standard"
                    >
                      {QUESTION_TAG_LABEL[tag]} ×
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Sections — one per category, grouped the same way LLD/Case
            Studies group their own tracks (see this file's header
            comment). Empty categories (fully filtered out) just don't
            render, same as those pages' own `groups.filter(...)`. */}
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface px-6 py-16 text-center shadow-[var(--shadow-workspace-card)]">
            <Search className="size-5 text-workspace-text-subtle" aria-hidden />
            <p className="text-sm text-workspace-text-muted">No questions match these filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map(({ category, items }, index) => (
              <CategorySection
                key={category}
                category={category}
                items={items}
                accent={(isLight ? TRACK_ACCENTS : TRACK_ACCENTS_DARK)[getTrackAccent(CATEGORY_ORDER.indexOf(category))]}
                answerProgress={answerProgress}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CategorySection({
  category,
  items,
  accent,
  answerProgress,
  index,
}: {
  category: QuestionCategory;
  items: InterviewQuestion[];
  accent: TrackAccentClasses;
  answerProgress: ReturnType<typeof useAnswerProgress>;
  index: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-workspace-lg)] border border-workspace-border bg-workspace-surface-soft/60 p-5 shadow-[var(--shadow-workspace-card)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-workspace-border pb-4">
        <div className="flex items-center gap-4">
          <ReadingRoomBadge icon={CATEGORY_ICON[category]} accent={accent} />
          <div>
            <span
              className={`inline-flex items-center rounded-md border border-white/25 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm ${accent.solid}`}
            >
              {`Track ${String(index + 1).padStart(2, "0")}`}
            </span>
            <h2 className="mt-1.5 text-lg font-semibold text-workspace-text">{QUESTION_CATEGORY_LABEL[category]}</h2>
          </div>
        </div>
        <p className="max-w-sm text-xs text-workspace-text-subtle sm:text-right">{CATEGORY_DESCRIPTION[category]}</p>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            accent={accent}
            status={answerProgress[question.id]?.markedComplete ? "answered" : "unattempted"}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  accent,
  status,
}: {
  question: InterviewQuestion;
  accent: TrackAccentClasses;
  status: AnswerStatus;
}) {
  return (
    // A `<div>`, not an `<article>`-as-link — the source citation needs
    // its own destination outside the card's main link, and an anchor
    // can't nest another interactive anchor inside it (same reasoning as
    // `/problems/page.tsx`'s row wrapper).
    <div
      className={`group flex flex-col gap-3 overflow-hidden rounded-[var(--radius-workspace)] border border-workspace-border border-l-[3px] bg-workspace-surface p-5 transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-[var(--shadow-workspace-hover)] ${accent.borderFaint}`}
    >
      <Link
        href={`/interview-questions/${question.id}`}
        className="flex flex-col gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-workspace-accent"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{question.company}</Badge>
          {question.level && <Badge variant="neutral">{question.level}</Badge>}
          <Badge variant={question.source.confidence === "high" ? "success" : "warning"}>
            {question.source.confidence === "high" ? "Verified" : "Reported"}
          </Badge>
          <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
          {question.optimalAnswer && (
            <Badge variant="primary">
              <Lightbulb className="size-3" aria-hidden />
              Answer guide
            </Badge>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-workspace-text">{question.title}</h3>
            <p className="text-sm leading-relaxed text-workspace-text-muted">{question.prompt}</p>
          </div>
          <ArrowRight
            className="mt-1 hidden size-4 shrink-0 text-workspace-accent opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100 sm:block"
            aria-hidden
          />
        </div>

        {question.context && (
          <p className="border-l-2 border-workspace-border pl-3 text-xs leading-relaxed text-workspace-text-subtle">
            {question.context}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {question.tags.map((tag) => (
            <Badge key={tag} variant="neutral">
              {QUESTION_TAG_LABEL[tag]}
            </Badge>
          ))}
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wide text-workspace-text-subtle">
        <a
          href={question.source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 transition-colors duration-fast ease-standard hover:text-workspace-accent"
        >
          Source: {question.source.name}
          <ExternalLink className="size-3" aria-hidden />
        </a>
        {question.source.reportedDate && <span>Reported {question.source.reportedDate}</span>}
        {question.source.note && (
          <span className="normal-case tracking-normal text-workspace-text-subtle/80">
            {question.source.note}
          </span>
        )}
      </div>
    </div>
  );
}
