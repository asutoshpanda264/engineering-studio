/**
 * Phase 4 of Pillar B: wires `/lld`'s 7 case-study lessons (09–15 —
 * Parking Lot, Elevator System, Tic-Tac-Toe, LRU Cache, Splitwise, Movie
 * Ticket Booking, Rate Limiter) to buildable challenges on `/lld/editor`.
 * (`Expansion_TODO.md`'s own text says "6 case-study lessons" — written
 * before Rate Limiter shipped as the lesson track's 7th; wiring all 7 here
 * rather than arbitrarily dropping one.)
 *
 * "Structural check (does the diagram actually support the exercise's
 * required operations?)" per the roadmap doc — same zero-React, pure-TS,
 * deterministic discipline as `linter.ts`, over the same `ClassDiagram`.
 * Each challenge is a short list of structural requirements (a minimum
 * class count, specific relationship kinds, method names that suggest a
 * required operation exists somewhere in the diagram). This can't verify
 * real behavior — there's no code, only a diagram — so it's deliberately
 * honest about what it's actually checking: shape, not correctness. Paired
 * with `linter.ts`'s SOLID/pattern findings (surfaced by the same
 * `LintPanel`, unchanged), a challenge's "Results panel" equivalent is:
 * did you model what the problem needs, *and* is it well-designed.
 */

import type { ClassDiagram, DiagramClassRef } from "./types";

export interface ChallengeRequirement {
  id: string;
  label: string;
  check: (diagram: ClassDiagram) => boolean;
}

export interface ClassDiagramChallenge {
  /** Matches the `/lld/[slug]` lesson slug this challenge builds on. */
  slug: string;
  title: string;
  prompt: string;
  requirements: ChallengeRequirement[];
}

// ---- reusable structural predicates ----

function realClasses(diagram: ClassDiagram): DiagramClassRef[] {
  // A freshly-added, still-untitled class/interface with no members yet
  // shouldn't count toward "you've modeled enough classes" — that's
  // trivially gameable by dragging N blank boxes onto the canvas.
  return diagram.classes.filter(
    (c) => c.data.name.trim().length > 0 && !/^i?untitled$/i.test(c.data.name.trim())
  );
}

function minClasses(min: number) {
  return (diagram: ClassDiagram) => realClasses(diagram).length >= min;
}

function hasRelationshipKind(kinds: string[], min = 1) {
  return (diagram: ClassDiagram) =>
    diagram.relationships.filter((r) => kinds.includes(r.data.kind)).length >= min;
}

function hasInheritanceOrRealization(min = 1) {
  return hasRelationshipKind(["inheritance", "realization"], min);
}

function allMethodNames(diagram: ClassDiagram): string[] {
  return diagram.classes.flatMap((c) => c.data.methods.map((m) => m.name));
}

function allFieldEntries(diagram: ClassDiagram): { name: string; type: string }[] {
  return diagram.classes.flatMap((c) => c.data.fields.map((f) => ({ name: f.name, type: f.type })));
}

/** At least `min` method somewhere in the diagram (any class) whose name matches `pattern` — a diagram-wide "is this operation modeled anywhere" check, not tied to a specific class name the student might pick differently. */
function hasMethodMatching(pattern: RegExp, min = 1) {
  return (diagram: ClassDiagram) => allMethodNames(diagram).filter((name) => pattern.test(name)).length >= min;
}

function hasFieldMatching(pattern: RegExp, min = 1) {
  return (diagram: ClassDiagram) =>
    allFieldEntries(diagram).filter((f) => pattern.test(f.name) || pattern.test(f.type)).length >= min;
}

/** An interface/abstract class with `min`+ distinct classes realizing/inheriting it — the diagram actually offering more than one interchangeable implementation, not just declaring an interface nobody implements. */
function hasInterfaceWithImplementers(min = 2) {
  return (diagram: ClassDiagram) => {
    const counts = new Map<string, number>();
    for (const rel of diagram.relationships) {
      if (rel.data.kind !== "realization" && rel.data.kind !== "inheritance") continue;
      counts.set(rel.target, (counts.get(rel.target) ?? 0) + 1);
    }
    return [...counts.values()].some((count) => count >= min);
  };
}

function anyOf(...checks: ((diagram: ClassDiagram) => boolean)[]) {
  return (diagram: ClassDiagram) => checks.some((check) => check(diagram));
}

// ---- the 7 challenges ----

