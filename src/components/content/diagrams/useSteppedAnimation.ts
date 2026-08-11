"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Shared engine behind every stepped/pausable diagram animation under
 * `src/components/content/diagrams/` (DNS's recursive lookup, the Rate
 * Limiter's token bucket, and whatever entity mechanism diagrams follow).
 * A discrete `step` counter (0..stepCount-1) advances on a timer; pausing
 * just stops scheduling the *next* step, so whatever transition is
 * mid-flight when paused finishes naturally and comes to rest, instead of
 * freezing mid-motion — the specific behavior a reported "needs a play
 * button" request was asking for.
 *
 * Inert under `prefers-reduced-motion`: `playing` is false and `step`
 * never advances, matching every other animated figure in the app. Callers
 * are expected to skip rendering the whole animated apparatus when
 * `!playing`, same as `HeroDiagram`/`FlowDiagram` already do.
 */
export function useSteppedAnimation(stepCount: number, stepDurationSeconds: number, extraPauseAtLastStepSeconds = 0) {
  const prefersReducedMotion = useReducedMotion();
  const playing = !prefersReducedMotion;

  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!playing || paused || stepCount <= 1) return;
    const isLastStep = step === stepCount - 1;
    const delaySeconds = stepDurationSeconds + (isLastStep ? extraPauseAtLastStepSeconds : 0);
    const timer = setTimeout(() => setStep((s) => (s + 1) % stepCount), delaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [step, paused, playing, stepCount, stepDurationSeconds, extraPauseAtLastStepSeconds]);

  return { step, paused, togglePaused: () => setPaused((p) => !p), playing };
}
