/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { generateArrivalTimestamps } from "../engine/TrafficGenerator";
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
