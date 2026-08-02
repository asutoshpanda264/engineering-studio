import type { ArchitectureComparison } from "@/simulation/types";

/**
 * "Why does this CDN matter?" — a real, measured before/after, not an
 * assertion. Built from re-running the exact same architecture with the
 * CDN spliced out (compareArchitectures.ts, same seed, same traffic), so
 * the only thing that changed between the two bars is whether the CDN
 * exists. If it isn't actually helping, this says so honestly instead of
 * always painting the CDN as a win.
 */
export function CDNImpactComparison({
  comparison,
}: {
  comparison: ArchitectureComparison;
}) {
  const { withAverageLatency, withoutAverageLatency } = comparison;
  const maxLatency = Math.max(withAverageLatency, withoutAverageLatency, 1);
  const delta = withoutAverageLatency - withAverageLatency;
  const percent =
    withoutAverageLatency > 0 ? (Math.abs(delta) / withoutAverageLatency) * 100 : 0;
  const helping = delta > 0.5; // ignore noise-level differences

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`rounded-md border px-3 py-2 text-xs font-medium ${
          helping
            ? "border-success/30 bg-success/10 text-success"
            : "border-warning/30 bg-warning/10 text-warning"
        }`}
      >
        {helping
          ? `${delta.toFixed(1)}ms faster with this CDN (${percent.toFixed(0)}% less latency).`
          : `This CDN isn't helping much right now (${Math.abs(delta).toFixed(1)}ms ${delta < 0 ? "slower" : "difference"}) — try a smaller Key Pool Size on the Client, or a higher Capacity here, so more requests actually hit.`}
      </div>

      <LatencyBar
        label="Without CDN (direct to origin)"
        valueMs={withoutAverageLatency}
        maxMs={maxLatency}
        barClassName="bg-text-subtle"
      />
      <LatencyBar
        label="With CDN"
        valueMs={withAverageLatency}
        maxMs={maxLatency}
        barClassName={helping ? "bg-success" : "bg-warning"}
      />
    </div>
  );
}

function LatencyBar({
  label,
  valueMs,
  maxMs,
  barClassName,
}: {
  label: string;
  valueMs: number;
  maxMs: number;
  barClassName: string;
}) {
  const widthPercent = maxMs > 0 ? Math.max(2, (valueMs / maxMs) * 100) : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px] text-text-subtle">
        <span>{label}</span>
        <span className="font-medium text-text">{valueMs.toFixed(1)} ms</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-panel">
        <div
          className={`h-full rounded-full transition-[width] duration-normal ease-standard ${barClassName}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}
