import { describe, expect, it } from "vitest";
import { VILLAIN_ATTACKS, getVillainAttack } from "../villainAttacks";

describe("VILLAIN_ATTACKS", () => {
  it("scales every attack visibly harder than the baseline it's given", () => {
    const baseline = 100;
    const durationMs = 10_000;
    for (const attack of VILLAIN_ATTACKS) {
      const pattern = attack.buildPattern(baseline, durationMs);
      switch (pattern.type) {
        case "constant":
          expect(pattern.rate).toBeGreaterThan(baseline);
          break;
        case "burst":
          // Bursts trade rate for concentration — asserting only that
          // the shape actually changed, not "rate > baseline", since a
          // burst's per-window rate isn't directly comparable to a flat
          // per-second baseline.
          expect(pattern.rate).toBeGreaterThan(0);
          expect(pattern.duration).toBeLessThan(pattern.interval);
          break;
        case "ramp":
          expect(pattern.startRate).toBeGreaterThanOrEqual(baseline);
          expect(pattern.endRate).toBeGreaterThan(pattern.startRate);
          // Ra's al Ghul's siege has to climb across the *whole* run, not
          // stall out early — see generateRamp's duration clamp.
          expect(pattern.duration).toBe(durationMs);
          break;
      }
    }
  });

  it("never produces a zero or negative rate off a tiny baseline", () => {
    for (const attack of VILLAIN_ATTACKS) {
      const pattern = attack.buildPattern(1, 10_000);
      const rates =
        pattern.type === "ramp"
          ? [pattern.startRate, pattern.endRate]
          : [pattern.rate];
      for (const rate of rates) {
        expect(rate).toBeGreaterThan(0);
      }
    }
  });

  it("looks up a known attack by id", () => {
    expect(getVillainAttack("bane").name).toBe("Bane");
  });

  it("throws on an unknown id", () => {
    // @ts-expect-error deliberately invalid id
    expect(() => getVillainAttack("two-face")).toThrow();
  });
});
