import { svgResponsiveProps } from "../primitives";
import type { TimelineStep } from "@/content/shared/lesson";

/**
 * Proportional horizontal bars for a sequence of durations — Lesson 3's
 * "complete picture with timings" was a plain table before this (a reader
 * had to mentally compare "~1ms" against "~300ms" across eight rows to
 * find the bottleneck); a bar chart shows it at a glance instead.
 *
 * Bar length scales by `sqrt(ms)`, not `ms` directly — this data spans
 * three orders of magnitude (a ~1ms cache check next to a ~300ms render
 * step), and a linear scale would render the small end as literally
 * invisible slivers. `sqrt` compresses that range enough that every step
 * still reads as a real bar while preserving the actual ordering.
 */

const ROW_H = 30;
const LABEL_W = 150;
const BAR_MAX_W = 260;
const BAR_START_X = LABEL_W + 10;
const RANGE_COL_W = 130;
const PAD = 16;
const MIN_BAR_W = 6;

export function TimelineDiagram({ steps }: { steps: TimelineStep[] }) {
  const scaled = steps.map((s) => Math.sqrt(Math.max(s.ms, 0.001)));
  const maxScaled = Math.max(...scaled);
  const width = BAR_START_X + BAR_MAX_W + RANGE_COL_W + PAD;
  const height = steps.length * ROW_H + PAD * 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      {...svgResponsiveProps(width, height)}
      className="text-text-muted"
      role="img"
      aria-label={`Timing breakdown: ${steps.map((s) => `${s.label} ${s.rangeLabel}`).join(", ")}.`}
    >
      {steps.map((step, i) => {
        const y = PAD + i * ROW_H;
        const cy = y + ROW_H / 2;
        const barW = Math.max((scaled[i] / maxScaled) * BAR_MAX_W, MIN_BAR_W);
        const barFill =
          step.tone === "signal"
            ? "fill-signal"
            : step.tone === "healthy"
              ? "fill-status-healthy"
              : step.tone === "critical"
                ? "fill-status-critical"
                : "fill-border-hover";
        return (
          <g key={i}>
            <text x={LABEL_W} y={cy + 4} textAnchor="end" className="fill-text text-[11px] font-medium">
              {step.label}
            </text>
            <rect x={BAR_START_X} y={y + 7} width={barW} height={ROW_H - 16} rx={2} className={barFill} />
            <text x={BAR_START_X + barW + 8} y={cy + 4} className="fill-text-subtle text-[10px]">
              {step.rangeLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
