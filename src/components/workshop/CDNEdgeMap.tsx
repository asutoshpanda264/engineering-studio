import type { CDNEdgeMetrics } from "@/simulation/types";

/**
 * Schematic (not geographic) view of a CDN's edges — a radial diagram,
 * not a real map. Distance from center = that edge's configured
 * latency-to-user (farther = slower); dot color = that edge's real hit
 * rate from the last run, derived from actual CACHE_HIT/CACHE_MISS
 * events (MetricsCollector), not invented. Gray means the edge hasn't
 * seen a request yet.
 */

const SIZE = 200;
const CENTER = SIZE / 2;
const MIN_RADIUS = 26;
const MAX_RADIUS = 88;

export interface CDNEdgeMapProps {
  edgeLatencyMs: number[];
  edgeMetrics?: CDNEdgeMetrics[];
}

export function CDNEdgeMap({ edgeLatencyMs, edgeMetrics }: CDNEdgeMapProps) {
  const minLatency = Math.min(...edgeLatencyMs);
  const maxLatency = Math.max(...edgeLatencyMs);
  const metricsByEdge = new Map(edgeMetrics?.map((m) => [m.edgeIndex, m]));

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full"
        role="img"
        aria-label="Diagram of CDN edges by distance and hit rate"
      >
        {edgeLatencyMs.map((latencyMs, index) => {
          const radius = latencyToRadius(latencyMs, minLatency, maxLatency);
          const angle = -90 + (360 * index) / edgeLatencyMs.length;
          const { x, y } = polarToCartesian(angle, radius);
          const metrics = metricsByEdge.get(index);

          return (
            <g key={index}>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                className="stroke-border"
                strokeDasharray="2 3"
              />
              <circle
                cx={x}
                cy={y}
                r={7}
                className={hitRateFillClass(metrics)}
                stroke="var(--color-bg-panel)"
                strokeWidth={1.5}
              >
                <title>
                  {`Edge ${index + 1}: ${latencyMs}ms latency` +
                    (metrics && metrics.requests > 0
                      ? `, ${(metrics.hitRate * 100).toFixed(0)}% hit rate (${metrics.requests} requests)`
                      : ", no requests yet")}
                </title>
              </circle>
              <text
                x={x}
                y={y + 18}
                textAnchor="middle"
                className="fill-text-subtle text-[9px]"
              >
                {latencyMs}ms
              </text>
            </g>
          );
        })}

        <circle cx={CENTER} cy={CENTER} r={16} className="fill-bg-panel stroke-border" />
        <text
          x={CENTER}
          y={CENTER + 3}
          textAnchor="middle"
          className="fill-text-muted text-[9px] font-medium"
        >
          CDN
        </text>
      </svg>

      <div className="flex items-center justify-center gap-3 text-[10px] text-text-subtle">
        <LegendDot className="bg-success" label="Hot (≥70% hits)" />
        <LegendDot className="bg-warning" label="Warm" />
        <LegendDot className="bg-error" label="Cold (<30% hits)" />
        <LegendDot className="bg-text-subtle" label="No data" />
      </div>
      <p className="text-center text-[10px] text-text-subtle">
        Distance from center = latency to user · color = hit rate
      </p>
    </div>
  );
}

function latencyToRadius(latencyMs: number, min: number, max: number): number {
  if (max === min) return (MIN_RADIUS + MAX_RADIUS) / 2;
  const t = (latencyMs - min) / (max - min);
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

function polarToCartesian(angleDegrees: number, radius: number): { x: number; y: number } {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRadians),
    y: CENTER + radius * Math.sin(angleRadians),
  };
}

function hitRateFillClass(metrics: CDNEdgeMetrics | undefined): string {
  if (!metrics || metrics.requests === 0) return "fill-text-subtle";
  if (metrics.hitRate >= 0.7) return "fill-success";
  if (metrics.hitRate >= 0.3) return "fill-warning";
  return "fill-error";
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`size-1.5 rounded-full ${className}`} aria-hidden />
      {label}
    </span>
  );
}
