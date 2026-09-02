/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { CLASS_DIAGRAM_CHALLENGES, evaluateChallenge, getChallenge } from "../challenges";
import {
  REFERENCE_SOLUTIONS,
  buildLayoutedDiagram,
  getReferenceDiagram,
  getReferenceSolution,
} from "../referenceSolutions";
import type { ClassDiagram } from "../types";

/** `LayoutedClassDiagram` (positions included) -> the pure `ClassDiagram` shape `evaluateChallenge` reads — same "drop what the linter/challenge layer doesn't need" boundary `lldStore.ts`'s own `toClassDiagram` draws for the live canvas. */
function toClassDiagram(diagram: ReturnType<typeof buildLayoutedDiagram>): ClassDiagram {
  return {
    classes: diagram.classes.map((c) => ({ id: c.id, data: c.data })),
    relationships: diagram.relationships,
  };
}

describe("REFERENCE_SOLUTIONS", () => {
  it("has exactly one reference solution per challenge slug, all unique", () => {
    const challengeSlugs = CLASS_DIAGRAM_CHALLENGES.map((c) => c.slug);
    const solutionSlugs = REFERENCE_SOLUTIONS.map((s) => s.slug);
    expect(new Set(solutionSlugs).size).toBe(solutionSlugs.length);
    expect(new Set(solutionSlugs)).toEqual(new Set(challengeSlugs));
  });

  it.each(CLASS_DIAGRAM_CHALLENGES)(
    "$title's reference solution satisfies every one of its own challenge requirements",
    (challenge) => {
      const diagram = getReferenceDiagram(challenge.slug);
      expect(diagram).toBeDefined();
      const results = evaluateChallenge(challenge, toClassDiagram(diagram!));
      const failed = results.filter((r) => !r.passed).map((r) => r.requirement.label);
      expect(failed).toEqual([]);
    }
  );

  it.each(REFERENCE_SOLUTIONS)("$slug has a non-empty note and at least one class and relationship", (solution) => {
    expect(solution.note.length).toBeGreaterThan(0);
    expect(solution.classes.length).toBeGreaterThan(0);
    expect(solution.relationships.length).toBeGreaterThan(0);
  });

  it.each(REFERENCE_SOLUTIONS)("$slug's relationships only reference classes declared in the same solution", (solution) => {
    const names = new Set(solution.classes.map((c) => c.name));
    for (const rel of solution.relationships) {
      expect(names.has(rel.from)).toBe(true);
      expect(names.has(rel.to)).toBe(true);
    }
  });

  it("getReferenceSolution/getReferenceDiagram return undefined for an unknown slug", () => {
    expect(getReferenceSolution("not-a-real-slug")).toBeUndefined();
    expect(getReferenceDiagram("not-a-real-slug")).toBeUndefined();
  });

  it.each(REFERENCE_SOLUTIONS)("$slug lays out every class with unique ids and no overlapping positions within a column", (solution) => {
    const diagram = buildLayoutedDiagram(solution);
    const ids = diagram.classes.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);

    const byColumn = new Map<number, number[]>();
    for (const c of diagram.classes) {
      const ys = byColumn.get(c.position.x) ?? [];
      ys.push(c.position.y);
      byColumn.set(c.position.x, ys);
    }
    for (const ys of byColumn.values()) {
      const sorted = [...ys].sort((a, b) => a - b);
      expect(sorted).toEqual([...new Set(sorted)]); // no two classes in the same column at the same y
    }
  });

  it("getChallenge resolves every reference solution's slug (guards against a challenge being renamed/removed)", () => {
    for (const solution of REFERENCE_SOLUTIONS) {
      expect(getChallenge(solution.slug)).toBeDefined();
    }
  });
});
