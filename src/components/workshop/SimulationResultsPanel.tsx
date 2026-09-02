import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useWorkshopStore } from "@/store/workshopStore";
import { computeMetricsTimeSeries } from "@/simulation/metrics/MetricsTimeSeries";
import { Sparkline } from "@/components/ui/Sparkline";
import type { SparklinePoint } from "@/components/ui/Sparkline";
import { estimateCost } from "@/lib/costEngine";
import { getScenario } from "@/scenarios";
import type { Scenario } from "@/scenarios";
import { scoreScenario } from "@/lib/scenarioScoring";
import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import type { SimulationResult } from "@/simulation/types";

// Stable reference for the no-warnings case — `?? []` inline would create
// a new array every render, which breaks Zustand's reference-equality
// check and causes an infinite render loop.
const NO_WARNINGS: string[] = [];

const formatTime = (t: number) => `${(t / 1000).toFixed(1)}s`;

/**
 * The right half of the bottom bar (WORKSHOP-UI.md §4 — "Live Metrics").
 * Reads playbackMetrics rather than simulationResult.metrics: the engine
 * finishes instantly, but these headline numbers should reflect only
 * what's happened up to the current point in the replay, not the final
 * tally (WORKSHOP-UI.md §13 — "Metrics should update continuously during
 * playback").
 *
 * The sparklines beside each number are the "visual evidence" that same
 * section calls for — "users should never trust numbers without context."
 * Unlike the headline numbers, each sparkline's shape is the *complete*
 * run (computed once from the immutable event log — see
 * MetricsTimeSeries.ts), with a cursor marking where playback currently
 * is. Showing the whole shape lets a reader see a spike coming before
 * playback reaches it, the same way scrubbing a video timeline does.
 */
