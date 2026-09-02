/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { CLASS_DIAGRAM_CHALLENGES, evaluateChallenge, getChallenge } from "../challenges";
import { createClassNodeData, createMethod, createRelationshipEdgeData } from "../types";
import type { ClassDiagram, DiagramClassRef, DiagramRelationshipRef } from "../types";

function cls(id: string, overrides: Partial<ReturnType<typeof createClassNodeData>> = {}): DiagramClassRef {
  return { id, data: { ...createClassNodeData(), ...overrides } };
}

function rel(
  id: string,
  source: string,
  target: string,
  kind: DiagramRelationshipRef["data"]["kind"]
): DiagramRelationshipRef {
  return { id, source, target, data: createRelationshipEdgeData(kind) };
}

describe("CLASS_DIAGRAM_CHALLENGES", () => {
  it("has exactly one challenge per case-study lesson slug, all unique", () => {
    const slugs = CLASS_DIAGRAM_CHALLENGES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual([
      "parking-lot",
      "elevator-system",
      "tic-tac-toe",
      "lru-cache",
      "splitwise",
      "movie-ticket-booking",
      "rate-limiter",
    ]);
  });

  it.each(CLASS_DIAGRAM_CHALLENGES)("$title has a non-empty prompt and at least 2 requirements", (challenge) => {
    expect(challenge.prompt.length).toBeGreaterThan(0);
    expect(challenge.requirements.length).toBeGreaterThanOrEqual(2);
  });

  it.each(CLASS_DIAGRAM_CHALLENGES)("$title's requirements all fail against an empty diagram", (challenge) => {
    const empty: ClassDiagram = { classes: [], relationships: [] };
    const results = evaluateChallenge(challenge, empty);
    expect(results.every((r) => !r.passed)).toBe(true);
  });
});

describe("getChallenge", () => {
  it("finds a challenge by its lesson slug", () => {
    expect(getChallenge("lru-cache")?.title).toBe("LRU Cache");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getChallenge("not-a-real-slug")).toBeUndefined();
  });
});

describe("evaluateChallenge — parking-lot, a representative full pass", () => {
  it("passes every requirement once the diagram genuinely models the problem", () => {
    const vehicle = cls("vehicle", { name: "Vehicle", stereotype: "abstract" });
    const car = cls("car", { name: "Car" });
    const lot = cls("lot", {
      name: "ParkingLot",
      methods: [createMethod({ name: "parkVehicle" }), createMethod({ name: "releaseSpot" })],
    });
    const floor = cls("floor", { name: "ParkingFloor" });
    const spot = cls("spot", { name: "ParkingSpot" });

    const diagram: ClassDiagram = {
      classes: [vehicle, car, lot, floor, spot],
      relationships: [
        rel("r1", "car", "vehicle", "inheritance"),
        rel("r2", "lot", "floor", "composition"),
        rel("r3", "floor", "spot", "composition"),
      ],
    };

    const challenge = getChallenge("parking-lot")!;
    const results = evaluateChallenge(challenge, diagram);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("does not count a still-blank 'Untitled' class toward the minimum class count", () => {
    const named = cls("a", { name: "ParkingLot" });
    const blank1 = cls("b", { name: "Untitled" });
    const blank2 = cls("c", { name: "IUntitled" });

    const diagram: ClassDiagram = { classes: [named, blank1, blank2], relationships: [] };
    const challenge = getChallenge("parking-lot")!;
    const results = evaluateChallenge(challenge, diagram);
    const classesReq = results.find((r) => r.requirement.id === "classes");
    expect(classesReq?.passed).toBe(false);
  });
});

describe("evaluateChallenge — rate-limiter's shared-interface requirement", () => {
  it("fails with only one implementer, passes with two", () => {
    const iface = cls("iface", { name: "RateLimitAlgorithm", stereotype: "interface" });
    const impl1 = cls("impl1", { name: "TokenBucket" });
    const withOne: ClassDiagram = {
      classes: [iface, impl1],
      relationships: [rel("r1", "impl1", "iface", "realization")],
    };
    const challenge = getChallenge("rate-limiter")!;
    const oneResult = evaluateChallenge(challenge, withOne).find((r) => r.requirement.id === "algorithms");
    expect(oneResult?.passed).toBe(false);

    const impl2 = cls("impl2", { name: "SlidingWindow" });
    const withTwo: ClassDiagram = {
      classes: [iface, impl1, impl2],
      relationships: [rel("r1", "impl1", "iface", "realization"), rel("r2", "impl2", "iface", "realization")],
    };
    const twoResult = evaluateChallenge(challenge, withTwo).find((r) => r.requirement.id === "algorithms");
    expect(twoResult?.passed).toBe(true);
  });
});
