"use client";

import { WorkshopHeader } from "@/components/workshop/WorkshopHeader";
import { ComponentSidebar } from "@/components/workshop/ComponentSidebar";
import { ArchitectureCanvas } from "@/components/workshop/ArchitectureCanvas";
import { InspectorPanel } from "@/components/workshop/InspectorPanel";
import { PlaybackControls } from "@/components/workshop/PlaybackControls";
import { SimulationResultsPanel } from "@/components/workshop/SimulationResultsPanel";
import { useWorkshopStore } from "@/store/workshopStore";
import { getScenario } from "@/scenarios";

/**
 * Workshop — shell under construction. Built one region at a time.
 *
 * Bottom bar follows WORKSHOP-UI.md §4: Playback Timeline beside Live
 * Metrics, sharing one row.
 */
export default function WorkshopPage() {
  const isSimulating = useWorkshopStore((s) => s.isSimulating);
  const runSimulation = useWorkshopStore((s) => s.runSimulation);
  const resetSimulation = useWorkshopStore((s) => s.resetSimulation);
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const scenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;

  return (
    <div className="flex h-screen w-full flex-col bg-bg">
      <WorkshopHeader
        projectName="Untitled Architecture"
        scenarioName={scenario?.title}
        isRunning={isSimulating}
        onRunSimulation={runSimulation}
        onReset={resetSimulation}
      />
      <div className="flex flex-1 overflow-hidden">
        <ComponentSidebar />
        <ArchitectureCanvas />
        <InspectorPanel />
      </div>
      <div className="flex h-24 shrink-0 border-t border-border bg-bg-elevated">
        <PlaybackControls />
        <SimulationResultsPanel />
      </div>
    </div>
  );
}
