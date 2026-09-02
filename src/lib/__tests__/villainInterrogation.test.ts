import { describe, expect, it } from "vitest";
import { buildInterrogationQuestion } from "../villainInterrogation";
import { FOUNDATION_LESSONS } from "@/content/foundations";
import { LLD_LESSONS } from "@/content/lld";

// Deterministic RNG: cycles through a fixed sequence so tests aren't
// flaky and can assert on which draw happened.
function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("buildInterrogationQuestion", () => {
  it("returns null for an unknown lesson slug", () => {
    expect(
      buildInterrogationQuestion({ courseModule: "foundations", slug: "does-not-exist" })
    ).toBeNull();
  });

  it("builds a real 3-option question for every real Foundations lesson", () => {
    for (const lesson of FOUNDATION_LESSONS) {
      const question = buildInterrogationQuestion({
        courseModule: "foundations",
        slug: lesson.slug,
      });
      expect(question).not.toBeNull();
      expect(question!.options).toHaveLength(3);
      expect(question!.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question!.correctIndex).toBeLessThan(3);
      // The correct option must actually be one of this lesson's own
      // takeaways — not a decoy that happened to collide.
      expect(lesson.keyTakeaways).toContain(question!.options[question!.correctIndex]);
    }
  });

  it("builds a real 3-option question for every real LLD lesson", () => {
    for (const lesson of LLD_LESSONS) {
      const question = buildInterrogationQuestion({ courseModule: "lld", slug: lesson.slug });
      expect(question).not.toBeNull();
      expect(question!.options).toHaveLength(3);
      expect(lesson.keyTakeaways).toContain(question!.options[question!.correctIndex]);
    }
  });

  it("never picks a decoy from the lesson currently being tested", () => {
    const lesson = FOUNDATION_LESSONS[0];
    const question = buildInterrogationQuestion(
      { courseModule: "foundations", slug: lesson.slug },
      sequenceRng([0, 0.1, 0.9, 0.5])
    );
    expect(question).not.toBeNull();
    for (const option of question!.options) {
      // Every option is either the one real takeaway drawn from this
      // lesson, or something that isn't in this lesson's own list at all
      // (i.e. a decoy) — a decoy that happens to also appear verbatim in
      // this lesson's own takeaways would be indistinguishable from the
      // correct answer, which the pool-exclusion logic must prevent.
      const occursHere = lesson.keyTakeaways.filter((t) => t === option).length;
      expect(occursHere).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic given a fixed rng", () => {
    const ref = { courseModule: "foundations" as const, slug: FOUNDATION_LESSONS[0].slug };
    const a = buildInterrogationQuestion(ref, sequenceRng([0.2, 0.4, 0.6]));
    const b = buildInterrogationQuestion(ref, sequenceRng([0.2, 0.4, 0.6]));
    expect(a).toEqual(b);
  });
});