export const CLASS_DIAGRAM_CHALLENGES: ClassDiagramChallenge[] = [
  {
    slug: "parking-lot",
    title: "Parking Lot",
    prompt:
      "Model a parking lot with multiple floors, each with multiple spots. Vehicles of different types (car, bike, ...) can park in a spot and later leave it.",
    requirements: [
      { id: "classes", label: "At least 3 classes/interfaces modeled", check: minClasses(3) },
      {
        id: "ownership",
        label: "Ownership modeled with composition or aggregation (e.g. lot has floors, floor has spots)",
        check: hasRelationshipKind(["composition", "aggregation"]),
      },
      {
        id: "vehicle-hierarchy",
        label: "Vehicle types modeled as a hierarchy (e.g. Car/Bike extending or implementing a shared type)",
        check: hasInheritanceOrRealization(),
      },
      { id: "park", label: "A way to park/assign a vehicle to a spot", check: hasMethodMatching(/park|assign/i) },
      {
        id: "release",
        label: "A way to release/free a spot",
        check: hasMethodMatching(/release|unpark|vacate|free/i),
      },
    ],
  },
  {
    slug: "elevator-system",
    title: "Elevator System",
    prompt:
      "Model a bank of elevators that can be called to a floor, and that dispatches which elevator answers each call.",
    requirements: [
      { id: "classes", label: "At least 3 classes/interfaces modeled", check: minClasses(3) },
      {
        id: "state",
        label: "The elevator's own state is trackable (a status/state field, or a State interface with implementations)",
        check: anyOf(hasFieldMatching(/state|status/i), hasInterfaceWithImplementers(2)),
      },
      { id: "request", label: "A way to request a floor / dispatch a call", check: hasMethodMatching(/request|dispatch|call/i) },
      { id: "move", label: "A way to move to and stop at a floor", check: hasMethodMatching(/move|stop|arrive/i) },
    ],
  },
  {
    slug: "tic-tac-toe",
    title: "Tic-Tac-Toe",
    prompt:
      "Model a tic-tac-toe game that generalizes to an N×N board, not just 3×3 — including making a move and detecting a winner.",
    requirements: [
      { id: "classes", label: "At least 2 classes modeled", check: minClasses(2) },
      { id: "move", label: "A way to make a move", check: hasMethodMatching(/move|play|mark/i) },
      { id: "win", label: "A way to check for a winner / game-over condition", check: hasMethodMatching(/win|over|finished/i) },
      {
        id: "size",
        label: "The board size is data (a field like size/dimension), not assumed to be 3×3",
        check: hasFieldMatching(/size|dimension|rows|cols|width|length/i),
      },
    ],
  },
  {
    slug: "lru-cache",
    title: "LRU Cache",
    prompt:
      "Model an LRU cache: bounded capacity, O(1)-shaped get/put, and eviction of the least-recently-used entry once full.",
    requirements: [
      { id: "get", label: "A get operation", check: hasMethodMatching(/get/i) },
      { id: "put", label: "A put/set operation", check: hasMethodMatching(/put|set|insert/i) },
      { id: "capacity", label: "A capacity limit modeled as a field", check: hasFieldMatching(/capacity|maxsize|limit/i) },
      { id: "evict", label: "An eviction operation", check: hasMethodMatching(/evict/i) },
    ],
  },
  {
    slug: "splitwise",
    title: "Splitwise",
    prompt:
      "Model an expense-splitting app: an expense can be split more than one way (equally, exact amounts, percentages), and balances settle between users.",
    requirements: [
      { id: "classes", label: "At least 3 classes/interfaces modeled", check: minClasses(3) },
      { id: "expense", label: "An expense / split operation somewhere in the diagram", check: hasMethodMatching(/split|expense/i) },
      {
        id: "split-strategies",
        label: "More than one split strategy behind a shared interface (equal, exact, percentage, ...)",
        check: hasInterfaceWithImplementers(2),
      },
      { id: "settle", label: "A way to track or settle balances between users", check: hasMethodMatching(/settle|balance/i) },
    ],
  },
  {
    slug: "movie-ticket-booking",
    title: "Movie Ticket Booking",
    prompt:
      "Model a movie ticket booking flow where two users can never book the same seat, even if they try at the same time.",
    requirements: [
      { id: "classes", label: "At least 3 classes modeled", check: minClasses(3) },
      { id: "book", label: "A way to book/reserve a seat", check: hasMethodMatching(/book|reserve/i) },
      {
        id: "seat-state",
        label: "Seat availability is trackable (a status/lock/hold field, or a lock/hold operation)",
        check: anyOf(hasFieldMatching(/status|state|lock|hold/i), hasMethodMatching(/lock|hold/i)),
      },
      { id: "linked", label: "Classes are connected by at least one relationship", check: hasRelationshipKind(["association", "aggregation", "composition"]) },
    ],
  },
  {
    slug: "rate-limiter",
    title: "Rate Limiter",
    prompt:
      "Model a rate limiter that decides whether to admit a request right now, with the algorithm itself swappable (token bucket, sliding window, ...).",
    requirements: [
      { id: "allow", label: "An admission check — should this request be allowed right now", check: hasMethodMatching(/allow|acquire|isallowed/i) },
      {
        id: "algorithms",
        label: "More than one algorithm behind a shared interface",
        check: hasInterfaceWithImplementers(2),
      },
      { id: "time-window", label: "Some notion of time or window tracked as a field", check: hasFieldMatching(/time|window|timestamp/i) },
    ],
  },
];

export function getChallenge(slug: string): ClassDiagramChallenge | undefined {
  return CLASS_DIAGRAM_CHALLENGES.find((c) => c.slug === slug);
}

export interface RequirementResult {
  requirement: ChallengeRequirement;
  passed: boolean;
}

export function evaluateChallenge(
  challenge: ClassDiagramChallenge,
  diagram: ClassDiagram
): RequirementResult[] {
  return challenge.requirements.map((requirement) => ({
    requirement,
    passed: requirement.check(diagram),
  }));
}
