import type { Variants } from "framer-motion";

/**
 * Shared "section scrolls into view" reveal used by both `FoundationsAtlas`
 * (`AtlasZone`) and `FoundationsJourney` (`TrackSection`) — one timing/curve
 * for both views, so switching the Journey/Atlas toggle mid-scroll doesn't
 * feel like two different animation systems bolted onto the same page.
 * Both consumers pair this with `viewport={{ once: false }}` on their
 * `whileInView`, so the reveal replays every time a section (re-)enters the
 * viewport in either scroll direction — scrolling back up to revisit an
 * earlier track sees it fade/slide in again too, not a one-shot intro
 * that's already spent.
 *
 * `staticRevealVariants` (identical hidden/visible frames) is swapped in
 * whenever `useReducedMotion()` reports true, so consumers stay a plain
 * always-`motion.*` element rather than branching between an animated and a
 * plain tag.
 */
export const sectionRevealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export const staticRevealVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};
