/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { AGENTIC_LESSONS, getAgenticLesson } from "../index";

describe("AGENTIC_LESSONS", () => {
  it("has unique slugs", () => {
    const slugs = AGENTIC_LESSONS.map((lesson) => lesson.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("is numbered 1..N in array order, matching course sequence", () => {
    AGENTIC_LESSONS.forEach((lesson, i) => {
      expect(lesson.number).toBe(i + 1);
    });
  });

  it.each(AGENTIC_LESSONS)("$title has at least one section with at least one block", (lesson) => {
    expect(lesson.sections.length).toBeGreaterThan(0);
    for (const section of lesson.sections) {
      expect(section.id.length).toBeGreaterThan(0);
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it.each(AGENTIC_LESSONS)("$title has unique section ids", (lesson) => {
    const ids = lesson.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(AGENTIC_LESSONS)("$title has a summary, key takeaways, and an exercise prompt", (lesson) => {
    expect(lesson.summary.length).toBeGreaterThan(0);
    expect(lesson.keyTakeaways.length).toBeGreaterThan(0);
    expect(lesson.exercise.prompt.length).toBeGreaterThan(0);
  });

  it.each(AGENTIC_LESSONS)("$title has a positive estimated duration", (lesson) => {
    expect(lesson.estimatedMinutes).toBeGreaterThan(0);
  });

  it.each(AGENTIC_LESSONS)("$title has a valid category", (lesson) => {
    expect(["fundamentals", "patterns", "protocols-and-infra", "inference-and-serving", "production"]).toContain(
      lesson.category,
    );
  });

  it("every table block has a row length matching its header length", () => {
    for (const lesson of AGENTIC_LESSONS) {
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
});

describe("getAgenticLesson", () => {
  it("finds a lesson by slug", () => {
    expect(getAgenticLesson("what-is-an-agent")?.number).toBe(1);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getAgenticLesson("nonexistent")).toBeUndefined();
  });
});
