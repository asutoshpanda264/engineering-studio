import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Hammer, Repeat, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/landing/Reveal";
import { HeroDiagram } from "@/components/landing/HeroDiagram";
import { SCENARIOS } from "@/scenarios";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { slugFromEntityType } from "@/lib/entityDeepDive";

const GITHUB_URL = "https://github.com/asutoshpanda264/engineering-studio";

/** lucide-react dropped brand marks (trademark reasons) — GitHub's own mark, inlined. */
function GitHubIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.73 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.23 2.76.12 3.05.73.81 1.18 1.83 1.18 3.09 0 4.41-2.7 5.39-5.26 5.67.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.2.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

const LINK_BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const LINK_BUTTON_PRIMARY = "h-10 px-5 bg-primary text-white hover:bg-primary-hover active:bg-primary-active";
const LINK_BUTTON_SECONDARY =
  "h-10 px-5 bg-bg-elevated text-text border border-border hover:border-border-hover hover:bg-bg-panel";

function LinkButton({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "secondary";
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${LINK_BUTTON_BASE} ${variant === "primary" ? LINK_BUTTON_PRIMARY : LINK_BUTTON_SECONDARY}`}
    >
      {children}
    </Link>
  );
}

const PROCESS_STEPS = [
  {
    icon: Hammer,
    title: "Build",
    body: "Nothing here is irreversible. Drag components onto the canvas, wire them together, and try an idea faster than you could describe it.",
  },
  {
    icon: Search,
    title: "Observe",
    body: "Run a simulation and watch what actually happens — not a scripted animation, a real discrete-event computation of your architecture under load.",
  },
  {
    icon: Repeat,
    title: "Iterate",
    body: "Change one thing. Run it again. Distributed systems intuition is built by watching consequences, not by reading about them.",
  },
];

const PRINCIPLES = [
  "We build systems that help people think like engineers.",
  "Instead of saying “use a cache,” it asks: what happens if you don’t?",
  "Failure is expected here. An overloaded database is valuable — every failure teaches something.",
];

function difficultyStars(difficulty: number): string {
  return "★".repeat(difficulty) + "☆".repeat(5 - difficulty);
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold text-text">Engineering Studio</span>
          <div className="flex items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-text-muted transition-colors duration-fast ease-standard hover:text-text"
              aria-label="View source on GitHub"
            >
              <GitHubIcon className="size-5" />
            </a>
            <LinkButton href="/workshop" variant="secondary">
              Enter Workshop
            </LinkButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pb-16 pt-20 text-center sm:pt-28">
        <Badge variant="primary">An educational sandbox, not a production tool</Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          Build. Simulate. Break. Learn.
        </h1>
        <p className="max-w-2xl text-balance text-lg text-text-muted">
          Design distributed systems visually, run a real discrete-event simulation against
          them, and watch your architecture succeed or collapse under load — no lecture,
          just consequences.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <LinkButton href="/workshop">
            Enter Workshop
            <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
          <LinkButton href="#scenarios" variant="secondary">
            Browse Scenarios
          </LinkButton>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <div className="rounded-xl border border-border bg-bg-elevated p-6 shadow-elevated sm:p-8">
          <HeroDiagram />
        </div>
      </section>

      {/* Process */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <Reveal>
          <h2 className="text-center text-sm font-medium uppercase tracking-wide text-text-subtle">
            How it works
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PROCESS_STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1}>
              <div className="flex h-full flex-col gap-3 rounded-lg border border-border bg-bg-panel p-5">
                <step.icon className="size-5 text-primary" aria-hidden />
                <h3 className="text-sm font-semibold text-text">{step.title}</h3>
                <p className="text-sm text-text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="border-y border-border bg-bg-elevated py-20">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6">
          {PRINCIPLES.map((line, i) => (
            <Reveal key={line} delay={i * 0.08}>
              <p className="text-balance text-center text-xl font-medium leading-snug text-text sm:text-2xl">
                {line}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Scenarios */}
      <section id="scenarios" className="mx-auto w-full max-w-5xl scroll-mt-14 px-6 py-24">
        <Reveal>
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <h2 className="text-2xl font-semibold text-text">Pick a problem to solve</h2>
            <p className="max-w-xl text-sm text-text-muted">
              Every scenario hands you an intentionally imperfect architecture and a business
              problem, not a technical one. Your job is to figure out why it&apos;s failing.
            </p>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-3">
          {SCENARIOS.map((scenario, i) => (
            <Reveal key={scenario.id} delay={i * 0.1}>
              <Link
                href={`/workshop?scenario=${scenario.id}`}
                className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-bg-panel p-5 transition-colors duration-fast ease-standard hover:border-border-hover hover:bg-bg-elevated"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-text">{scenario.title}</h3>
                  <ArrowRight
                    className="size-4 shrink-0 text-text-subtle transition-transform duration-fast ease-standard group-hover:translate-x-0.5 group-hover:text-text"
                    aria-hidden
                  />
                </div>
                <p className="text-[11px] text-text-subtle">{difficultyStars(scenario.difficulty)}</p>
                <p className="line-clamp-3 text-sm text-text-muted">{scenario.story}</p>
                <p className="mt-auto pt-2 text-[11px] text-text-subtle">
                  {scenario.constraints.length} success criteria
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Entities */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <Reveal>
          <p className="mb-6 text-center text-sm text-text-muted">
            Every one of these is a real, simulated component — not a static icon.{" "}
            <Link href="/entities" className="text-primary hover:underline">
              Read what each one does →
            </Link>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {ENTITY_CATALOG.map((item) =>
              item.implemented ? (
                <Link
                  key={item.type}
                  href={`/entities/${slugFromEntityType(item.type)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-panel px-3 py-1.5 text-xs text-text-muted transition-colors duration-fast ease-standard hover:border-border-hover hover:text-text"
                >
                  <item.icon className="size-3.5" aria-hidden />
                  {item.name}
                </Link>
              ) : (
                <span
                  key={item.type}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-panel px-3 py-1.5 text-xs text-text-muted opacity-50"
                >
                  <item.icon className="size-3.5" aria-hidden />
                  {item.name}
                  <Badge variant="neutral">Soon</Badge>
                </span>
              )
            )}
          </div>
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-bg-elevated py-20">
        <Reveal className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 px-6 text-center">
          <h2 className="text-2xl font-semibold text-text sm:text-3xl">
            Ready to break something on purpose?
          </h2>
          <LinkButton href="/workshop">
            Enter Workshop
            <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        </Reveal>
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-xs text-text-subtle sm:flex-row">
          <span>Engineering Studio — Build. Simulate. Break. Learn.</span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-text-muted">
            View source on GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
