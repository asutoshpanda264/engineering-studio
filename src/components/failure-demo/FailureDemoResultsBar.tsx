"use client";

import { AlertTriangle } from "lucide-react";
import { useFailureDemoStore } from "@/store/failureDemoStore";

// Stable reference for the no-warnings case — see SimulationResultsPanel.tsx's identical note.
const NO_WARNINGS: string[] = [];

/**
 * Trimmed version of the Workshop's SimulationResultsPanel — same headline
 * numbers, no sparklines and no cost line. Neither pulls its weight for a
 * 2-3 node, single-scenario demo: sparklines exist to show a metric's
 * shape over a full run a student might not have watched unfold, and cost
 * projection isn't a relevant question for "did this remedy help."
 */
export function FailureDemoResultsBar() {
  const metrics = useFailureDemoStore((s) => s.playbackMetrics);
  const error = useFailureDemoStore((s) => s.simulationError);
  const warnings = useFailureDemoStore((s) => s.simulationResult?.warnings ?? NO_WARNINGS);

  if (error) {
    return (
      <div className="flex flex-1 items-center gap-2 px-4 text-error">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex flex-1 items-center px-4">
        <p className="text-sm text-text-subtle">Run the simulation to see results here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-6 px-4">
      <Stat label="Requests" value={String(metrics.totalRequests)} />
      <Stat label="Success rate" value={`${(metrics.successRate * 100).toFixed(1)}%`} />
      <Stat label="Avg latency" value={`${metrics.averageLatency.toFixed(1)} ms`} />
      <Stat label="p95 latency" value={`${metrics.p95Latency} ms`} />
      <Stat label="Throughput" value={`${metrics.throughput.toFixed(1)} req/s`} />
      {warnings.length > 0 && (
        <div className="ml-auto flex shrink-0 items-center gap-1.5 text-warning" title={warnings.join(" ")}>
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          <p className="max-w-40 truncate text-xs">{warnings.join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-subtle">{label}</span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  );
}
