import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, Hammer } from "lucide-react";
import { ArticleSection as Section } from "@/components/ui/ArticleSection";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { EntityTableOfContents } from "@/components/entities/EntityTableOfContents";
import type { TocSection } from "@/components/entities/EntityTableOfContents";
import { LessonBlockRenderer } from "@/components/content/LessonBlockRenderer";
import { CaseStudiesMarkCompleteButton } from "@/components/caseStudies/CaseStudiesMarkCompleteButton";
import { CASE_STUDIES, CASE_STUDY_CATEGORY_LABEL, getCaseStudy } from "@/content/caseStudies";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { slugFromEntityType } from "@/lib/entityDeepDive";

export function generateStaticParams() {
  return CASE_STUDIES.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getCaseStudy(slug);
  if (!entry) return {};
  return {
    title: `${entry.title} — Engineering Studio`,
    description: entry.tagline,
  };
}

/**
 * Same article shell as `/agentic/[slug]`, `/lld/[slug]`, and
 * `/foundations/[slug]` — right down to the shared `ArticleSection`/
 * `LessonBlockRenderer`/`EntityTableOfContents` — so all five reading
 * rooms feel like the same publication. No Lock-In/Batman-mode wiring
 * here either, same reasoning `/agentic/[slug]`'s own doc comment gives:
 * that's a separate villain-trilogy feature hardcoded to
 * `"foundations" | "lld"`, not a natural extension of a new track.
 *
 * Two sections this shell adds beyond the other four reading rooms'
 * template: "Builds on" (`crossLinks` — cross-references back to the
 * specific `/agentic`/`/foundations` lesson a design decision leans on,
 * instead of re-teaching that concept inline) and "Build it" (`buildIt`
 * — a deep link into the real, simulatable Workshop scenario this case
 * study's architecture already exists as). Both are optional per entry:
 * a diagram-only entry like MCP Design has neither.
 */
export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getCaseStudy(slug);
  if (!entry) notFound();

  const index = CASE_STUDIES.findIndex((item) => item.slug === slug);
  const prev = CASE_STUDIES[index - 1];
  const next = CASE_STUDIES[index + 1];

  const tocSections: TocSection[] = [
    ...entry.sections.map((section) => ({ id: section.id, label: section.heading })),
    { id: "summary", label: "Summary" },
    { id: "exercise", label: "Exercise" },
  ];

  const relatedEntities = (entry.relatedEntitySlugs ?? [])
    .map((entitySlug) => ENTITY_CATALOG.find((item) => slugFromEntityType(item.type) === entitySlug))
    .filter((item): item is (typeof ENTITY_CATALOG)[number] => item !== undefined);

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <AppHeader
        back={{ href: "/case-studies", label: "All case studies" }}
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
              <Badge variant="neutral">{CASE_STUDY_CATEGORY_LABEL[entry.category]}</Badge>
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
                <Clock className="size-3" aria-hidden />
                {entry.estimatedMinutes} min
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-text sm:text-3xl">{entry.title}</h1>
            <p className="text-lg text-balance text-text-muted">{entry.tagline}</p>

            {/* Builds on — cross-links back to the specific lesson sections
                this design leans on, rather than re-teaching the concept
                inline (docs/Expansion_TODO.md's Pillar E content shape). */}
            {entry.crossLinks && entry.crossLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="font-mono text-[10px] uppercase tracking-wide text-text-subtle">Builds on</span>
                {entry.crossLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center gap-1 border border-border bg-bg-elevated px-2.5 py-1 font-mono text-[11px] text-text transition-colors duration-fast ease-standard hover:border-signal hover:text-signal"
                  >
                    {link.label}
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Lesson body — same numbered-heading language as every other
              reading room's article page */}
          {entry.sections.map((section, i) => (
            <Section key={section.id} index={i + 1} id={section.id} title={section.heading}>
              <div className="flex flex-col gap-4">
                {section.blocks.map((block, j) => (
                  <LessonBlockRenderer key={j} block={block} />
                ))}
              </div>
            </Section>
          ))}

          {/* Summary + key takeaways */}
          <Section index={entry.sections.length + 1} id="summary" title="Summary">
            <p className="mb-5 text-base leading-relaxed text-text-muted">{entry.summary}</p>
            <div className="bg-bg-panel p-5">
              <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                Key takeaways
              </h3>
              <ul className="flex flex-col gap-2.5">
                {entry.keyTakeaways.map((takeaway, i) => (
                  <li key={i} className="flex gap-2.5 text-base leading-relaxed text-text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-signal" aria-hidden />
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          {/* Exercise — worked answer hidden behind a native disclosure, not shown upfront */}
          <Section index={entry.sections.length + 2} id="exercise" title="Exercise">
            <div className="flex flex-col gap-4 bg-bg-panel p-5">
              <p className="text-base leading-relaxed text-text-muted">{entry.exercise.prompt}</p>
              {entry.exercise.guidance && (
                <details className="group">
                  <summary className="cursor-pointer font-mono text-xs font-semibold uppercase tracking-wider text-signal transition-colors duration-fast ease-standard hover:text-signal-hover">
                    Show the worked answer
                  </summary>
                  <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
                    {entry.exercise.guidance.map((block, i) => (
                      <LessonBlockRenderer key={i} block={block} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </Section>

          {/* Build it — deep link into the real, simulatable Workshop
              scenario this architecture already exists as. Absent on
              diagram-only entries (e.g. MCP Design). */}
          {entry.buildIt && (
            <div className="flex items-center justify-between gap-4 bg-bg-panel p-5">
              <div>
                <h3 className="mb-1 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Build it
                </h3>
                <p className="text-sm text-text-muted">{entry.buildIt.note}</p>
              </div>
              <LinkButton
                href={`/workshop?scenario=${entry.buildIt.scenarioId}`}
                variant="primary"
                size="sm"
                icon={<Hammer className="size-3.5" aria-hidden />}
                className="shrink-0"
              >
                Build it
              </LinkButton>
            </div>
          )}

          {/* Related entities — cross-link into the hands-on canvas
              counterpart, once one exists for this design's concept. */}
          {relatedEntities.length > 0 && (
            <div className="bg-bg-panel p-5">
              <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                See this in the Workshop
              </h3>
              <div className="flex flex-wrap gap-2">
                {relatedEntities.map((entity) => (
                  <Link
                    key={entity.type}
                    href={`/entities/${slugFromEntityType(entity.type)}`}
                    className="inline-flex items-center gap-1.5 border border-border bg-bg-elevated px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-text transition-colors duration-fast ease-standard hover:border-signal hover:text-signal"
                  >
                    <entity.icon className="size-3.5" aria-hidden />
                    {entity.name}
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Marks this case study complete on `/case-studies`' arcade map
              (Batman Mode only) — no lock-in run exists for this track. */}
          <CaseStudiesMarkCompleteButton slug={entry.slug} />

          {/* Prev / next */}
          <nav className="flex items-center justify-between border-t border-border pt-6 text-sm">
            {prev ? (
              <Link
                href={`/case-studies/${prev.slug}`}
                className="flex items-center gap-1.5 text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/case-studies/${next.slug}`}
                className="flex items-center gap-1.5 text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
              >
                {next.title}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>
      </div>
    </main>
  );
}
