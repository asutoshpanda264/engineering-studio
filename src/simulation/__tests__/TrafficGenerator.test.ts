/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  assignPhantomKey,
  assignRequestExistence,
  generateArrivalTimestamps,
  phantomKeyPoolSize,
} from "../engine/TrafficGenerator";
import { RNG } from "../engine/RNG";

describe("generateArrivalTimestamps", () => {
  it("produces roughly rate * seconds arrivals for a constant pattern", () => {
    const rng = new RNG(42);
    const arrivals = generateArrivalTimestamps(
      { type: "constant", rate: 10 },
      10_000,
      rng
    );
    // 10 req/s over 10s ~= 100 arrivals; Poisson variance means "roughly".
    expect(arrivals.length).toBeGreaterThan(60);
    expect(arrivals.length).toBeLessThan(150);
  });

  it("keeps every arrival within [0, durationMs) and in ascending order", () => {
    const rng = new RNG(7);
    const arrivals = generateArrivalTimestamps(
      { type: "constant", rate: 20 },
      5_000,
      rng
    );
    for (const t of arrivals) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(5_000);
    }
    const sorted = [...arrivals].sort((a, b) => a - b);
    expect(arrivals).toEqual(sorted);
  });

  it("is deterministic for a given seed", () => {
    const a = generateArrivalTimestamps(
      { type: "constant", rate: 15 },
      10_000,
      new RNG(123)
    );
    const b = generateArrivalTimestamps(
      { type: "constant", rate: 15 },
      10_000,
      new RNG(123)
    );
    expect(a).toEqual(b);
  });

  it("produces rate arrivals per burst window", () => {
    const rng = new RNG(1);
    const arrivals = generateArrivalTimestamps(
      { type: "burst", rate: 5, interval: 1000, duration: 100 },
      3000,
      rng
    );
    // 3 windows (0, 1000, 2000) * 5 requests each.
    expect(arrivals.length).toBe(15);
  });

  it("returns no arrivals for a non-positive constant rate", () => {
    const rng = new RNG(1);
    expect(
      generateArrivalTimestamps({ type: "constant", rate: 0 }, 10_000, rng)
    ).toEqual([]);
  });
});

describe("assignRequestExistence", () => {
  it("always returns true, without drawing from rng, when missingKeyRate is 0", () => {
    const rng = new RNG(42);
    for (let i = 0; i < 50; i++) {
      expect(assignRequestExistence(rng, 0)).toBe(true);
    }
  });

  it("returns false for some fraction of draws once missingKeyRate is positive", () => {
    const rng = new RNG(42);
    const results = Array.from({ length: 500 }, () => assignRequestExistence(rng, 0.3));
    const missingCount = results.filter((exists) => !exists).length;
    // ~30% of 500 ~= 150; Bernoulli variance means "roughly".
    expect(missingCount).toBeGreaterThan(80);
    expect(missingCount).toBeLessThan(220);
  });

  it("is deterministic for a given seed", () => {
    const a = Array.from({ length: 50 }, () => assignRequestExistence(new RNG(7), 0.3));
    const b = Array.from({ length: 50 }, () => assignRequestExistence(new RNG(7), 0.3));
    expect(a).toEqual(b);
  });
});

describe("phantomKeyPoolSize", () => {
  it("stays within its floor and ceiling regardless of the real key pool size", () => {
    expect(phantomKeyPoolSize(1)).toBeGreaterThanOrEqual(2);
    expect(phantomKeyPoolSize(1_000_000)).toBeLessThanOrEqual(20);
  });

  it("scales up with a larger real key pool, within its bounds", () => {
    expect(phantomKeyPoolSize(200)).toBeGreaterThan(phantomKeyPoolSize(10));
  });
});

describe("assignPhantomKey", () => {
  it("draws from a namespace disjoint from assignRequestKey's", () => {
    const rng = new RNG(3);
    for (let i = 0; i < 20; i++) {
      expect(assignPhantomKey(rng, 50)).toMatch(/^missing_\d+$/);
    }
  });

  it("stays within phantomKeyPoolSize's bound for the given key pool size", () => {
    const rng = new RNG(9);
    const poolSize = phantomKeyPoolSize(50);
    for (let i = 0; i < 100; i++) {
      const key = assignPhantomKey(rng, 50);
      const index = Number(key.replace("missing_", ""));
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(poolSize);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = Array.from({ length: 20 }, () => assignPhantomKey(new RNG(4), 50));
    const b = Array.from({ length: 20 }, () => assignPhantomKey(new RNG(4), 50));
    expect(a).toEqual(b);
  });
});
