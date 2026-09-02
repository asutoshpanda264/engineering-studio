"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export type WeatherPhase = "rain" | "heavy-rain" | "snow";

interface PhaseSpec {
  phase: WeatherPhase;
  durationMs: number;
}

// The full loop Night Ops cycles through automatically, in order, forever —
// there's no "nothing falling" state, always some precipitation: a steady,
// clearly-visible rain -> a heavy downpour (RainCanvas eases its
// intensity/snow dials smoothly between every step, so this reads as
// weather building rather than snapping between looks; see RainCanvas's
// EASE_RATE) -> the downpour eases off *while* it turns to snowfall -> snow
// holds for a while, with the whole UI's signal color shifted lime-yellow
// -> blue (see globals.css's `[data-weather="snow"]` block, set by
// NightOpsAtmosphere) -> back to rain, and the loop repeats. Durations are
// deliberately uneven (heavy-rain shortest, snow longest) so the cycle
// doesn't read as a mechanical metronome.
const CYCLE: PhaseSpec[] = [
  { phase: "rain", durationMs: 24_000 },
  { phase: "heavy-rain", durationMs: 18_000 },
  { phase: "snow", durationMs: 30_000 },
];

/**
 * Drives Night Ops's automatic weather cycle. Only ever ticks while
 * `active` (theme === "night-ops", passed in by NightOpsAtmosphere) — with
 * `active` false, or under `prefers-reduced-motion`, the cycle never
 * advances and this just holds at the resting "rain" phase forever: the
 * same still-mood convention `RainCanvas` already used for reduced motion
 * before this cycle existed, now extended to the whole cycle. That means a
 * reduced-motion user never sees the blur/glass heavy-rain moment or the
 * lime->blue snow color shift trigger on their own — only the ambient rain
 * Night Ops always had.
 */
export function useWeatherCycle(active: boolean): WeatherPhase {
  const prefersReducedMotion = useReducedMotion();
  const cycling = active && !prefersReducedMotion;
  const [phase, setPhase] = useState<WeatherPhase>("rain");
  const [wasCycling, setWasCycling] = useState(cycling);

  // Reset to the top of the loop right when cycling turns on — a
  // render-time state adjustment (react.dev/learn/you-might-not-need-an-effect,
  // the same pattern BatSignalTransition already uses for its own
  // prop-driven reset) rather than a setState call inside the effect
  // below, so that effect only ever owns the actual external timer.
  if (cycling !== wasCycling) {
    setWasCycling(cycling);
    if (cycling) setPhase(CYCLE[0].phase);
  }

  useEffect(() => {
    if (!cycling) return;
    // A plain closure variable, not a ref — this effect re-runs (and this
    // resets to 0) every time `cycling` flips on, which lines up with the
    // render-time reset to CYCLE[0] above.
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;

    function advance() {
      index = (index + 1) % CYCLE.length;
      setPhase(CYCLE[index].phase);
      timer = setTimeout(advance, CYCLE[index].durationMs);
    }
    timer = setTimeout(advance, CYCLE[0].durationMs);

    return () => clearTimeout(timer);
  }, [cycling]);

  return active ? phase : "rain";
}
