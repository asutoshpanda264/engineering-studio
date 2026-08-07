import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  FlaskConical,
  Route,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { getEntityEducation } from "@/lib/entityEducation";
import {
  entityTypeFromSlug,
  getEntityDeepDive,
  slugFromEntityType,
  slugFromFailureModeName,
} from "@/lib/entityDeepDive";

export function generateStaticParams() {
  return ENTITY_CATALOG.map((item) => ({ slug: slugFromEntityType(item.type) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const type = entityTypeFromSlug(slug);
  if (!type) return {};
  const catalogItem = ENTITY_CATALOG.find((item) => item.type === type)!;
  const deepDive = getEntityDeepDive(type);
  return {
    title: `${catalogItem.name} — Engineering Studio`,
    description: deepDive.tagline,
  };
}

export default async function EntityDeepDivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const type = entityTypeFromSlug(slug);
  if (!type) notFound();

  const catalogItem = ENTITY_CATALOG.find((item) => item.type === type)!;
  const education = getEntityEducation(type);
  const deepDive = getEntityDeepDive(type);

  const index = ENTITY_CATALOG.findIndex((item) => item.type === type);
  const prev = ENTITY_CATALOG[(index - 1 + ENTITY_CATALOG.length) % ENTITY_CATALOG.length];
  const next = ENTITY_CATALOG[(index + 1) % ENTITY_CATALOG.length];

  const Icon = catalogItem.icon;

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link
            href="/entities"
            className="flex items-center gap-2 text-sm text-text-muted transition-colors duration-fast ease-standard hover:text-text"
          >
            <ArrowLeft className="size-4" aria-hidden />
            All entities
          </Link>
          <Link
            href="/workshop"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-bg-elevated px-4 text-sm font-medium text-text transition-colors duration-fast ease-standard hover:border-border-hover hover:bg-bg-panel"
          >
            Open Workshop
          </Link>
        </div>
      </header>

      <article className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-16">
        {/* Hero */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-bg-panel">
              <Icon className="size-5 text-primary" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold text-text sm:text-3xl">{catalogItem.name}</h1>
          </div>
          <p className="text-lg text-balance text-text-muted">{deepDive.tagline}</p>
          <blockquote className="border-l-2 border-primary/50 pl-4 text-sm italic text-text-subtle">
            &ldquo;{education.truth}&rdquo;
          </blockquote>
        </div>

        {/* What it is */}
        <Section title="What it is">
          <p className="text-sm leading-relaxed text-text-muted">{deepDive.summary}</p>
        </Section>

        {/* Industry examples */}
        <Section title="In production">
          <div className="flex flex-wrap gap-2">
            {deepDive.industryExamples.map((example) => (
              <Badge key={example} variant="neutral">
                {example}
              </Badge>
            ))}
          </div>
        </Section>

        {/* Usage guide: where it connects, normal config, extremes, edge cases */}
        <Section title="How to connect & use it">
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-border bg-bg-panel p-4">
              <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text">
                <Route className="size-3.5 text-primary" aria-hidden />
                Where it goes
              </h3>
              <p className="text-sm leading-relaxed text-text-muted">{deepDive.usage.whereItGoes}</p>
              <p className="mt-2 rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-xs text-text-subtle">
                {deepDive.usage.typicalTopology}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-bg-panel p-4">
              <h3 className="mb-1.5 text-sm font-medium text-text">Normal usage</h3>
              <p className="text-sm leading-relaxed text-text-muted">{deepDive.usage.normal}</p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-text">Extremes worth pushing to</h3>
              <div className="flex flex-col gap-2">
                {deepDive.usage.extremes.map((extreme) => (
                  <div key={extreme.title} className="rounded-lg border border-border bg-bg-panel p-4">
                    <h4 className="mb-1 text-sm text-text">{extreme.title}</h4>
                    <p className="text-sm leading-relaxed text-text-muted">{extreme.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                Edge cases to try in the Workshop
              </h3>
              <ul className="flex flex-col gap-2.5">
                {deepDive.usage.edgeCases.map((edgeCase, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden />
                    {edgeCase}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Tradeoffs */}
        <Section title="Tradeoffs">
          <div className="flex flex-col gap-3">
            {deepDive.tradeoffs.map((tradeoff) => (
              <div key={tradeoff.title} className="rounded-lg border border-border bg-bg-panel p-4">
                <h3 className="mb-1.5 text-sm font-medium text-text">{tradeoff.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{tradeoff.description}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Pros / cons */}
        <Section title="Pros & cons">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-success">
                <CheckCircle2 className="size-3.5" aria-hidden /> Pros
              </h3>
              <ul className="flex flex-col gap-2">
                {deepDive.pros.map((pro) => (
                  <li key={pro} className="text-sm leading-relaxed text-text-muted">
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-error">
                <XCircle className="size-3.5" aria-hidden /> Cons
              </h3>
              <ul className="flex flex-col gap-2">
                {deepDive.cons.map((con) => (
                  <li key={con} className="text-sm leading-relaxed text-text-muted">
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Failure modes — the main event */}
        <Section title="Failure modes & crash points" emphasized>
          <p className="mb-5 text-sm text-text-muted">
            Each of these is something this entity can actually do — reproduce it
            yourself in the Workshop using the steps below, then watch for the
            listed signal to confirm it happened.
          </p>
          <div className="flex flex-col gap-4">
            {deepDive.failureModes.map((mode) => (
              <Panel key={mode.name} variant="elevated">
                <Panel.Header
                  title={mode.name}
                  action={
                    <Badge variant={mode.simulated ? "success" : "neutral"} dot>
                      {mode.simulated ? "Simulated" : "Named only"}
                    </Badge>
                  }
                />
                <Panel.Body className="flex flex-col gap-4 p-5">
                  <p className="text-sm leading-relaxed text-text-muted">{mode.description}</p>

                  {mode.simulated && mode.reproduce.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-subtle">
                        Reproduce it
                      </h4>
                      <ol className="flex flex-col gap-2">
                        {mode.reproduce.map((step, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-text-muted">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-medium text-primary">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="flex gap-2.5 rounded-md border border-border bg-bg-elevated p-3">
                    <Circle className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                    <p className="text-sm leading-relaxed text-text-muted">
                      <span className="font-medium text-text">Watch for: </span>
                      {mode.observe}
                    </p>
                  </div>

                  {mode.demo && (
                    <Link
                      href={`/entities/${slugFromEntityType(type)}/try/${slugFromFailureModeName(mode.name)}`}
                      className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors duration-fast ease-standard hover:bg-primary-hover active:bg-primary-active"
                    >
                      <FlaskConical className="size-4" aria-hidden />
                      Try it — a pre-built, broken architecture, ready to run
                    </Link>
                  )}
                </Panel.Body>
              </Panel>
            ))}
          </div>
        </Section>

        {/* Learning goal */}
        <Section title="The takeaway">
          <p className="text-sm leading-relaxed text-text-muted">{education.learningGoal}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {education.relatedConcepts.map((concept) => (
              <Badge key={concept} variant="primary">
                {concept}
              </Badge>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-bg-elevated p-8 text-center">
          <h2 className="text-lg font-semibold text-text">Ready to see it yourself?</h2>
          <p className="max-w-md text-sm text-text-muted">
            Nothing here is a substitute for running it. Open the Workshop and try
            the reproduction steps above on a real, live simulation.
          </p>
          <Link
            href="/workshop"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors duration-fast ease-standard hover:bg-primary-hover active:bg-primary-active"
          >
            Open Workshop
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {/* Prev / next */}
        <nav className="flex items-center justify-between border-t border-border pt-6 text-sm">
          <Link
            href={`/entities/${slugFromEntityType(prev.type)}`}
            className="flex items-center gap-1.5 text-text-muted transition-colors duration-fast ease-standard hover:text-text"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {prev.name}
          </Link>
          <Link
            href={`/entities/${slugFromEntityType(next.type)}`}
            className="flex items-center gap-1.5 text-text-muted transition-colors duration-fast ease-standard hover:text-text"
          >
            {next.name}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </nav>
      </article>
    </main>
  );
}

function Section({
  title,
  emphasized = false,
  children,
}: {
  title: string;
  emphasized?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className={
          emphasized
            ? "mb-1 text-xl font-semibold text-text"
            : "mb-3 text-xs font-medium uppercase tracking-wide text-text-subtle"
        }
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
