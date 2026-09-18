import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, FlaskConical } from "lucide-react";
import { ArticleSection as Section } from "@/components/ui/ArticleSection";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { EntityTableOfContents } from "@/components/entities/EntityTableOfContents";
import type { TocSection } from "@/components/entities/EntityTableOfContents";
import { EntityViewTracker } from "@/components/entities/EntityViewTracker";
import { FigureFrame } from "@/components/content/FigureFrame";
import { ENTITY_MECHANISM_REGISTRY } from "@/components/content/diagrams/entities/registry";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { getEntityEducation } from "@/lib/entityEducation";
import {
  entityTypeFromSlug,
  getEntityDeepDive,
  slugFromEntityType,
  slugFromFailureModeName,
} from "@/lib/entityDeepDive";
import { getFoundationLessonsForEntitySlug } from "@/content/foundations";

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

/**
 * Static once "How it works" existed for every entity — instead built from
 * `hasMechanism` per page, since most entities don't have a mechanism
 * diagram yet (see `ENTITY_MECHANISM_REGISTRY`) and a ToC entry pointing
 * at a section that isn't rendered would be a dead link.
 */
function buildTocSections(hasMechanism: boolean): TocSection[] {
  return [
    { id: "what-it-is", label: "What it is" },
    ...(hasMechanism ? [{ id: "how-it-works", label: "How it works" }] : []),
    { id: "in-production", label: "In production" },
    { id: "how-to-use", label: "How to use it" },
    { id: "tradeoffs", label: "Tradeoffs" },
    { id: "modeling-notes", label: "Modeling notes" },
    { id: "failure-modes", label: "Failure modes" },
    { id: "takeaway", label: "The takeaway" },
  ];
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
  const relatedLessons = getFoundationLessonsForEntitySlug(slugFromEntityType(type));

  const index = ENTITY_CATALOG.findIndex((item) => item.type === type);
  const prev = ENTITY_CATALOG[(index - 1 + ENTITY_CATALOG.length) % ENTITY_CATALOG.length];
  const next = ENTITY_CATALOG[(index + 1) % ENTITY_CATALOG.length];

  const Icon = catalogItem.icon;
  const MechanismDiagram = ENTITY_MECHANISM_REGISTRY[type];
  const tocSections = buildTocSections(Boolean(MechanismDiagram));

  // Every section from "In production" onward shifts by one number when
  // "How it works" renders — computed instead of a mutable running counter
  // (the latter trips the immutability lint rule on components).
  const afterMechanism = MechanismDiagram ? 1 : 0;

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      {/* Records "viewed" for `EntitiesIndexView`'s progress card — see
          `EntityViewTracker`'s own doc comment for why this is a separate
          client sliver rather than making this whole page a client
          component. */}
      <EntityViewTracker slug={slugFromEntityType(type)} />
      <AppHeader
        back={{ href: "/entities", label: "All entities" }}
        maxWidthClassName="max-w-7xl"
        right={
          <LinkButton href="/workshop" variant="secondary" size="sm" className="bg-bg-elevated">
            Open Workshop
          </LinkButton>
        }
      />

      <div className="mx-auto flex w-full max-w-7xl items-start gap-20 px-6 py-16">
        <EntityTableOfContents sections={tocSections} />

        <article className="flex min-w-0 max-w-5xl flex-1 flex-col gap-14">
          {/* Hero */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center border border-border bg-bg-panel">
                <Icon className="size-5 text-signal" aria-hidden />
              </div>
              <h1 className="text-2xl font-semibold text-text sm:text-3xl">{catalogItem.name}</h1>
            </div>
            <p className="text-lg text-balance text-text-muted">{deepDive.tagline}</p>
            <blockquote className="border-l-2 border-signal/50 pl-4 text-sm italic text-text-subtle">
              &ldquo;{education.truth}&rdquo;
            </blockquote>
          </div>

          {/* What it is */}
          <Section index={1} id="what-it-is" title="What it is">
            <p className="text-sm leading-relaxed text-text-muted">{deepDive.summary}</p>
          </Section>

          {/* How it works — an animated mechanism diagram, only for entities
              with a real causal chain worth animating (see the registry's
              own header comment). Reuses FigureFrame so it gets the same
              zoom-to-enlarge affordance every Learn diagram has. */}
          {MechanismDiagram && (
            <Section index={2} id="how-it-works" title="How it works">
              <FigureFrame>
                <MechanismDiagram />
              </FigureFrame>
            </Section>
          )}

          {/* Industry examples */}
          <Section index={2 + afterMechanism} id="in-production" title="In production">
            <div className="flex flex-wrap gap-2">
              {deepDive.industryExamples.map((example) => (
                <Badge key={example} variant="neutral">
                  {example}
                </Badge>
              ))}
            </div>
          </Section>

          {/* Usage guide: where it connects, normal config, extremes, edge cases */}
          <Section index={3 + afterMechanism} id="how-to-use" title="How to use it">
            <div className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-text-muted">{deepDive.usage.whereItGoes}</p>
              <p className="font-mono text-xs text-text-subtle">{deepDive.usage.typicalTopology}</p>
              <p className="text-sm leading-relaxed text-text-muted">
                <span className="font-medium text-text">Normal usage — </span>
                {deepDive.usage.normal}
              </p>

              <div>
                <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Extremes worth pushing to
                </h3>
                <DefinitionList items={deepDive.usage.extremes} numbered />
              </div>

              <div className="bg-bg-panel p-5">
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Edge cases to try in the Workshop
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {deepDive.usage.edgeCases.map((edgeCase, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-text-muted">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-signal" aria-hidden />
                      {edgeCase}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          {/* Tradeoffs */}
          <Section index={4 + afterMechanism} id="tradeoffs" title="Tradeoffs">
            <DefinitionList items={deepDive.tradeoffs} />
          </Section>

          {/* Modeling notes — what this simulation's version of the entity
              teaches well vs. simplifies away. Deliberately not framed as
              "pros/cons of using this component" (that framing falls apart
              for something like Client, which isn't an optional
              architectural choice) — it's an honesty check on the model
              itself. */}
          <Section index={5 + afterMechanism} id="modeling-notes" title="Modeling notes">
            <p className="mb-4 text-sm leading-relaxed text-text-muted">
              What this simulation&rsquo;s version of {catalogItem.name} gets right,
              and where it simplifies the real thing.
            </p>
            <div className="grid gap-6 bg-bg-panel p-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Captures well
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
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Simplified or missing
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
          <Section index={6 + afterMechanism} id="failure-modes" title="Failure modes & crash points" emphasized>
            <p className="mb-6 text-sm text-text-muted">
              Each of these is something this entity can actually do — reproduce it
              yourself in the Workshop using the steps below, then watch for the
              listed signal to confirm it happened.
            </p>
            <div className="flex flex-col gap-5">
              {deepDive.failureModes.map((mode, i) => (
                <div
                  key={mode.name}
                  className="flex flex-col gap-4 bg-bg-panel p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-baseline gap-2.5 text-base font-medium text-text">
                      <span className="font-mono text-sm tabular-nums text-text-subtle" aria-hidden>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {mode.name}
                    </h3>
                    <Badge variant={mode.simulated ? "success" : "neutral"} dot>
                      {mode.simulated ? "Simulated" : "Named only"}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-text-muted">{mode.description}</p>

                  {mode.simulated && mode.reproduce.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Reproduce it
                      </h4>
                      <ol className="flex flex-col gap-2">
                        {mode.reproduce.map((step, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-text-muted">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-signal/40 font-mono text-[11px] font-medium text-signal">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <p className="border-l-2 border-signal/40 pl-3 text-sm leading-relaxed text-text-muted">
                    <span className="font-medium text-text">Watch for — </span>
                    {mode.observe}
                  </p>

                  {mode.demo && (
                    <LinkButton
                      href={`/entities/${slugFromEntityType(type)}/try/${slugFromFailureModeName(mode.name)}`}
                      icon={<FlaskConical className="size-4" aria-hidden />}
                      className="w-fit !normal-case !tracking-normal"
                    >
                      Try it — a pre-built, broken architecture, ready to run
                    </LinkButton>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Learning goal */}
          <Section index={7 + afterMechanism} id="takeaway" title="The takeaway">
            <p className="text-sm leading-relaxed text-text-muted">{education.learningGoal}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {education.relatedConcepts.map((concept) => (
                <Badge key={concept} variant="primary">
                  {concept}
                </Badge>
              ))}
            </div>
          </Section>

          {/* Related lessons — cross-link into the underlying theory, if any.
              The reverse of Foundations' own "See this simulated in the
              Workshop" card: this page teaches what the entity does and how
              it breaks; the linked lesson(s) teach the concept itself,
              simulator-independent. */}
          {relatedLessons.length > 0 && (
            <div className="bg-bg-panel p-5">
              <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                Read the theory
              </h3>
              <div className="flex flex-wrap gap-2">
                {relatedLessons.map((lesson) => (
                  <Link
                    key={lesson.slug}
                    href={`/foundations/${lesson.slug}`}
                    className="inline-flex items-center gap-1.5 border border-border bg-bg-elevated px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-text transition-colors duration-fast ease-standard hover:border-signal hover:text-signal"
                  >
                    <BookOpen className="size-3.5" aria-hidden />
                    {lesson.title}
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Prev / next */}
          <nav className="flex items-center justify-between border-t border-border pt-6 text-sm">
            <Link
              href={`/entities/${slugFromEntityType(prev.type)}`}
              className="flex items-center gap-1.5 text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              {prev.name}
            </Link>
            <Link
              href={`/entities/${slugFromEntityType(next.type)}`}
              className="flex items-center gap-1.5 text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
            >
              {next.name}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </nav>
        </article>
      </div>
    </main>
  );
}

/**
 * Renders a title/description pair list as a plain, rule-separated
 * definition list — the same "compact table" role System Design
 * Handbook's articles use actual <table> markup for, done responsively
 * (stacks under `sm`) instead of forcing a fixed-column table to reflow.
 * Used for both Tradeoffs and Extremes, since both are this same shape.
 * `numbered` counts the rows (1, 2, 3…) — for Extremes, where each row is
 * a distinct case worth trying in order, not for Tradeoffs, where the
 * rows are just named things being compared with no inherent sequence.
 */
function DefinitionList({
  items,
  numbered = false,
}: {
  items: { title: string; description: string }[];
  numbered?: boolean;
}) {
  return (
    <dl className="divide-y divide-border border-y border-border">
      {items.map((item, i) => (
        <div key={item.title} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="flex items-baseline gap-2 text-sm font-medium text-text">
            {numbered && (
              <span className="font-mono tabular-nums text-text-subtle" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
            )}
            {item.title}
          </dt>
          <dd className="text-sm leading-relaxed text-text-muted">{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}
