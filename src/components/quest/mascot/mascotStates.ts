import type { ReactNode } from "react";
import type { Transition } from "framer-motion";

/**
 * Quest — the mascot's state model. Every call site (DialogueBox usage,
 * SceneStage beats, feedback branches) only ever reaches for one of
 * these states — never a skin-specific detail. Swapping the mascot's
 * visual identity later (see docs-game/CLAUDE.md §6.1) means writing a
 * new skin module that maps each of these states to its own artwork;
 * nothing here, or at any call site, has to change.
 */
export type MascotState =
  | "idle"
  | "explaining"
  | "thinking"
  | "excited"
  | "happy"
  | "confused"
  | "celebrating"
  | "warning";

export const MASCOT_STATES: readonly MascotState[] = [
  "idle",
  "explaining",
  "thinking",
  "excited",
  "happy",
  "confused",
  "celebrating",
  "warning",
];

/** Human-readable label per state — aria-labels and dev-facing previews
    only, never rendered as in-world copy. */
export const MASCOT_STATE_LABELS: Record<MascotState, string> = {
  idle: "Idle",
  explaining: "Explaining",
  thinking: "Thinking",
  excited: "Excited",
  happy: "Happy",
  confused: "Confused",
  celebrating: "Celebrating",
  warning: "Warning",
};

/** The contract every mascot skin implements — `Mascot` only ever talks
    to a skin through this shape, never its internals. */
export interface MascotSkinProps {
  state: MascotState;
  className?: string;
}
export type MascotSkin = (props: MascotSkinProps) => ReactNode;

interface MascotPose {
  animate: Record<string, number | number[]>;
  transition: Transition;
}

/**
 * Full-body motion per state — deliberately separate from a skin's
 * face/expression work. A skin only draws what's inside its own
 * viewBox; `Mascot` owns how the whole thing moves in the scene (bounce,
 * tilt, shake), so a future skin swap keeps this choreography for free.
 * Bouncy/loopy on purpose — see the animation principles in
 * docs-game/CLAUDE.md §6.
 */
export const MASCOT_POSES: Record<MascotState, MascotPose> = {
  idle: {
    animate: { y: [0, -4, 0], rotate: 0 },
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
  },
  explaining: {
    animate: { rotate: [0, -4, 4, 0] },
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    animate: { rotate: [0, 6, -6, 0] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  excited: {
    animate: { y: [0, -14, 0] },
    transition: { duration: 0.5, repeat: Infinity, ease: "easeOut" },
  },
  happy: {
    animate: { scale: [1, 1.08, 1] },
    transition: { duration: 1, repeat: Infinity, ease: "easeInOut" },
  },
  confused: {
    animate: { x: [0, -4, 4, -4, 0] },
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
  },
  celebrating: {
    animate: { y: [0, -24, 0, -12, 0], rotate: [0, -8, 8, 0] },
    transition: { duration: 0.9, repeat: Infinity, ease: "easeOut" },
  },
  warning: {
    animate: { x: [0, -3, 3, -3, 3, 0] },
    transition: { duration: 0.4, repeat: Infinity, ease: "linear" },
  },
};
