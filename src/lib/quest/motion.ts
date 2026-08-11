import type { Transition } from "framer-motion";

/**
 * Quest — shared Framer Motion presets.
 *
 * Trace's motion is linear/mechanical (see `--ease-mechanical` in
 * globals.css) because it's animating an instrument reading real state.
 * Quest is the opposite on purpose: every transition here is spring-based
 * so mascot reactions, button presses, and celebrations feel physical
 * rather than computed. Pick a preset by what's moving, not by feel in
 * the moment, so motion stays consistent across every quest component.
 */

/** Small, frequent movements — button press/release, card hover. */
export const questSnappy: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

/** Mascot reactions, answer-choice feedback — has room to overshoot. */
export const questBouncy: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 15,
};

/** Big, celebratory moments — lesson complete, confetti burst. */
export const questCelebrate: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 12,
};

/** Scene/stage cross-fades within a lesson — deliberately not springy,
    a bounce here would fight the reading rhythm of dialogue advancing. */
export const questSceneTransition: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};
