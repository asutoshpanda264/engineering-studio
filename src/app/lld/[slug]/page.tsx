import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, Shapes } from "lucide-react";
import { ArticleSection as Section } from "@/components/ui/ArticleSection";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { EntityTableOfContents } from "@/components/entities/EntityTableOfContents";
import type { TocSection } from "@/components/entities/EntityTableOfContents";
import { LessonBlockRenderer } from "@/components/content/LessonBlockRenderer";
import { LockInPanel } from "@/components/lockIn/LockInPanel";
import { LockInHeaderNav } from "@/components/lockIn/LockInHeaderNav";
import { LockInChapterAction } from "@/components/lockIn/LockInChapterAction";
import { HideWhileLockedIn } from "@/components/lockIn/HideWhileLockedIn";
import { LLDMarkCompleteButton } from "@/components/lld/LLDMarkCompleteButton";
import { LLD_LESSONS, LLD_CATEGORY_LABEL, getLLDLesson } from "@/content/lld";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import { slugFromEntityType } from "@/lib/entityDeepDive";
import { getChallenge } from "@/lld-modeling/challenges";

export function generateStaticParams() {
  return LLD_LESSONS.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLLDLesson(slug);
  if (!lesson) return {};
  return {
    title: `${lesson.title} — Engineering Studio`,
    description: lesson.tagline,
  };
}

/** Same article shell as `/foundations/[slug]`, right down to the shared
 * `ArticleSection`/`LessonBlockRenderer`/`EntityTableOfContents` — the two
 * reading rooms are meant to feel like the same publication. Prev/next nav
 * walks the whole `LLD_LESSONS` sequence (crossing category boundaries),
 * same as Foundations' single sequence, since categories are a grouping
 * for the index page, not separate tracks. */
export default async function LLDLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLLDLesson(slug);
  if (!lesson) notFound();

  const index = LLD_LESSONS.findIndex((item) => item.slug === slug);
  const prev = LLD_LESSONS[index - 1];
  const next = LLD_LESSONS[index + 1];

  const tocSections: TocSection[] = [
    ...lesson.sections.map((section) => ({ id: section.id, label: section.heading })),
    { id: "summary", label: "Summary" },
    { id: "exercise", label: "Exercise" },
  ];

  const relatedEntities = (lesson.relatedEntitySlugs ?? [])
    .map((entitySlug) => ENTITY_CATALOG.find((item) => slugFromEntityType(item.type) === entitySlug))
    .filter((item): item is (typeof ENTITY_CATALOG)[number] => item !== undefined);

  // Phase 4 of Pillar B (docs/Expansion_TODO.md): each case-study lesson
  // with a matching structural challenge gets a CTA into the real editor.
  const challenge = getChallenge(slug);

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <AppHeader maxWidthClassName="max-w-7xl">
        <LockInHeaderNav
          left={
            <Link
              href="/lld"
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
      </AppHeader>

      <div className="mx-auto flex w-full max-w-7xl items-start gap-20 px-6 py-16">
        <EntityTableOfContents sections={tocSections} />

        <article className="flex min-w-0 max-w-5xl flex-1 flex-col gap-14">
          {/* Hero */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="neutral">{LLD_CATEGORY_LABEL[lesson.category]}</Badge>
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
                <Clock className="size-3" aria-hidden />
                {lesson.estimatedMinutes} min
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-text sm:text-3xl">{lesson.title}</h1>
            <p className="text-lg text-balance text-text-muted">{lesson.tagline}</p>
          </div>

          <LockInPanel courseModule="lld" slug={lesson.slug} />

          {/* Lesson body — same numbered-heading language as /entities/[slug] and /foundations/[slug] */}
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
            <div className="bg-bg-panel p-5">
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
            <div className="flex flex-col gap-4 bg-bg-panel p-5">
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

          {/* Build it — the case study's structural challenge on the real
              class-diagram editor, Phase 4's "buildable challenge" per
              `docs/Expansion_TODO.md`. Only case-study lessons with a
              matching `ClassDiagramChallenge` get this; every other lesson
              (fundamentals/patterns) has nothing to build yet. */}
          {challenge && (
            <HideWhileLockedIn>
              <div className="flex items-center justify-between gap-4 bg-bg-panel p-5">
                <div>
                  <h3 className="mb-1 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Build it
                  </h3>
                  <p className="text-sm text-text-muted">
                    Model {challenge.title} on the real class-diagram editor — a live checklist tracks whether your diagram actually supports the problem.
                  </p>
                </div>
                <LinkButton
                  href={`/lld/editor?challenge=${challenge.slug}`}
                  variant="primary"
                  size="sm"
                  icon={<Shapes className="size-3.5" aria-hidden />}
                  className="shrink-0"
                >
                  Build it
                </LinkButton>
              </div>
            </HideWhileLockedIn>
          )}

          {/* Related entities — cross-link into the hands-on HLD simulation of
              the same problem, if one exists. Hidden during lock-in: same
              escape-hatch reasoning as the prev/next nav below. */}
          {relatedEntities.length > 0 && (
            <HideWhileLockedIn>
              <div className="bg-bg-panel p-5">
                <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
                  See the HLD side of this in the Workshop
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

          {/* Marks this lesson complete on `/lld`'s arcade map (Batman
              Mode only) — hidden during an active lock-in run, where
              `LockInChapterAction` below is already the sanctioned way to
              advance (and itself calls `markLLDLessonComplete`, keeping
              the map in sync either way — see that component's own
              doc comment). */}
          <HideWhileLockedIn>
            <LLDMarkCompleteButton slug={lesson.slug} />
          </HideWhileLockedIn>

          {/* Lock-in chapter action — the sanctioned way to advance a run,
              replacing the prev/next nav below when this lesson is the
              active chapter. */}
          <LockInChapterAction courseModule="lld" slug={lesson.slug} />

          {/* Prev / next — hidden during an active lock-in run: it walks the
              whole course sequence, not the trilogy's 3 chapters, and is a
              plain escape hatch the header nav's lock doesn't cover. */}
          <HideWhileLockedIn>
            <nav className="flex items-center justify-between border-t border-border pt-6 text-sm">
              {prev ? (
                <Link
                  href={`/lld/${prev.slug}`}
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
                  href={`/lld/${next.slug}`}
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
