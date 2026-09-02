"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ExternalLink, Lightbulb, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  INTERVIEW_QUESTIONS,
  INTERVIEW_QUESTION_COMPANIES,
  INTERVIEW_QUESTION_TAGS,
  QUESTION_CATEGORY_LABEL,
  QUESTION_TAG_LABEL,
} from "@/content/interviewQuestions";
import type { QuestionCategory, QuestionTag } from "@/content/interviewQuestions";
import { useAnswerProgress } from "@/lib/interviewAnswerProgress";
import type { AnswerStatus } from "@/lib/interviewAnswerProgress";

const ALL_CATEGORIES = Object.keys(QUESTION_CATEGORY_LABEL) as QuestionCategory[];
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
 */
export default function InterviewQuestionsPage() {
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<QuestionCategory>>(new Set());
  const [tags, setTags] = useState<Set<QuestionTag>>(new Set());
  const [topicsOpen, setTopicsOpen] = useState(false);
  const answerProgress = useAnswerProgress();
  const answeredCount = INTERVIEW_QUESTIONS.filter(
    (q) => answerProgress[q.id]?.markedComplete
  ).length;

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

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <AppHeader
        back={{ href: "/", label: "Engineering Studio" }}
        maxWidthClassName="max-w-5xl"
        right={<ThemeToggle />}
      />

      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-text">Interview Questions</h1>
            <Badge variant={answeredCount > 0 ? "success" : "neutral"}>
              {answeredCount} / {INTERVIEW_QUESTIONS.length} answered
            </Badge>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
            Real, company-tagged questions pulled from public candidate reports and question
            databases — not invented, and not presented as verbatim leaks we can&apos;t back up.
            Every card cites where it came from and how confident that source is.
          </p>
        </div>

        {/* Filters — open toolbar, not a boxed panel (see /problems for the
            same treatment). */}
        <div className="mb-8 flex flex-col gap-5 border-b border-border pb-6">
          <Input
            label="Search"
            placeholder="Search by title, question text, or topic (e.g. “idempotency”, “fanout”)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Company</span>
            <div className="flex flex-wrap gap-2">
              {INTERVIEW_QUESTION_COMPANIES.map((company) => {
                const active = companies.has(company);
                return (
                  <button
                    key={company}
                    type="button"
                    onClick={() => setCompanies((prev) => toggle(prev, company))}
                    aria-pressed={active}
                    className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
                      active
                        ? "border-signal/50 bg-signal/10 text-signal"
                        : "border-transparent bg-bg-elevated text-text-muted hover:border-border hover:text-text"
                    }`}
                  >
                    {company}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Category</span>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((category) => {
                const active = categories.has(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategories((prev) => toggle(prev, category))}
                    aria-pressed={active}
                    className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
                      active
                        ? "border-signal/50 bg-signal/10 text-signal"
                        : "border-transparent bg-bg-elevated text-text-muted hover:border-border hover:text-text"
                    }`}
                  >
                    {QUESTION_CATEGORY_LABEL[category]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-5">
            <button
              type="button"
              onClick={() => setTopicsOpen((open) => !open)}
              aria-expanded={topicsOpen}
              className="flex items-center gap-2 self-start text-xs font-medium uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-text"
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
                      className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
                        active
                          ? "border-signal/50 bg-signal/10 text-signal"
                          : "border-transparent bg-bg-elevated text-text-muted hover:border-border hover:text-text"
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
                      className="border border-signal/50 bg-signal/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-signal transition-colors duration-fast ease-standard"
                    >
                      {QUESTION_TAG_LABEL[tag]} ×
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border border-border bg-bg-panel px-6 py-16 text-center">
            <Search className="size-5 text-text-subtle" aria-hidden />
            <p className="text-sm text-text-muted">No questions match these filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((question) => {
              const entry = answerProgress[question.id];
              const status: AnswerStatus = entry?.markedComplete ? "answered" : "unattempted";
              return (
                // A `<div>`, not an `<article>`-as-link — the source citation
                // needs its own destination outside the card's main link, and
                // an anchor can't nest another interactive anchor inside it
                // (same reasoning as `/problems/page.tsx`'s row wrapper).
                <div
                  key={question.id}
                  className="group flex flex-col gap-3 border-l-[3px] border-signal/40 bg-bg-panel p-5 transition-colors duration-fast ease-standard hover:bg-bg-hover"
                >
                  <Link
                    href={`/interview-questions/${question.id}`}
                    className="flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary">{question.company}</Badge>
                      <Badge variant="neutral">{QUESTION_CATEGORY_LABEL[question.category]}</Badge>
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
                        <h3 className="text-base font-semibold text-text">{question.title}</h3>
                        <p className="text-sm leading-relaxed text-text-muted">{question.prompt}</p>
                      </div>
                      <ArrowRight
                        className="mt-1 hidden size-4 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100 sm:block"
                        aria-hidden
                      />
                    </div>

                    {question.context && (
                      <p className="border-l-2 border-border pl-3 text-xs leading-relaxed text-text-subtle">
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

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
                    <a
                      href={question.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 transition-colors duration-fast ease-standard hover:text-signal"
                    >
                      Source: {question.source.name}
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                    {question.source.reportedDate && <span>Reported {question.source.reportedDate}</span>}
                    {question.source.note && (
                      <span className="normal-case tracking-normal text-text-subtle/80">
                        {question.source.note}
                      </span>
                    )}
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
