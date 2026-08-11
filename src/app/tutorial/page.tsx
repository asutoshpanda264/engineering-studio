import type { Metadata } from "next";
import { TutorialRunner } from "@/app/tutorial/TutorialRunner";

export const metadata: Metadata = {
  title: "Tutorial — Engineering Studio",
  description:
    "Pick any component and get a guided, hands-on walkthrough that adapts to whatever's already on your canvas — place it, wire it in, configure it, and run a live simulation.",
};

/**
 * `/tutorial` — the Workshop itself (via WorkshopShell), with a guided
 * overlay on top pointing at exactly what to click next. Not a separate
 * sandbox or a scripted demo: dragging a component here is the same
 * `addNode` call `/workshop` makes, so what's learned here transfers
 * directly. Doesn't reset the canvas on load — TutorialPanel's entity
 * picker plans against whatever's already there (see
 * `src/lib/tutorialPlanner.ts`).
 */
export default function TutorialPage() {
  return <TutorialRunner />;
}
