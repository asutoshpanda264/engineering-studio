import type { TrafficPattern } from "@/simulation/types";

/**
 * "Batman Mode" (`night-ops`) attack profiles a student can load onto a
 * live simulation run — a chaos/load-test picker skinned as the same
 * rogues' gallery Lock-In mode uses (see content/lockIn/villains.ts),
 * for one consistent identity across the app. The two are deliberately
 * *not* the same data: Lock-In's `VILLAIN_SEQUENCE` drives a
 * lesson-reading commitment with its own taunts, this drives a traffic
 * shape — conflating them would make an unrelated tweak to one ripple
 * into the other for no reason.
 *
 * Each attack is a real `TrafficPattern` — the same three shapes
 * `TrafficGenerator.ts` already knows how to turn into arrivals
 * (constant/burst/ramp), just chosen and scaled to read as *that*
 * villain's signature move. `buildPattern` scales off whatever's
 * already driving the canvas (`baselineRate`, see
 * `workshopBridge.baselineRequestRate`) rather than a fixed absolute
 * number, so the same attack lands as "clearly harsher" whether it's
 * dropped on a one-node sandbox or a fully-built scenario. `durationMs`
 * is the run's actual configured duration — Ra's al Ghul's ramp needs it
 * to climb across the *whole* run rather than stalling out early (see
 * `generateRamp`'s `Math.min(pattern.duration, durationMs)` clamp).
 *
 * Zero React dependencies — this is content + pure pattern-building, the
 * same layer TrafficGenerator itself lives in, not UI.
 */

export type VillainAttackId = "ras-al-ghul" | "joker" | "bane";

export interface VillainAttack {
  readonly id: VillainAttackId;
  readonly name: string;
  readonly epithet: string;
  /** 2-3 word gist, shown inline in the picker's option list so the shape is visible without selecting first. */
  readonly tag: string;
  /** Fuller explanation of what this attack does to the traffic, shown once loaded. */
  readonly description: string;
  readonly buildPattern: (baselineRate: number, durationMs: number) => TrafficPattern;
}

export const VILLAIN_ATTACKS: readonly VillainAttack[] = [
  {
    id: "ras-al-ghul",
    name: "Ra's al Ghul",
    epithet: "The Demon's Head",
    tag: "Slow siege",
    description:
      "A slow siege — traffic climbs steadily across the whole run, patient and relentless, the way an army takes a city.",
    buildPattern: (baselineRate, durationMs) => ({
      type: "ramp",
      startRate: baselineRate,
      endRate: baselineRate * 4,
      duration: durationMs,
    }),
  },
  {
    id: "joker",
    name: "The Joker",
    epithet: "The Clown Prince of Crime",
    tag: "Chaotic bursts",
    description:
      "Chaos — no rhythm, no warning. Traffic slams in short, unpredictable bursts instead of any steady rate.",
    buildPattern: (baselineRate) => ({
      type: "burst",
      rate: Math.max(1, Math.round(baselineRate * 0.6)),
      duration: 150,
      interval: 900,
    }),
  },
  {
    id: "bane",
    name: "Bane",
    epithet: "The Man Who Broke the Bat",
    tag: "Sustained overload",
    description:
      "Sustained overload — no ramp, no letup, just maximum pressure held for the entire run until something breaks.",
    buildPattern: (baselineRate) => ({
      type: "constant",
      rate: baselineRate * 3.5,
    }),
  },
] as const;

export function getVillainAttack(id: VillainAttackId): VillainAttack {
  const attack = VILLAIN_ATTACKS.find((a) => a.id === id);
  if (!attack) throw new Error(`Unknown villain attack: ${id}`);
  return attack;
}
