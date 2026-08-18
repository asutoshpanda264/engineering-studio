import type { ReactNode } from "react";
import { WorkshopHeader } from "@/components/workshop/WorkshopHeader";
import { ComponentSidebar } from "@/components/workshop/ComponentSidebar";
import { ArchitectureCanvas } from "@/components/workshop/ArchitectureCanvas";
import { InspectorPanel } from "@/components/workshop/InspectorPanel";
import { PlaybackControls } from "@/components/workshop/PlaybackControls";
import { SimulationResultsPanel } from "@/components/workshop/SimulationResultsPanel";
import { ScenarioCompletionToast } from "@/components/workshop/ScenarioCompletionToast";
import { useWorkshopStore } from "@/store/workshopStore";
import { getScenario } from "@/scenarios";

/**
 * The real Workshop layout — header, sidebar, canvas, inspector, bottom
 * bar — extracted so `/workshop` and `/tutorial` share exactly one
 * implementation instead of the tutorial running on a lookalike copy.
 * `overlay` renders as a final sibling on top of everything, which is all
 * `TourOverlay` needs (it's `position: fixed`, so where it mounts in the
 * tree doesn't matter — this just keeps it out of `/workshop`, which
 * never passes the prop).
 *
 * `data-tour-id="run-simulation"` and `data-tour-id="results-bar"` live
 * here permanently, not conditionally — they're inert plain DOM attributes
 * when no tour is running, so there's no reason to fork this layout for
 * the two routes.
 *
 * `forceComponentsList`: `/tutorial` (TutorialRunner) passes this so
 * ComponentSidebar always renders the plain docked list, even in
 * night-ops — the guided tour's steps spotlight specific catalog cards
 * (`data-tour-id="sidebar-component-<type>"`), which only exist in the
 * list, not in WeaponWheel's SVG wedges. `/workshop` never passes it, so
 * Batman Mode still gets the wheel there.
 */
export function WorkshopShell({
  projectName = "Untitled Architecture",
  overlay,
  forceComponentsList = false,
}: {
  projectName?: string;
  overlay?: ReactNode;
  forceComponentsList?: boolean;
}) {
  const isSimulating = useWorkshopStore((s) => s.isSimulating);
  const runSimulation = useWorkshopStore((s) => s.runSimulation);
  const resetSimulation = useWorkshopStore((s) => s.resetSimulation);
  const clearCanvas = useWorkshopStore((s) => s.reset);
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const scenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-bg font-mono">
      <WorkshopHeader
        projectName={projectName}
        scenarioName={scenario?.title}
        isRunning={isSimulating}
        onRunSimulation={runSimulation}
        onReset={resetSimulation}
        onClear={clearCanvas}
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ComponentSidebar forceListMode={forceComponentsList} />
        <ArchitectureCanvas />
        <ScenarioCompletionToast />
        <InspectorPanel />
      </div>
      <div
        data-tour-id="results-bar"
        className="flex h-24 shrink-0 border-t border-border bg-bg-elevated"
      >
        <PlaybackControls />
        <SimulationResultsPanel />
      </div>
      {overlay}
    </div>
  );
}
