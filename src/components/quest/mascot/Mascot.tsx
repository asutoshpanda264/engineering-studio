"use client";

import { motion } from "framer-motion";
import { MASCOT_POSES, MASCOT_STATE_LABELS, type MascotSkin, type MascotState } from "./mascotStates";
import { SparkySkin } from "./skins/sparkySkin";

export interface MascotProps {
  state: MascotState;
  /** Square size in px. */
  size?: number;
  /** Swap the character's artwork without touching any call site — see
      docs-game/CLAUDE.md §6.1. Defaults to the prototype's skin. */
  skin?: MascotSkin;
  className?: string;
}

/**
 * The student's companion/teacher — never decoration, always driven by a
 * `MascotState`. This component owns *how that state moves* (full-body
 * pose, via `MASCOT_POSES`); a skin only owns *what it looks like*
 * (face/expression). Callers never reach into either directly.
 */
export function Mascot({ state, size = 160, skin: Skin = SparkySkin, className }: MascotProps) {
  const pose = MASCOT_POSES[state];

  return (
    <motion.div
      role="img"
      aria-label={`Mascot: ${MASCOT_STATE_LABELS[state]}`}
      animate={pose.animate}
      transition={pose.transition}
      style={{ width: size, height: size }}
      className={className}
    >
      <Skin state={state} />
    </motion.div>
  );
}
