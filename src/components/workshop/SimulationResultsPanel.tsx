import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useWorkshopStore } from "@/store/workshopStore";
import { computeMetricsTimeSeries } from "@/simulation/metrics/MetricsTimeSeries";
import { Sparkline } from "@/components/ui/Sparkline";
import type { SparklinePoint } from "@/components/ui/Sparkline";

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
  const playbackTime = useWorkshopStore((s) => s.playbackState?.currentTime ?? null);
  const error = useWorkshopStore((s) => s.simulationError);
  const warnings = useWorkshopStore((s) => s.simulationResult?.warnings ?? NO_WARNINGS);

  const series = useMemo(() => {
    if (!simulationResult) return null;
    return computeMetricsTimeSeries(simulationResult.events, simulationResult.duration);
  }, [simulationResult]);

  if (error) {
    return (
      <div className="flex flex-1 items-center gap-2 px-4 text-error">
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
      {warnings.length > 0 && (
        <div
          className="ml-auto flex shrink-0 items-center gap-1.5 text-warning"
          title={warnings.join(" ")}
        >
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
      <span className="text-xs text-text-subtle">{label}</span>
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
