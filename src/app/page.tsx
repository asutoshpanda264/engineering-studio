import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Building2, Compass, Hammer, ListChecks, Repeat, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { HeroDiagram } from "@/components/landing/HeroDiagram";
import { Reveal } from "@/components/landing/Reveal";
import { SCENARIOS } from "@/scenarios";
import { DifficultyMeter } from "@/components/ui/DifficultyMeter";
import { CardCorners } from "@/components/ui/Card";
import { truncateAtWord } from "@/lib/truncateText";

// Generous enough to still read as a real excerpt at every breakpoint this
// grid uses (`sm:grid-cols-2` through `lg:grid-cols-4`) while comfortably
// fitting the 3-line clamp below even at the narrowest (4-column) card
// width — see `truncateAtWord`'s own doc comment for why this replaces
// relying on `line-clamp-3`'s own cut.
const SCENARIO_STORY_MAX_CHARS = 150;

const GITHUB_URL = "https://github.com/asutoshpanda264/engineering-studio";

/** lucide-react dropped brand marks (trademark reasons) — GitHub's own mark, inlined. */
function GitHubIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.73 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.23 2.76.12 3.05.73.81 1.18 1.83 1.18 3.09 0 4.41-2.7 5.39-5.26 5.67.41.36.78 1.07.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.2.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

/*
 * "Trace" component language for this page:
 *  - Tag        — mono, uppercase, bracketed. Eyebrows, kickers, reference marks.
 *  - Specimen   — hairline-bordered block with a corner reference tag, replaces
 *                 the rounded/shadowed card everywhere on this page.
 *  - LinkButton (components/ui/LinkButton.tsx) — the one primary-action
 *    treatment in the product, shared by every page rather than each
 *    hand-rolling its own CTA classes.
 * No section on this page fades in on mount/scroll under the dark theme —
 * content is visible the instant it paints; motion is reserved for
 * hover/press states only. Paper (the light theme, see globals.css) is the
 * one deliberate exception: its `<Reveal>`-wrapped sections fade+rise in as
 * they enter the viewport. That CSS only exists under `data-theme="light"`
 * (see `.landing-reveal`), so dark keeps the instant-paint rule above
 * exactly as written.
 */

/**
 * One of the header's four nav links (Tutorial/Learn/Problems/Interviews).
 * The label collapses to icon-only below `lg` (1024px) — this row plus the
 * brand mark, theme toggle, GitHub link, and "Enter Workshop" CTA needed
 * ~820px with no breakpoints at all to avoid overflowing; collapsing these
 * four labels first (they're the most repetitive part — an icon + tooltip
 * carries the same information) gives the header an actual defined point
 * where it degrades on purpose instead of just running out of room.
 * `aria-label` keeps the accessible name intact even while the visible
 * text is hidden.
 */
function NavLink({ href, icon: Icon, label }: { href: string; icon: typeof Compass; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
      {children}
    </span>
  );
}

