import type { ReactNode } from "react";

/**
 * One beat of a guided tour. `getTarget` is a function (not a static
 * selector) because most targets don't exist in the DOM until the user has
 * already completed an earlier step (e.g. "the Client node" only exists
 * once step 1 is done) — re-evaluated on every render via useLiveRect.
 */
export interface TourStep {
  id: string;
  title: string;
  /** Explains what to do. Plain text, not JSX — keeps steps declarable as data. */
  body: ReactNode;
  /**
   * Returns the element to spotlight, or null to render the callout
   * centered on screen with no spotlight (welcome/completion beats).
   */
  getTarget: () => HTMLElement | null;
  /** Which side of the target the callout renders on. Ignored when getTarget returns null. */
  placement: "top" | "bottom" | "left" | "right";
  /**
   * True for the handful of steps with no real-world signal to detect
   * (read the config hints, read the results) — these show a Next button
   * and wait for an explicit click. Everything else auto-advances the
   * instant its underlying canvas condition becomes true (a node gets
   * added, an edge gets drawn, a simulation finishes) — there's no button
   * because there's nothing to click, the step simply stops being the
   * current one once `computeCurrentStep` (tutorialPlanner.ts) no longer
   * finds a reason to show it.
   */
  requiresAck?: boolean;
  /** Overrides the default "Next" label — e.g. "Got it", "Continue". */
  primaryLabel?: string;
  /**
   * True for steps whose `getTarget` points into ComponentSidebar's
   * catalog list ("Drag or click X to add it") — that list only exists in
   * the DOM while the panel is open (ComponentSidebar.tsx: on-demand, not
   * a permanent dock). TutorialRunner force-opens it whenever the current
   * step carries this flag, otherwise the step would spotlight nothing.
   */
  requiresComponentsPanel?: boolean;
}
