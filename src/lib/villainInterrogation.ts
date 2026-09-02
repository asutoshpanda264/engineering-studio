import { FOUNDATION_LESSONS, getFoundationLesson } from "@/content/foundations";
import { LLD_LESSONS, getLLDLesson } from "@/content/lld";
import type { LockInLessonRef } from "@/content/lockIn/villains";

/**
 * Lock-In's "boss-fight" recall check — see LockInChapterAction.tsx.
 * Builds a one-question multiple choice from the lesson's own authored
 * `keyTakeaways` rather than separately-written quiz content: one real
 * takeaway from the lesson just read, plus two decoys pulled from
 * unrelated lessons elsewhere in the course (plausible-sounding, but not
 * about what was just read). Writing accurate, vetted quiz questions for
 * all 35 lessons across Foundations and LLD by hand isn't a one-sitting
 * job and risks getting facts wrong for lessons this wasn't written
 * against; every lesson already has a curated, correctness-reviewed
 * `keyTakeaways` array, so reusing it is the only way to gate on real
 * recall without that risk.
 */

export interface InterrogationQuestion {
  readonly lessonTitle: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
}

interface LessonSummary {
  readonly courseModule: "foundations" | "lld";
  readonly slug: string;
  readonly title: string;
  readonly keyTakeaways: readonly string[];
}

function allLessonSummaries(): LessonSummary[] {
  return [
    ...FOUNDATION_LESSONS.map((lesson) => ({
      courseModule: "foundations" as const,
      slug: lesson.slug,
      title: lesson.title,
      keyTakeaways: lesson.keyTakeaways,
    })),
    ...LLD_LESSONS.map((lesson) => ({
      courseModule: "lld" as const,
      slug: lesson.slug,
      title: lesson.title,
      keyTakeaways: lesson.keyTakeaways,
    })),
  ];
}

function resolveLesson(ref: LockInLessonRef): LessonSummary | undefined {
  const lesson =
    ref.courseModule === "foundations" ? getFoundationLesson(ref.slug) : getLLDLesson(ref.slug);
  if (!lesson) return undefined;
  return {
    courseModule: ref.courseModule,
    slug: ref.slug,
    title: lesson.title,
    keyTakeaways: lesson.keyTakeaways,
  };
}

function pick<T>(pool: readonly T[], rng: () => number): T {
  return pool[Math.floor(rng() * pool.length)];
}

/** Draws `count` distinct items from `pool` without replacement — good enough for a pool the size of "every other lesson's takeaways," no need for a real shuffle-and-slice. */
function pickDistinct<T>(pool: readonly T[], count: number, rng: () => number): T[] {
  const remaining = [...pool];
  const picked: T[] = [];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const index = Math.floor(rng() * remaining.length);
    picked.push(remaining[index]);
    remaining.splice(index, 1);
  }
  return picked;
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Returns null when the lesson can't be resolved, has no `keyTakeaways`
 * yet, or there isn't enough decoy material anywhere else in the course
 * to build a real 3-option question — callers should skip the
 * interrogation and fall back to the old trust-based flow rather than
 * force a degenerate one on missing content.
 *
 * `rng` defaults to `Math.random` (this gates a UI interaction, not a
 * simulation run — no determinism requirement) but is injectable so
 * tests can assert on a specific draw.
 */
export function buildInterrogationQuestion(
  ref: LockInLessonRef,
  rng: () => number = Math.random
): InterrogationQuestion | null {
  const current = resolveLesson(ref);
  if (!current || current.keyTakeaways.length === 0) return null;

  const correct = pick(current.keyTakeaways, rng);
  const decoyPool = allLessonSummaries()
    .filter((lesson) => !(lesson.courseModule === ref.courseModule && lesson.slug === ref.slug))
    .flatMap((lesson) => lesson.keyTakeaways);
  if (decoyPool.length < 2) return null;

  const decoys = pickDistinct(decoyPool, 2, rng);
  const options = shuffle([correct, ...decoys], rng);

  return {
    lessonTitle: current.title,
    prompt: `Which of these is actually true about "${current.title}" — not just something that sounds like it could be?`,
    options,
    correctIndex: options.indexOf(correct),
  };
}
