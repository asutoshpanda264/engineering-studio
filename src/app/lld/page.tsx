import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LLD_LESSONS, LLD_CATEGORY_LABEL } from "@/content/lld";
import type { LLDCategory } from "@/content/lld";

export const metadata: Metadata = {
  title: "Low-Level Design — Engineering Studio",
  description:
    "OOP fundamentals, SOLID, UML, design patterns, and classic case studies (Parking Lot, LRU Cache, Movie Ticket Booking) — the code-level counterpart to the Workshop's architecture decisions.",
};

const CATEGORY_ORDER: LLDCategory[] = ["fundamentals", "patterns", "case-study"];

/**
 * Index of every LLD lesson — the third reading room, alongside
 * `/foundations` (system-design theory) and `/entities` (simulated
 * components). Unlike Foundations' single flat grid, lessons are grouped
 * into the three phases an LLD interview round actually moves through
 * (`LLDCategory`) — 15 lessons in one grid would read as an undifferentiated
 * wall next to Foundations' single continuous course sequence. Same card
 * language as `/foundations` otherwise (corner number tag, hover lift,
 * arrow reveal), so this reads as another issue of the same reference.
 */
export default function LLDIndexPage() {
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
        <Badge variant="primary">Low-Level Design</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          The code inside one box
        </h1>
        <p className="max-w-xl text-balance text-text-muted">
          OOP, SOLID, UML, and the design patterns that keep showing up in real
          interviews — applied to classic case studies like Parking Lot, LRU Cache,
          and Movie Ticket Booking. Read in any order; nothing here is locked.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        {CATEGORY_ORDER.map((category) => {
          const lessons = LLD_LESSONS.filter((lesson) => lesson.category === category);
          if (lessons.length === 0) return null;
          return (
            <div key={category} className="mb-10 last:mb-0">
              <h2 className="mb-4 flex items-baseline gap-3 border-t border-border pt-5 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                {LLD_CATEGORY_LABEL[category]}
                <span className="text-text-subtle">
                  {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lessons.map((lesson) => (
                  <Link
                    key={lesson.slug}
                    href={`/lld/${lesson.slug}`}
                    className="group relative flex h-full flex-col gap-3 border border-border bg-bg-panel p-5 transition-all duration-fast ease-standard hover:-translate-y-1 hover:border-border-hover hover:bg-bg-elevated hover:shadow-dropdown"
                  >
                    <span className="absolute right-3 top-3 font-mono text-[10px] text-text-subtle">
                      {String(lesson.number).padStart(2, "0")}
                    </span>
                    <h3 className="pr-6 font-medium text-text">{lesson.title}</h3>
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
            </div>
          );
        })}
      </section>
    </main>
  );
}
