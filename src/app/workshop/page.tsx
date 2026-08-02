"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { WorkshopHeader } from "@/components/workshop/WorkshopHeader";
import { ComponentSidebar } from "@/components/workshop/ComponentSidebar";
import { ArchitectureCanvas } from "@/components/workshop/ArchitectureCanvas";
import { InspectorPanel } from "@/components/workshop/InspectorPanel";
import { PlaybackControls } from "@/components/workshop/PlaybackControls";
import { SimulationResultsPanel } from "@/components/workshop/SimulationResultsPanel";
import { useWorkshopStore } from "@/store/workshopStore";
import { getScenario } from "@/scenarios";

/**
 * Reads `?scenario=<id>` (the landing page's scenario cards deep-link this
 * way) and loads it once on mount. A no-op if the param is absent or
 * doesn't match a known scenario — the Workshop still opens blank by
 * default (WORKSHOP-UI.md §1a). Split out because useSearchParams forces
 * a Suspense boundary around whatever calls it.
 */
function ScenarioDeepLink() {
  const searchParams = useSearchParams();
  const loadScenario = useWorkshopStore((s) => s.loadScenario);

  useEffect(() => {
    const id = searchParams.get("scenario");
    if (id) loadScenario(id);
    // Only ever consult the URL on the initial load — once a user starts
    // editing, re-running this on an unrelated param change would silently
    // blow away their work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

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
      <Suspense fallback={null}>
        <ScenarioDeepLink />
      </Suspense>
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
