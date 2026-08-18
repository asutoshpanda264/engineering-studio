"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { BatMark } from "@/components/theme/icons/BatMark";

interface BatConfig {
  top: number; // % of viewport height
  delay: number; // s
  duration: number; // s
  size: number; // px
  flip: boolean;
}

// Hand-placed, not random — a loose, uneven flock reads more natural than
// a perfectly random scatter, and stays reviewable/deterministic.
const FLOCK: BatConfig[] = [
  { top: 12, delay: 0, duration: 1.05, size: 26, flip: false },
  { top: 22, delay: 0.06, duration: 0.95, size: 20, flip: true },
  { top: 18, delay: 0.16, duration: 1.15, size: 30, flip: false },
  { top: 34, delay: 0.1, duration: 0.9, size: 18, flip: true },
  { top: 45, delay: 0.24, duration: 1.1, size: 24, flip: false },
  { top: 28, delay: 0.3, duration: 1.0, size: 22, flip: true },
  { top: 55, delay: 0.18, duration: 1.2, size: 28, flip: false },
  { top: 62, delay: 0.36, duration: 0.95, size: 18, flip: true },
  { top: 40, delay: 0.42, duration: 1.05, size: 20, flip: false },
  { top: 50, delay: 0.48, duration: 0.9, size: 16, flip: true },
  { top: 15, delay: 0.4, duration: 1.15, size: 22, flip: false },
  { top: 68, delay: 0.26, duration: 1.0, size: 24, flip: true },
];

const SWARM_DURATION_MS = 1900;

function FlyingBat({ top, delay, duration, size, flip }: BatConfig) {
  return (
    <motion.div
      className="absolute"
      style={{ top: `${top}%`, left: "-10vw", width: size, height: size }}
      initial={{ x: "0vw", opacity: 0 }}
      animate={{ x: "120vw", opacity: [0, 1, 1, 0] }}
      transition={{ duration, delay, ease: "easeInOut", times: [0, 0.12, 0.85, 1] }}
    >
      <motion.div
        animate={{ scaleX: [1, 0.55, 1] }}
        transition={{ duration: 0.16, repeat: Infinity, ease: "easeInOut" }}
      >
        <BatMark
          className="h-full w-full"
          style={{
            // Dark-on-dark is invisible against the void — these read as
            // pale shapes catching moonlight/signal-light instead, the
            // same way the reference stills show bats as silhouettes
            // against a *lighter* sky, not black-on-black.
            color: "hsl(45 55% 88% / 0.55)",
            filter: "drop-shadow(0 0 3px hsl(45 70% 70% / 0.45))",
            transform: flip ? "scaleX(-1)" : undefined,
          }}
        />
      </motion.div>
    </motion.div>
  );
}

/**
 * A flock of bats sweeps across the screen once, then the swarm unmounts
 * and leaves the ambient Night Ops backdrop (BatSpotlight + RainCanvas)
 * showing underneath — see NightOpsAtmosphere for how it composes.
 *
 * Fires only when `replayKey` increments past its initial 0 — 0 is the
 * "never triggered" sentinel, so mounting this component doesn't itself
 * play the animation. NightOpsAtmosphere bumps `replayKey` from
 * ThemeToggle's click handler, deliberately *not* by watching `theme`
 * change (that would also fire on the hydration correction when Night
 * Ops is the saved theme on a fresh load — see ThemeProvider's
 * `getServerSnapshot` doc — replaying the swarm on every reload instead
 * of only on a real toggle).
 */
export function BatSwarmTransition({ replayKey }: { replayKey: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [prevKey, setPrevKey] = useState(replayKey);
  const [playing, setPlaying] = useState(false);

  // Adjusting state from a prop change during render — React's own
  // recommended alternative to an effect for "derive/reset on prop
  // change" (see react.dev/learn/you-might-not-need-an-effect). Turning
  // *off* after the duration still has to go through an effect below,
  // since that's a real external timer callback, not a render-time
  // derivation.
  if (replayKey !== prevKey) {
    setPrevKey(replayKey);
    if (replayKey !== 0 && !prefersReducedMotion) {
      setPlaying(true);
    }
  }

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setPlaying(false), SWARM_DURATION_MS);
    return () => clearTimeout(timer);
  }, [playing, replayKey]);

  if (!playing) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {FLOCK.map((bat, i) => (
        <FlyingBat key={i} {...bat} />
      ))}
    </div>
  );
}
