import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { ArticleSection as Section } from "@/components/ui/ArticleSection";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { EntityTableOfContents } from "@/components/entities/EntityTableOfContents";
import type { TocSection } from "@/components/entities/EntityTableOfContents";
import { LessonBlockRenderer } from "@/components/content/LessonBlockRenderer";
import { AgenticMarkCompleteButton } from "@/components/agentic/AgenticMarkCompleteButton";
import { AGENTIC_LESSONS, AGENTIC_CATEGORY_LABEL, getAgenticLesson } from "@/content/agentic";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { slugFromEntityType } from "@/lib/entityDeepDive";

export function generateStaticParams() {
  return AGENTIC_LESSONS.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getAgenticLesson(slug);
  if (!lesson) return {};
  return {
    title: `${lesson.title} — Engineering Studio`,
    description: lesson.tagline,
  };
}

/**
 * Same article shell as `/lld/[slug]` and `/foundations/[slug]` — right
 * down to the shared `ArticleSection`/`LessonBlockRenderer`/
 * `EntityTableOfContents` — so all reading rooms feel like the same
 * publication. Prev/next nav walks the whole `AGENTIC_LESSONS` sequence
 * (crossing category boundaries), same as the other two reading rooms,
 * since categories group the index page, not separate tracks.
 *
 * Deliberately doesn't wire up Lock-In/Batman-mode (`LockInPanel`,
 * `LockInChapterAction`) the way `/foundations` and `/lld` do — that's a
 * separate villain-trilogy narrative feature with its own hardcoded
 * `"foundations" | "lld"` course-module union and per-module villain
 * content (`src/content/lockIn/villains.ts`), never mentioned in
 * `docs/Agentic_AI.md`. Adding it here is a real, separate design
 * decision (a new trilogy needs its own villains/chapters), not a natural
 * extension of shipping this track's content skeleton.
 */
export default async function AgenticLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getAgenticLesson(slug);
  if (!lesson) notFound();

  const index = AGENTIC_LESSONS.findIndex((item) => item.slug === slug);
  const prev = AGENTIC_LESSONS[index - 1];
  const next = AGENTIC_LESSONS[index + 1];

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
      <AppHeader
        back={{ href: "/agentic", label: "All lessons" }}
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
              <Badge variant="neutral">{AGENTIC_CATEGORY_LABEL[lesson.category]}</Badge>
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
                <Clock className="size-3" aria-hidden />
                {lesson.estimatedMinutes} min
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-text sm:text-3xl">{lesson.title}</h1>
            <p className="text-lg text-balance text-text-muted">{lesson.tagline}</p>
          </div>

          {/* Lesson body — same numbered-heading language as /entities/[slug],
              /foundations/[slug], and /lld/[slug] */}
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
            <p className="mb-5 text-base leading-relaxed text-text-muted">{lesson.summary}</p>
            <div className="bg-bg-panel p-5">
              <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                Key takeaways
              </h3>
              <ul className="flex flex-col gap-2.5">
                {lesson.keyTakeaways.map((takeaway, i) => (
                  <li key={i} className="flex gap-2.5 text-base leading-relaxed text-text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-signal" aria-hidden />
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          {/* Exercise — worked answer hidden behind a native disclosure, not shown upfront */}
          <Section index={lesson.sections.length + 2} id="exercise" title="Exercise">
            <div className="flex flex-col gap-4 bg-bg-panel p-5">
              <p className="text-base leading-relaxed text-text-muted">{lesson.exercise.prompt}</p>
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

          {/* Related entities — cross-link into the hands-on canvas
              counterpart, once one exists for this lesson's concept. */}
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

          {/* Marks this lesson complete on `/agentic`'s arcade map (Batman
              Mode only) — no lock-in run exists for this module (see this
              file's own doc comment), so unlike `/lld` there's no
              alternate "sanctioned advance" action to defer to here. */}
          <AgenticMarkCompleteButton slug={lesson.slug} />

          {/* Prev / next */}
          <nav className="flex items-center justify-between border-t border-border pt-6 text-sm">
            {prev ? (
              <Link
                href={`/agentic/${prev.slug}`}
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
                href={`/agentic/${next.slug}`}
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
