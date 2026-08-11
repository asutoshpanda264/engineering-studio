import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { FOUNDATION_LESSONS } from "@/content/foundations";

export const metadata: Metadata = {
  title: "Foundations — Engineering Studio",
  description:
    "Core system-design theory — the internet, DNS, HTTP, databases, caching, queues — the vocabulary the Workshop and entity reference assume you already have.",
};

/**
 * Index of every Foundations lesson — the theory layer, separate from
 * `/entities` (the simulated, draggable components). Free-browse, same as
 * `/entities`: cards in course order, no lesson locked behind a prior one.
 *
 * Same "Trace" component language as `/entities` — down to the card shape
 * (corner number tag, hover lift, arrow reveal) — so this reads as another
 * issue of the same reference, not a different product bolted on. No
 * scroll-triggered fade-in, same as everywhere else.
 */
export default function FoundationsIndexPage() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/learn"
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Learn
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LinkButton href="/workshop" variant="secondary" size="sm" className="bg-bg-elevated">
              Enter Workshop
            </LinkButton>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-12 pt-16 text-center sm:pt-20">
        <Badge variant="primary">Phase 1 — Foundations</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          The theory underneath the Workshop
        </h1>
        <p className="max-w-xl text-balance text-text-muted">
          How the internet, DNS, HTTP, databases, caching, and queues actually work —
          the vocabulary every entity in the Workshop already assumes. Read in any
          order; nothing here is locked.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FOUNDATION_LESSONS.map((lesson) => (
            <Link
              key={lesson.slug}
              href={`/foundations/${lesson.slug}`}
              className="group relative flex h-full flex-col gap-3 border border-border bg-bg-panel p-5 transition-all duration-fast ease-standard hover:-translate-y-1 hover:border-border-hover hover:bg-bg-elevated hover:shadow-dropdown"
            >
              <span className="absolute right-3 top-3 font-mono text-[10px] text-text-subtle">
                {String(lesson.number).padStart(2, "0")}
              </span>
              <h2 className="pr-6 font-medium text-text">{lesson.title}</h2>
              <p className="text-sm text-text-muted">{lesson.tagline}</p>
              <p className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
                <Clock className="size-3" aria-hidden />
                {lesson.estimatedMinutes} min
                <ArrowRight
                  className="ml-auto size-3.5 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