function Kicker({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-subtle">
      {index && <span className="text-signal">{index}</span>}
      <span>{children}</span>
    </div>
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

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <AppHeader
        maxWidthClassName="max-w-7xl"
        left={
          <span className="shrink-0 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-text">
            Engineering Studio
          </span>
        }
        right={
          <>
            <NavLink href="/tutorial" icon={Compass} label="Tutorial" />
            <NavLink href="/learn" icon={BookOpen} label="Learn" />
            <NavLink href="/problems" icon={ListChecks} label="Problems" />
            <NavLink href="/interview-questions" icon={Building2} label="Interviews" />
            <ThemeToggle />
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
          </>
        }
      />

      {/* Hero — full-width outer wrapper so Paper's glow (see globals.css's
          --landing-glow, a no-op under the dark theme) can bleed edge to
          edge behind the still text-centered, readable-width content. */}
      <section className="relative w-full overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
          style={{ backgroundImage: "var(--landing-glow)" }}
        />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 pb-16 pt-20 text-center sm:pt-28">
          <Reveal>
            <Tag>An educational sandbox, not a production tool</Tag>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="text-5xl font-semibold tracking-tight text-text sm:text-6xl md:text-7xl">
              Build. Simulate. Break. Learn.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="max-w-2xl text-balance text-lg text-text-muted">
              Design distributed systems visually, run a real discrete-event simulation against
              them, and watch your architecture succeed or collapse under load —{" "}
              <span className="text-signal">no lecture, just consequences</span>.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <LinkButton href="/workshop">
                Enter Workshop
                <ArrowRight className="size-4" aria-hidden />
              </LinkButton>
              <LinkButton href="#scenarios" variant="secondary">
                Browse Scenarios
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <Reveal delay={320}>
          <div className="relative rounded-[var(--landing-radius-lg)] border border-border bg-bg-elevated p-6 shadow-[var(--landing-shadow-card)] transition-shadow duration-slow ease-standard hover:shadow-[var(--landing-shadow-hover)] sm:p-10">
            <span className="absolute left-4 top-4 border border-signal/50 bg-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal sm:left-5 sm:top-5">
              Fig. 01 — Live Architecture
            </span>
            <div className="pt-6">
              <HeroDiagram />
            </div>
          </div>
        </Reveal>
      </section>

      {/* Process — an indexed spec sheet under the dark theme; Paper adds a
          rounded, shadowed frame around the same divided strip rather than
          restructuring it into separate cards. */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-28">
        <Reveal>
          <Kicker>How it works</Kicker>
        </Reveal>
        <div className="mt-14 grid divide-y divide-border overflow-hidden rounded-[var(--landing-radius)] border-t border-border shadow-[var(--landing-shadow-card)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {PROCESS_STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 100}>
              <div className="flex h-full flex-col gap-4 bg-bg-elevated px-6 py-8 sm:px-8 sm:py-10">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-signal">{String(i + 1).padStart(2, "0")}</span>
                  <step.icon className="size-4 text-text-muted" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-text">{step.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Scenarios */}
      <section
        id="scenarios"
        className="mx-auto w-full max-w-7xl scroll-mt-14 border-t border-border px-6 py-24"
      >
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Kicker>Pick a problem to solve</Kicker>
              <p className="max-w-xl text-sm text-text-muted">
                Every scenario hands you an intentionally imperfect architecture and a business
                problem, not a technical one. Your job is to figure out why it&apos;s failing.
              </p>
            </div>
            <Link
              href="/problems"
              className="group flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
            >
              See all {SCENARIOS.length} problems
              <ArrowRight
                className="size-3.5 transition-transform duration-fast ease-standard group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SCENARIOS.slice(0, 4).map((scenario, i) => (
            <Reveal key={scenario.id} delay={i * 80}>
              <Link
                href={`/workshop?scenario=${scenario.id}`}
                className="group relative flex h-full flex-col gap-3 rounded-[var(--landing-radius)] bg-bg-panel p-5 shadow-[var(--landing-shadow-card)] transition-all duration-fast ease-standard hover:-translate-y-1 hover:bg-bg-hover hover:shadow-[var(--landing-shadow-hover)]"
              >
                <CardCorners />
                <span className="absolute right-3 top-3 font-mono text-[10px] text-text-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="pr-6 font-semibold text-text">{scenario.title}</h3>
                <DifficultyMeter level={scenario.difficulty} />
                <p className="line-clamp-3 text-sm text-text-muted">
                  {truncateAtWord(scenario.story, SCENARIO_STORY_MAX_CHARS)}
                </p>
                <p className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
                  {scenario.constraints.length} success criteria
                  <ArrowRight
                    className="size-3.5 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100"
                    aria-hidden
                  />
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-wide text-text-subtle sm:flex-row">
          <span>Engineering Studio — Build. Simulate. Break. Learn.</span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-text-muted">
            View source on GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
