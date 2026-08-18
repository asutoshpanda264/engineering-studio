"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BatMark } from "@/components/theme/icons/BatMark";

/**
 * Ambient backdrop for the Night Ops preview theme (see globals.css) — the
 * actual bat-signal read: a ground spotlight sitting off the bottom-left
 * corner, throwing a widening beam up across the page to a crisp yellow
 * disc near the top-right corner with a dark bat silhouette sitting in it
 * like a cutout — the way the real signal is a projector on a rooftop
 * throwing its cone up into the sky, not light raining down from above.
 *
 * Fixed, inert (`pointer-events-none`), mounted first in the DOM by
 * NightOpsAtmosphere so ordinary page content always paints on top of it
 * without any z-index bookkeeping. Breathes slowly when motion is
 * allowed; holds still otherwise.
 */
export function BatSpotlight() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* The beam — a trapezoid from a source band anchored at the
          bottom-left corner, widening as it travels up to the disc at the
          top-right. Points mix vw/vh (not %) so the far edge lands right
          on the disc's own corners (right-[6vw]/top-[3vh]/size-[16vh]
          below) regardless of viewport aspect ratio — plain percentages
          would drift off-target on a wide-vs-tall screen. Heavily
          blurred, well past what it takes to hide the clip-path's hard
          edges, and kept low-opacity throughout — this reads as hazy
          light sitting behind the page, not a solid graphic stripe
          layered on top of it. */}
      <div
        className="absolute inset-0"
        style={{
          clipPath:
            "polygon(0vw 100vh, 100vw -4vh, calc(94vw - 10vh) 27vh, 10vw 97vh)",
          filter: "blur(64px)",
          background:
            "linear-gradient(to top right, hsl(50 100% 60% / 0.14), hsl(50 100% 60% / 0.07) 30%, hsl(50 100% 60% / 0.03) 60%, hsl(50 100% 60% / 0.01) 85%, transparent)",
        }}
      />

      <motion.div
        className="absolute right-[6vw] top-[3vh] size-[16vh] min-h-[130px] min-w-[130px]"
        animate={
          prefersReducedMotion ? undefined : { opacity: [0.85, 1, 0.85], scale: [1, 1.03, 1] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
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
    </div>
  );
}
