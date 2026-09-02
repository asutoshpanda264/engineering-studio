/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { INTERVIEW_QUESTIONS } from "../index";

describe("INTERVIEW_QUESTIONS", () => {
  it("has unique ids", () => {
    const ids = INTERVIEW_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(INTERVIEW_QUESTIONS)("$id has a non-empty company, title, and prompt", (q) => {
    expect(q.company.length).toBeGreaterThan(0);
    expect(q.title.length).toBeGreaterThan(0);
    expect(q.prompt.length).toBeGreaterThan(0);
  });

  it.each(INTERVIEW_QUESTIONS)("$id cites a source with a name and a real-looking url", (q) => {
    expect(q.source.name.length).toBeGreaterThan(0);
    expect(q.source.url).toMatch(/^https?:\/\//);
  });

  it("never ships a low-confidence source (only high/medium make it into content)", () => {
    for (const q of INTERVIEW_QUESTIONS) {
      expect(["high", "medium"]).toContain(q.source.confidence);
    }
  });

  it.each(INTERVIEW_QUESTIONS.filter((q) => q.optimalAnswer))(
    "$id's optimalAnswer has a non-empty approach, requirements, and key points",
    (q) => {
      const answer = q.optimalAnswer!;
      expect(answer.approach.length).toBeGreaterThan(0);
      expect(answer.requirements.length).toBeGreaterThan(0);
      expect(answer.keyPoints.length).toBeGreaterThan(0);
    }
  );

  it.each(INTERVIEW_QUESTIONS.flatMap((q) => (q.optimalAnswer?.relatedLinks ?? []).map((link) => ({ id: q.id, link }))))(
    "$id's related link $link.label has a real-looking href",
    ({ link }) => {
      expect(link.href).toMatch(/^\//);
      expect(link.label.length).toBeGreaterThan(0);
    }
  );
});
