"use client";

import { useMemo, useState } from "react";
import { WorkshopShell } from "@/components/workshop/WorkshopShell";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { TutorialPanel } from "@/app/tutorial/TutorialPanel";
import { computeCurrentStep } from "@/lib/tutorialPlanner";
import { useWorkshopStore } from "@/store/workshopStore";
import type { EntityType } from "@/simulation/types";

/**
 * `/tutorial`'s brain. Doesn't reset the canvas on mount — the whole
 * point of the entity picker (TutorialPanel) is that it plans around
 * *whatever's already there*: an empty canvas gets the full build, a
 * canvas that already has everything except the picked target jumps
 * straight to adding it, extras get a "remove this first" step. See
 * `computeCurrentStep` (tutorialPlanner.ts) for that logic.
 *
 * No stored step index — `activeTarget` plus a small `acknowledgedIds`
 * set (for the couple of steps with no canvas signal to detect, like
 * "read the config hints") is the entire state. Everything else is
 * recomputed fresh from the live store on every render, which is what
 * makes pausing genuinely resumable: hiding the guide (`paused`) doesn't
 * touch `activeTarget` or `acknowledgedIds`, so un-pausing just shows
 * whatever `computeCurrentStep` says is next right now — never a restart.
 */
export function TutorialRunner() {
  const nodes = useWorkshopStore((s) => s.nodes);
  const edges = useWorkshopStore((s) => s.edges);
  const selectedNodeId = useWorkshopStore((s) => s.selectedNodeId);
  const simulationResult = useWorkshopStore((s) => s.simulationResult);

  const [activeTarget, setActiveTarget] = useState<EntityType | null>(null);
  const [paused, setPaused] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<ReadonlySet<string>>(new Set());

  const currentStep = useMemo(
    () =>
      activeTarget
        ? computeCurrentStep({
            target: activeTarget,
            nodes,
            edges,
            selectedNodeId,
            simulationHasRun: simulationResult !== null,
            acknowledgedIds,
          })
        : null,
    [activeTarget, nodes, edges, selectedNodeId, simulationResult, acknowledgedIds]
  );

  const pickTarget = (type: EntityType) => {
    setActiveTarget(type);
    setAcknowledgedIds(new Set());
    setPaused(false);
  };

  const chooseAnother = () => {
    setActiveTarget(null);
    setAcknowledgedIds(new Set());
    setPaused(false);
  };

  const handleNext = () => {
    if (!currentStep) return;
    if (currentStep.id === "complete") {
      chooseAnother();
      return;
    }
    setAcknowledgedIds((prev) => new Set(prev).add(currentStep.id));
  };

  return (
    <WorkshopShell
      projectName="Tutorial"
      overlay={
        <>
          {activeTarget && currentStep && !paused && (
            <TourOverlay step={currentStep} onNext={handleNext} onSkip={() => setPaused(true)} />
          )}
          <TutorialPanel
            activeTarget={activeTarget}
            currentStep={currentStep}
            paused={paused}
            onPick={pickTarget}
            onTogglePaused={() => setPaused((p) => !p)}
            onChooseAnother={chooseAnother}
          />
        </>
      }
    />
  );
}
