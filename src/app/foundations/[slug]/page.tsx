import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { ArticleSection as Section } from "@/components/ui/ArticleSection";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { EntityTableOfContents } from "@/components/entities/EntityTableOfContents";
import type { TocSection } from "@/components/entities/EntityTableOfContents";
import { LessonBlockRenderer } from "@/components/content/LessonBlockRenderer";
import { LockInPanel } from "@/components/lockIn/LockInPanel";
import { LockInHeaderNav } from "@/components/lockIn/LockInHeaderNav";
import { LockInChapterAction } from "@/components/lockIn/LockInChapterAction";
import { HideWhileLockedIn } from "@/components/lockIn/HideWhileLockedIn";
import { FOUNDATION_LESSONS, getFoundationLesson } from "@/content/foundations";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { slugFromEntityType } from "@/lib/entityDeepDive";

export function generateStaticParams() {
  return FOUNDATION_LESSONS.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getFoundationLesson(slug);
  if (!lesson) return {};
  return {
    title: `${lesson.title} — Engineering Studio`,
    description: lesson.tagline,
  };
}

export default async function FoundationLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getFoundationLesson(slug);
  if (!lesson) notFound();

  const index = FOUNDATION_LESSONS.findIndex((item) => item.slug === slug);
  const prev = FOUNDATION_LESSONS[index - 1];
  const next = FOUNDATION_LESSONS[index + 1];

  const tocSections: TocSection[] = [
    ...lesson.sections.map((section) => ({ id: section.id, label: section.heading })),
    { id: "summary", label: "Summary" },
    { id: "exercise", label: "Exercise" },
  ];

  const relatedEntities = (lesson.relatedEntitySlugs ?? [])
    .map((entitySlug) => ENTITY_CATALOG.find((item) => slugFromEntityType(item.type) === entitySlug))
    .filter((item): item is (typeof ENTITY_CATALOG)[number] => item !== undefined);

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <LockInHeaderNav
            left={
              <Link
                href="/foundations"
                className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                All lessons
              </Link>
            }
            right={
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <LinkButton href="/workshop" variant="secondary" size="sm" className="bg-bg-elevated">
                  Open Workshop
                </LinkButton>
              </div>
            }
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl items-start gap-20 px-6 py-16">
        <EntityTableOfContents sections={tocSections} />

        <article className="flex min-w-0 max-w-5xl flex-1 flex-col gap-14">
          {/* Hero */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="neutral">Lesson {String(lesson.number).padStart(2, "0")}</Badge>
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
                <Clock className="size-3" aria-hidden />
                {lesson.estimatedMinutes} min
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-text sm:text-3xl">{lesson.title}</h1>
            <p className="text-lg text-balance text-text-muted">{lesson.tagline}</p>
          </div>

          <LockInPanel courseModule="foundations" slug={lesson.slug} />

          {/* Lesson body — same numbered-heading language as /entities/[slug] */}
          {lesson.sections.map((section, i) => (
            <Section key={section.id} index={i + 1} id={section.id} title={section.heading}>
              <div className="flex flex-col gap-4">
                {section.blocks.map((block, j) => (
                  <LessonBlockRenderer key={j} block={block} />
                ))}
              </div>
            </Section>
          ))}

          {/* Summary + key takeaways */}
          <Section index={lesson.sections.length + 1} id="summary" title="Summary">
            <p className="mb-5 text-sm leading-relaxed text-text-muted">{lesson.summary}</p>
            <div className="border border-border bg-bg-panel p-5">
              <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                Key takeaways
              </h3>
              <ul className="flex flex-col gap-2.5">
                {lesson.keyTakeaways.map((takeaway, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-signal" aria-hidden />
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          {/* Exercise — worked answer hidden behind a native disclosure, not shown upfront */}
          <Section index={lesson.sections.length + 2} id="exercise" title="Exercise">
            <div className="flex flex-col gap-4 border border-border bg-bg-panel p-5">
              <p className="text-sm leading-relaxed text-text-muted">{lesson.exercise.prompt}</p>
              {lesson.exercise.guidance && (
                <details className="group">
                  <summary className="cursor-pointer font-mono text-xs font-semibold uppercase tracking-wider text-signal transition-colors duration-fast ease-standard hover:text-signal-hover">
                    Show the worked answer
                  </summary>
                  <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
                    {lesson.exercise.guidance.map((block, i) => (
                      <LessonBlockRenderer key={i} block={block} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </Section>

          {/* Related entities — cross-link into the hands-on simulation, if one
              exists. Hidden during lock-in: same escape-hatch reasoning as
              the prev/next nav below. */}
          {relatedEntities.length > 0 && (
            <HideWhileLockedIn>
              <div className="border border-border bg-bg-panel p-5">
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  See this simulated in the Workshop
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
            </HideWhileLockedIn>
          )}

          {/* Lock-in chapter action — the sanctioned way to advance a run,
              replacing the prev/next nav below when this lesson is the
              active chapter. */}
          <LockInChapterAction courseModule="foundations" slug={lesson.slug} />

          {/* Prev / next — hidden during an active lock-in run: it walks the
              whole course sequence, not the trilogy's 3 chapters, and is a
              plain escape hatch the header nav's lock doesn't cover. */}
          <HideWhileLockedIn>
            <nav className="flex items-center justify-between border-t border-border pt-6 text-sm">
              {prev ? (
                <Link
                  href={`/foundations/${prev.slug}`}
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
                  href={`/foundations/${next.slug}`}
                  className="flex items-center gap-1.5 text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
                >
                  {next.title}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </HideWhileLockedIn>
        </article>
      </div>
    </main>
  );
}
