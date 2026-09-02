/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { CASE_STUDIES, getCaseStudy } from "../index";

describe("CASE_STUDIES", () => {
  it("has unique slugs", () => {
    const slugs = CASE_STUDIES.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("is numbered 1..N in array order, matching sequence", () => {
    CASE_STUDIES.forEach((entry, i) => {
      expect(entry.number).toBe(i + 1);
    });
  });

  it.each(CASE_STUDIES)("$title has at least one section with at least one block", (entry) => {
    expect(entry.sections.length).toBeGreaterThan(0);
    for (const section of entry.sections) {
      expect(section.id.length).toBeGreaterThan(0);
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it.each(CASE_STUDIES)("$title has unique section ids", (entry) => {
    const ids = entry.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CASE_STUDIES)("$title has a summary, key takeaways, and an exercise prompt", (entry) => {
    expect(entry.summary.length).toBeGreaterThan(0);
    expect(entry.keyTakeaways.length).toBeGreaterThan(0);
    expect(entry.exercise.prompt.length).toBeGreaterThan(0);
  });

  it.each(CASE_STUDIES)("$title has a positive estimated duration", (entry) => {
    expect(entry.estimatedMinutes).toBeGreaterThan(0);
  });

  it.each(CASE_STUDIES)("$title has a valid category", (entry) => {
    expect(["agentic", "classic-hld"]).toContain(entry.category);
  });

  it("every table block has a row length matching its header length", () => {
    for (const entry of CASE_STUDIES) {
      for (const section of entry.sections) {
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

describe("getCaseStudy", () => {
  it("finds an entry by slug", () => {
    expect(getCaseStudy("rag-system")?.number).toBe(1);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getCaseStudy("nonexistent")).toBeUndefined();
  });
});
