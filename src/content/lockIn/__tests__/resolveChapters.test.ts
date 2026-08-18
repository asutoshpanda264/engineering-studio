/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { resolveLockInChapters } from "../resolveChapters";
import { FOUNDATION_LESSONS } from "@/content/foundations";
import { LLD_LESSONS } from "@/content/lld";

describe("resolveLockInChapters", () => {
  it("resolves a lesson early in the course to itself + the next two", () => {
    const first = FOUNDATION_LESSONS[0];
    const second = FOUNDATION_LESSONS[1];
    const third = FOUNDATION_LESSONS[2];
    const chapters = resolveLockInChapters("foundations", first.slug);
    expect(chapters).toEqual([
      { courseModule: "foundations", slug: first.slug },
      { courseModule: "foundations", slug: second.slug },
      { courseModule: "foundations", slug: third.slug },
    ]);
  });

  it("works the same way for the lld course", () => {
    const first = LLD_LESSONS[0];
    const chapters = resolveLockInChapters("lld", first.slug);
    expect(chapters?.[0]).toEqual({ courseModule: "lld", slug: first.slug });
    expect(chapters).toHaveLength(3);
  });

  it("is undefined for the last lesson of a course (nothing to fill chapter 2/3)", () => {
    const last = FOUNDATION_LESSONS[FOUNDATION_LESSONS.length - 1];
    expect(resolveLockInChapters("foundations", last.slug)).toBeUndefined();
  });

  it("is undefined for the second-to-last lesson (nothing to fill chapter 3)", () => {
    const secondToLast = FOUNDATION_LESSONS[FOUNDATION_LESSONS.length - 2];
    expect(resolveLockInChapters("foundations", secondToLast.slug)).toBeUndefined();
  });

  it("is defined for exactly the third-from-last lesson", () => {
    const thirdFromLast = FOUNDATION_LESSONS[FOUNDATION_LESSONS.length - 3];
    expect(resolveLockInChapters("foundations", thirdFromLast.slug)).toBeDefined();
  });

  it("is undefined for a slug that doesn't exist", () => {
    expect(resolveLockInChapters("foundations", "no-such-lesson")).toBeUndefined();
  });
});
