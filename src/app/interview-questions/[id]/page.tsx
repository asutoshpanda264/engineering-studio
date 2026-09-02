import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AnswerWorkspace } from "@/components/interviewQuestions/AnswerWorkspace";
import { OptimalAnswerSection } from "@/components/interviewQuestions/OptimalAnswerSection";
import {
  INTERVIEW_QUESTIONS,
  QUESTION_CATEGORY_LABEL,
  QUESTION_TAG_LABEL,
  getInterviewQuestion,
  getRelatedQuestions,
} from "@/content/interviewQuestions";

export function generateStaticParams() {
  return INTERVIEW_QUESTIONS.map((q) => ({ id: q.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const question = getInterviewQuestion(id);
  if (!question) return {};
  return {
    title: `${question.title} — ${question.company} — Engineering Studio`,
    description: question.prompt,
  };
}

export default async function InterviewQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = getInterviewQuestion(id);
  if (!question) notFound();
  const related = getRelatedQuestions(question);

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <AppHeader
        back={{ href: "/interview-questions", label: "Interview Questions" }}
        maxWidthClassName="max-w-3xl"
        right={<ThemeToggle />}
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">{question.company}</Badge>
            <Badge variant="neutral">{QUESTION_CATEGORY_LABEL[question.category]}</Badge>
            {question.level && <Badge variant="neutral">{question.level}</Badge>}
            <Badge variant={question.source.confidence === "high" ? "success" : "warning"}>
              {question.source.confidence === "high" ? "Verified" : "Reported"}
            </Badge>
            {question.tags.map((tag) => (
              <Badge key={tag} variant="neutral">
                {QUESTION_TAG_LABEL[tag]}
              </Badge>
            ))}
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {question.title}
          </h1>

          <p className="text-base leading-relaxed text-text">{question.prompt}</p>

          {question.context && (
            <p className="border-l-2 border-border pl-4 text-sm leading-relaxed text-text-muted">
              {question.context}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
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

        {related.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border pt-6">
            <h2 className="text-sm font-medium text-text">
              Same pattern, asked elsewhere
            </h2>
            <div className="flex flex-col gap-2">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/interview-questions/${r.id}`}
                  className="flex flex-wrap items-center gap-2 text-sm text-text-muted transition-colors duration-fast ease-standard hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  <Badge variant="primary">{r.company}</Badge>
                  <span>{r.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {question.optimalAnswer ? (
          <OptimalAnswerSection answer={question.optimalAnswer} />
        ) : (
          <p className="text-center text-xs text-text-subtle">
            No worked &ldquo;optimal answer&rdquo; is published for this question yet. If this question
            maps to a distributed-systems pattern, the{" "}
            <Link href="/foundations" className="text-signal hover:underline">
              Foundations
            </Link>{" "}
            course and the{" "}
            <Link href="/workshop" className="text-signal hover:underline">
              Workshop
            </Link>{" "}
            are the place to actually build and simulate it.
          </p>
        )}

        <AnswerWorkspace questionId={question.id} />
      </div>
    </main>
  );
}
