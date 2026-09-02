/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { FOUNDATION_LESSONS, getFoundationLesson } from "../index";
import { FOUNDATION_TRACKS, groupLessonsByTrack } from "../tracks";

describe("FOUNDATION_LESSONS", () => {
  it("has unique slugs", () => {
    const slugs = FOUNDATION_LESSONS.map((lesson) => lesson.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("is numbered 1..N in array order, matching course sequence", () => {
    FOUNDATION_LESSONS.forEach((lesson, i) => {
      expect(lesson.number).toBe(i + 1);
    });
  });

  it.each(FOUNDATION_LESSONS)("$title has at least one section with at least one block", (lesson) => {
    expect(lesson.sections.length).toBeGreaterThan(0);
    for (const section of lesson.sections) {
      expect(section.id.length).toBeGreaterThan(0);
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it.each(FOUNDATION_LESSONS)("$title has unique section ids", (lesson) => {
    const ids = lesson.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(FOUNDATION_LESSONS)("$title has a summary, key takeaways, and an exercise prompt", (lesson) => {
    expect(lesson.summary.length).toBeGreaterThan(0);
    expect(lesson.keyTakeaways.length).toBeGreaterThan(0);
    expect(lesson.exercise.prompt.length).toBeGreaterThan(0);
  });

  it.each(FOUNDATION_LESSONS)("$title has a positive estimated duration", (lesson) => {
    expect(lesson.estimatedMinutes).toBeGreaterThan(0);
  });

  it("every table block has a row length matching its header length", () => {
    for (const lesson of FOUNDATION_LESSONS) {
      for (const section of lesson.sections) {
        for (const block of section.blocks) {
          if (block.kind === "table") {
            for (const row of block.rows) {
              expect(row.length).toBe(block.headers.length);
            }
          }
        }
      }
    }
  });

  // The /foundations map (FoundationsMap) renders `prerequisites` as the
  // forest's edges — these two checks are cheap insurance against a typo'd
  // slug or an accidental cycle silently breaking the map, same spirit as
  // the slug-uniqueness check above.
  it("every prerequisite slug refers to a real lesson", () => {
    const slugs = new Set(FOUNDATION_LESSONS.map((lesson) => lesson.slug));
    for (const lesson of FOUNDATION_LESSONS) {
      for (const prereq of lesson.prerequisites ?? []) {
        expect(slugs.has(prereq)).toBe(true);
      }
    }
  });

  it("the prerequisite graph has no cycles", () => {
    const bySlug = new Map(FOUNDATION_LESSONS.map((lesson) => [lesson.slug, lesson]));
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (slug: string) => {
      if (visited.has(slug)) return;
      if (visiting.has(slug)) {
        throw new Error(`Cycle detected in Foundations prerequisites at "${slug}"`);
      }
      visiting.add(slug);
      for (const prereq of bySlug.get(slug)?.prerequisites ?? []) {
        visit(prereq);
      }
      visiting.delete(slug);
      visited.add(slug);
    };

    for (const lesson of FOUNDATION_LESSONS) {
      expect(() => visit(lesson.slug)).not.toThrow();
    }
    expect(visited.size).toBe(FOUNDATION_LESSONS.length);
  });
});

// FOUNDATION_TRACKS' ranges are hand-maintained (see that file's doc
// comment) — this is the cheap insurance against them drifting out of
// sync with FOUNDATION_LESSONS silently (a lesson added/renumbered
// without updating tracks.ts would otherwise just vanish from, or
// double up on, the /foundations index's track grouping).
describe("FOUNDATION_TRACKS", () => {
  it("partitions every lesson into exactly one track, in course order", () => {
    const grouped = groupLessonsByTrack(FOUNDATION_LESSONS);
    const flattened = grouped.flatMap((group) => group.lessons);
    expect(flattened).toEqual(FOUNDATION_LESSONS);
  });

  it("has contiguous, non-overlapping ranges covering 1..N with no gaps", () => {
    let expectedStart = 1;
    for (const track of FOUNDATION_TRACKS) {
      const [start, end] = track.range;
      expect(start).toBe(expectedStart);
      expect(end).toBeGreaterThanOrEqual(start);
      expectedStart = end + 1;
    }
    expect(expectedStart - 1).toBe(FOUNDATION_LESSONS.length);
  });
});

describe("getFoundationLesson", () => {
  it("finds a lesson by slug", () => {
    expect(getFoundationLesson("what-is-system-design")?.number).toBe(1);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getFoundationLesson("nonexistent")).toBeUndefined();
  });
});
