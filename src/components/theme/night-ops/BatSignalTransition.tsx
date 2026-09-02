"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

// Rotated through in order, one per trigger — see `quoteIndex` below.
const SIGNAL_LINES = [
  "Welcome, Vengeance.",
  "It's not who I am underneath, but what I do that defines me.",
  "Why do we fall, Master Wayne? So that we can learn to pick ourselves up.",
] as const;

const SIGNAL_DURATION_MS = 2600;

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
 * The bat-signal moment, fired once per click into Night Ops (see
 * ThemeToggle -> useBatSignalTrigger). This used to be two separate
 * things: an always-on `BatSpotlight` ambient glow sitting behind every
 * night-ops page, plus this flock-crossing swarm played only on the
 * toggle click. The ambient version read as clutter — permanently lit,
 * on every page, for the whole session — so it's gone; the signal now
 * only ever appears here, as a transient full-screen overlay tied to the
 * actual toggle interaction.
 *
 * Covers the entire viewport above everything else in the app —
 * including `RainCanvas`'s own `z-[60]` — dimming and blurring whatever
 * page content is underneath, throwing up the beam-and-disc signal,
 * flying the flock across it, and rotating through one of three lines
 * centered on screen (`SIGNAL_LINES`, advanced by trigger count so
 * repeated toggles cycle rather than repeat). `pointer-events-none`
 * throughout so it never blocks input even while visible.
 *
 * Fires only when `replayKey` increments past its initial 0 — 0 is the
 * "never triggered" sentinel, so mounting this component doesn't itself
 * play the animation. NightOpsAtmosphere bumps `replayKey` from
 * ThemeToggle's click handler, deliberately *not* by watching `theme`
 * change (that would also fire on the hydration correction when Night
 * Ops is the saved theme on a fresh load — see ThemeProvider's
 * `getServerSnapshot` doc — replaying the signal on every reload instead
 * of only on a real toggle).
 */
export function BatSignalTransition({ replayKey }: { replayKey: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [prevKey, setPrevKey] = useState(replayKey);
  const [playing, setPlaying] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

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
      setQuoteIndex((replayKey - 1) % SIGNAL_LINES.length);
    }
  }

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setPlaying(false), SIGNAL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [playing, replayKey]);

  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Scrim + blur over whatever page content is underneath — this
              is what makes the signal read as "overlaying on top of
              everything" instead of just another layer competing with
              the page for attention. Darkened from the first pass (3%
              lightness / 0.55 opacity) to 2% / 0.72 — a deliberately
              blacker night, not just a dimmer one. */}
          <div className="absolute inset-0 bg-[hsl(240_28%_2%/0.72)] backdrop-blur-xl" />

          {/* The beam — same geometry the old ambient spotlight used: a
              trapezoid from a source band anchored at the bottom-left
              corner, widening as it travels up to the disc at the
              top-right. Heavily blurred and low-opacity so it reads as
              hazy light, not a solid graphic stripe. Top edge raised
              ~10-12vh from the first pass to steepen the angle a further
              5-6° and read as pointing higher into the sky. */}
          <div
            className="absolute inset-0"
            style={{
              clipPath:
                "polygon(0vw 100vh, 100vw -14vh, calc(94vw - 10vh) 15vh, 10vw 97vh)",
              filter: "blur(64px)",
              background:
                "linear-gradient(to top right, hsl(50 100% 60% / 0.22), hsl(50 100% 60% / 0.1) 30%, hsl(50 100% 60% / 0.04) 60%, hsl(50 100% 60% / 0.01) 85%, transparent)",
            }}
          />

          <motion.div
            className="absolute right-[6vw] top-[1vh] size-[16vh] min-h-[130px] min-w-[130px]"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* The disc — crisp core, soft glow bleeding past its own edge. */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, hsl(50 100% 58%) 0%, hsl(50 100% 55%) 62%, hsl(50 100% 55% / 0.35) 72%, transparent 78%)",
              }}
            />
            <BatMark
              className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2"
              style={{ color: "hsl(240 30% 5%)" }}
            />
          </motion.div>

          {FLOCK.map((bat, i) => (
            <FlyingBat key={i} {...bat} />
          ))}

          <div className="absolute inset-0 flex items-center justify-center px-6">
            <motion.p
              key={quoteIndex}
              className="max-w-2xl text-center font-serif text-2xl italic text-[hsl(47_6%_95%)] [text-wrap:balance] drop-shadow-[0_0_20px_hsl(50_100%_55%/0.55)] sm:text-3xl md:text-4xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            >
              {SIGNAL_LINES[quoteIndex]}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
