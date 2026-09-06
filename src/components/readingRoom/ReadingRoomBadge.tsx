"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { TrackAccentClasses } from "@/components/foundations/trackAccent";

/**
 * The generic form of Foundations' `TrackBadge` — same idea (a small badge
 * sitting next to a zone's title, animating in as it scrolls into view),
 * reusing the group's own plain lucide icon (`ReadingRoomGroup.icon`)
 * instead of `TrackBadge`'s five bespoke hand-drawn line-art variants.
 * Those variants are themed specifically to `FOUNDATION_TRACKS` (a bolt
 * for Internet & Web, a database stack for Data & Storage, ...) and their
 * own doc comment documents *why* they keep bouncing back and forth for as
 * long as they're in view (a bolt genuinely reads as flickering, a gauge
 * needle as sweeping) — a plain reused icon has no such theme to justify
 * that, so repeating the same "shrink to nothing and pop back" loop here
 * just reads as a glitch, not a flourish (reported back directly as "pop
 * in pop out" — and a first fix that only played a one-off entrance plus a
 * barely-perceptible breathe was reported back again as having stopped the
 * animation entirely). This still plays a settling spring pop the first
 * time it comes into view, but the ongoing motion afterward is a genuinely
 * continuous, smoothly eased scale-and-tilt drift — no pauses between
 * cycles, no dip anywhere close to invisible or to its own resting size —
 * so it reads as one uninterrupted, gentle motion for as long as it's on
 * screen, not a repeating in/out cycle and not a static icon either.
 *
 * Replaces `ReadingRoomAtlas`'s old large, low-opacity watermark icon
 * bleeding off each zone's corner and `ReadingRoomJourney`'s complete lack
 * of one — both traced back to `TrackBadge`'s own doc comment: that exact
 * watermark shape was tried on `/foundations` too and flagged back as
 * "barely visible and not worth the space," which is why Foundations
 * replaced it with this same small-badge-in-the-header treatment. The
 * generic reading rooms had inherited the pre-fix version and never got
 * the follow-up.
 */
export function ReadingRoomBadge({ icon: Icon, accent }: { icon: LucideIcon; accent: TrackAccentClasses }) {
  const ref = useRef<HTMLSpanElement>(null);
  // `-15% 0px` margin + `once: false`: same tuning as `TrackBadge` — fires
  // slightly before the zone's header is dead-center in the viewport, and
  // replays its entrance every time the badge (re-)enters view in either
  // scroll direction rather than a one-shot intro. Unlike `TrackBadge`,
  // there's no infinite mirrored loop to get interrupted mid-cycle here,
  // so no remount-on-reentry trick is needed — a plain `isInView` toggle
  // is enough to safely replay (or reverse) the one settling spring.
  const isInView = useInView(ref, { once: false, margin: "0px 0px -15% 0px" });
  const prefersReducedMotion = useReducedMotion();
  const show = prefersReducedMotion || isInView;

  return (
    <span
      ref={ref}
      className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text} ${accent.iconGlow} ${accent.iconShadow}`}
    >
      {/* Entrance: settles once at its resting scale/opacity and stays —
          reversing smoothly back to the `hidden` values if scrolled out of
          view again, rather than bouncing between them on a timer. */}
      <motion.span
        className="flex"
        initial={false}
        animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* The ongoing motion: a continuous scale-and-tilt drift, `ease:
            "easeInOut"` on every leg and no `repeatDelay` between cycles —
            it never coasts at a fixed size/angle waiting for the next
            cycle to start, so it reads as one smooth, unbroken loop rather
            than a pulse that pauses (which is what made an earlier, much
            smaller-amplitude version of this read as "stopped"). Scale
            never dips below 1 and rotation stays within a few degrees —
            noticeably alive, but nothing here ever approaches the
            hidden/invisible frame the entrance transition above uses, so
            it can't read as the icon leaving and returning either. */}
        <motion.span
          className="flex"
          animate={prefersReducedMotion ? undefined : { scale: [1, 1.16, 1, 1.08, 1], rotate: [0, -6, 0, 6, 0] }}
          transition={prefersReducedMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="size-6" aria-hidden />
        </motion.span>
      </motion.span>
    </span>
  );
}