export function SimulationResultsPanel() {
  const metrics = useWorkshopStore((s) => s.playbackMetrics);
  const simulationResult = useWorkshopStore((s) => s.simulationResult);
  const nodes = useWorkshopStore((s) => s.nodes);
  const edges = useWorkshopStore((s) => s.edges);
  const playbackTime = useWorkshopStore((s) => s.playbackState?.currentTime ?? null);
  const error = useWorkshopStore((s) => s.simulationError);
  const warnings = useWorkshopStore((s) => s.simulationResult?.warnings ?? NO_WARNINGS);
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const scenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;

  const series = useMemo(() => {
    if (!simulationResult) return null;
    return computeMetricsTimeSeries(
      simulationResult.events,
      simulationResult.duration,
      undefined,
      simulationResult.clientIds
    );
  }, [simulationResult]);

  // Unlike every other Stat below, this one deliberately reads
  // simulationResult instead of playbackMetrics: a monthly cost
  // projection is a property of the complete run, not a point in
  // playback, so it shouldn't jitter as the user scrubs (same reasoning
  // as ScenarioBriefing/EstimatedCostSection in InspectorPanel.tsx).
  const cost = useMemo(() => {
    if (!simulationResult) return null;
    return estimateCost(simulationResult, nodes);
  }, [simulationResult, nodes]);

  if (error) {
    return (
      <div className="flex flex-1 items-center gap-2 px-4 text-status-critical">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!metrics || !series) {
    return (
      <div className="flex flex-1 items-center px-4">
        <p className="text-sm text-text-subtle">
          Run a simulation to see results here.
        </p>
      </div>
    );
  }

  const successRateSeries: SparklinePoint[] = series.map((p) => ({
    time: p.time,
    value: p.successRate,
  }));
  const latencySeries: SparklinePoint[] = series.map((p) => ({
    time: p.time,
    value: p.averageLatency,
  }));
  const throughputSeries: SparklinePoint[] = series.map((p) => ({
    time: p.time,
    value: p.throughput,
  }));

  return (
    <div className="flex flex-1 items-center gap-6 px-4">
      {scenario && simulationResult && (
        <ScenarioScoreStat scenario={scenario} result={simulationResult} nodes={nodes} edges={edges} />
      )}
      <Stat label="Requests" value={String(metrics.totalRequests)} />
      <StatWithSparkline
        label="Success rate"
        value={`${(metrics.successRate * 100).toFixed(1)}%`}
        data={successRateSeries}
        cursorTime={playbackTime}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
      />
      <StatWithSparkline
        label="Avg latency"
        value={`${metrics.averageLatency.toFixed(1)} ms`}
        data={latencySeries}
        cursorTime={playbackTime}
        formatValue={(v) => `${v.toFixed(0)}ms`}
      />
      <Stat label="p95 latency" value={`${metrics.p95Latency} ms`} />
      <StatWithSparkline
        label="Throughput"
        value={`${metrics.throughput.toFixed(1)} req/s`}
        data={throughputSeries}
        cursorTime={playbackTime}
        formatValue={(v) => `${v.toFixed(1)}/s`}
      />
      {cost && (
        <Stat
          label="Est. monthly cost"
          value={`$${cost.totalMonthlyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`}
        />
      )}
      {/* Only present with an Agent Orchestrator on canvas — docs/Agentic_AI.md §2.5's loop/iteration count, surfacing failure modes #5/#6 directly. */}
      {typeof metrics.totalIterations === "number" && (
        <Stat label="Iterations" value={String(metrics.totalIterations)} />
      )}
      {/* Only present with a Guardrail Validator on canvas — §2.5's guardrail rejection rate. */}
      {typeof metrics.guardrailRejectionRate === "number" && (
        <Stat
          label="Guardrail rejections"
          value={`${(metrics.guardrailRejectionRate * 100).toFixed(1)}%`}
        />
      )}
      {warnings.length > 0 && (
        <div
          className="ml-auto flex shrink-0 items-center gap-1.5 text-status-degraded"
          title={warnings.join(" ")}
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          <p className="max-w-40 truncate text-xs">{warnings.join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

/**
 * The scenario's pass/fail + star readout, always visible here regardless
 * of what's selected in the Inspector — the authoritative version of this
 * (with Compare/Restart/full detail) lives in InspectorPanel.tsx's
 * ScenarioBriefing, but that panel only renders when *no* node is
 * selected, which is rarely true the moment a student finishes wiring up
 * a build and hits Run. This is the copy nobody has to go deselect
 * everything to find.
 */
function ScenarioScoreStat({
  scenario,
  result,
  nodes,
  edges,
}: {
  scenario: Scenario;
  result: SimulationResult;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}) {
  const budgetCheckingEnabled = useWorkshopStore((s) => s.budgetCheckingEnabled);
  const score = scoreScenario(scenario, result, nodes, edges, !budgetCheckingEnabled);
  const color = score.legendary
    ? "text-signal"
    : score.gatesPassed
      ? "text-status-healthy"
      : "text-text-subtle";
  const label = score.legendary
    ? "★★★★★ LEGENDARY"
    : score.gatesPassed
      ? `${"★".repeat(score.stars)}${"☆".repeat(3 - score.stars)}`
      : "Not solved yet";

  return (
    <div className="flex flex-col gap-1 border-r border-border pr-6">
      <span className="text-xs uppercase tracking-wide text-text-subtle">
        {scenario.title}
      </span>
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-text-subtle">{label}</span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  );
}

function StatWithSparkline({
  label,
  value,
  data,
  cursorTime,
  formatValue,
}: {
  label: string;
  value: string;
  data: SparklinePoint[];
  cursorTime: number | null;
  formatValue: (value: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-text-subtle">{label}</span>
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-sm font-medium text-text">{value}</span>
        <Sparkline
          data={data}
          width={72}
          height={24}
          cursorTime={cursorTime}
          formatValue={formatValue}
          formatTime={formatTime}
        />
      </div>
    </div>
  );
}
