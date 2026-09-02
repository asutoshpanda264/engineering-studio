import Link from "next/link";
import type { ReactNode } from "react";
import type { OptimalAnswer } from "@/content/interviewQuestions";

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-text-muted">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-signal" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Subsection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
        {heading}
      </h4>
      {children}
    </div>
  );
}

/**
 * A worked-answer outline, hidden behind a native `<details>` disclosure —
 * same "write your own answer before checking" instinct as
 * `/foundations/[slug]/page.tsx`'s exercise section ("Show the worked
 * answer"), reused here rather than inventing a second reveal pattern.
 */
export function OptimalAnswerSection({ answer }: { answer: OptimalAnswer }) {
  return (
    <details className="group bg-bg-panel p-5">
      <summary className="cursor-pointer font-mono text-xs font-semibold uppercase tracking-wider text-signal transition-colors duration-fast ease-standard hover:text-signal-hover">
        Show the optimal answer outline
      </summary>

      <div className="mt-4 flex flex-col gap-5 border-t border-border pt-4">
        {answer.clarifyingQuestions && answer.clarifyingQuestions.length > 0 && (
          <Subsection heading="Clarify first">
            <List items={answer.clarifyingQuestions} />
          </Subsection>
        )}

        <Subsection heading="Requirements">
          <List items={answer.requirements} />
        </Subsection>

        <Subsection heading="Approach">
          <p className="text-sm leading-relaxed text-text-muted">{answer.approach}</p>
        </Subsection>

        <Subsection heading="Key design points">
          <List items={answer.keyPoints} />
        </Subsection>

        {answer.tradeoffs && answer.tradeoffs.length > 0 && (
          <Subsection heading="Trade-offs to defend">
            <List items={answer.tradeoffs} />
          </Subsection>
        )}

        {answer.followUps && answer.followUps.length > 0 && (
          <Subsection heading="Likely follow-ups">
            <List items={answer.followUps} />
          </Subsection>
        )}

        {answer.relatedLinks && answer.relatedLinks.length > 0 && (
          <Subsection heading="Go deeper">
            <div className="flex flex-wrap gap-2">
              {answer.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:border-signal/50 hover:text-signal"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </Subsection>
        )}
      </div>
    </details>
  );
}
