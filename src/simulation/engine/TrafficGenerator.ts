/**
 * Turns a scenario's TrafficPattern into concrete request arrival
 * timestamps. Pulled out from Simulator as its own pure function — it has
 * nothing to do with event dispatch, and is easy to test in isolation
 * ("a constant rate produces roughly rate*seconds arrivals").
 *
 * Zero React dependencies.
 */

import type { RNG } from "./RNG";
import type { Timestamp, TrafficPattern } from "../types";

export function generateArrivalTimestamps(
  pattern: TrafficPattern,
  durationMs: number,
  rng: RNG
): Timestamp[] {
  switch (pattern.type) {
    case "constant":
      return generateConstant(pattern.rate, durationMs, rng);
    case "burst":
      return generateBurst(pattern, durationMs, rng);
    case "ramp":
      return generateRamp(pattern, durationMs, rng);
  }
}

/**
 * Picks which resource (of `poolSize` possible ones) a request is for.
 * Not true Zipfian sampling — that needs a precomputed CDF over the pool
 * — but squaring a uniform draw is a well-known cheap way to get the same
 * qualitative shape: a small set of "hot" keys dominate, most keys are
 * rare. That skew is what makes a Cache's hit rate meaningful at all; a
 * uniform draw would make every key equally rare and no cache would help.
 */
export function assignRequestKey(rng: RNG, poolSize: number): string {
  if (poolSize <= 1) return "key_0";
  const index = Math.floor(poolSize * rng.next() ** 2);
  return `key_${Math.min(index, poolSize - 1)}`;
}

/** Poisson arrivals: inter-arrival gaps drawn from an exponential distribution. */
function generateConstant(
  ratePerSecond: number,
  durationMs: number,
  rng: RNG
): Timestamp[] {
  if (ratePerSecond <= 0) return [];
  const lambdaPerMs = ratePerSecond / 1000;

  const timestamps: Timestamp[] = [];
  let t = 0;
  while (true) {
    t += rng.nextExponential(lambdaPerMs);
    if (t >= durationMs) break;
    timestamps.push(Math.round(t));
  }
  return timestamps;
}

/** `rate` arrivals spread across each `duration`-ms window, repeating every `interval` ms. */
function generateBurst(
  pattern: { rate: number; interval: number; duration: number },
  durationMs: number,
  rng: RNG
): Timestamp[] {
  const timestamps: Timestamp[] = [];

  for (
    let windowStart = 0;
    windowStart < durationMs;
    windowStart += pattern.interval
  ) {
    const windowEnd = Math.min(windowStart + pattern.duration, durationMs);
    for (let i = 0; i < pattern.rate; i++) {
      const t = windowStart + rng.nextFloat(0, windowEnd - windowStart);
      if (t < durationMs) timestamps.push(Math.round(t));
    }
  }

  return timestamps.sort((a, b) => a - b);
}

/** Rate interpolates linearly from startRate to endRate, approximated in small buckets. */
function generateRamp(
  pattern: { startRate: number; endRate: number; duration: number },
  durationMs: number,
  rng: RNG
): Timestamp[] {
  const bucketMs = 100;
  const timestamps: Timestamp[] = [];
  const effectiveDuration = Math.min(pattern.duration, durationMs);

  for (
    let bucketStart = 0;
    bucketStart < effectiveDuration;
    bucketStart += bucketMs
  ) {
    const progress = bucketStart / pattern.duration;
    const rate =
      pattern.startRate + (pattern.endRate - pattern.startRate) * progress;
    const expectedInBucket = (rate * bucketMs) / 1000;

    const wholeCount = Math.floor(expectedInBucket);
    const fractional = expectedInBucket - wholeCount;
    const count = wholeCount + (rng.next() < fractional ? 1 : 0);

    for (let i = 0; i < count; i++) {
      const t = bucketStart + rng.nextFloat(0, bucketMs);
      if (t < durationMs) timestamps.push(Math.round(t));
    }
  }

  return timestamps.sort((a, b) => a - b);
}
