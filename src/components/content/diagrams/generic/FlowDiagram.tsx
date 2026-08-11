"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowMarker } from "../primitives";
import type { FlowStep } from "@/content/shared/lesson";

/**
 * Generic numbered vertical sequence — "step 1 → step 2 → ..." — the
 * workhorse shape for any strictly linear, top-to-bottom process. Same
 * vertical-rail layout as the DNS pilot's `DnsResolutionFlowDiagram`,
 * generalized: every step gets a numbered ring uniformly, no special-cased
 * start/end step.
 *
 * `animated` adds a request traveling down the rail, on a loop, pulsing
 * each ring as it passes — same declarative keyframe-array + `times`
 * pattern `HeroDiagram`'s `Packet` uses, so a step's ring lights up right
 * when the dot reaches it instead of needing separate state/timers. Static
 * by default (and always static under `prefers-reduced-motion`) since most
 * flows are just a numbered checklist, not a single causal chain worth
 * animating — see the `animated` doc on the `flow` block kind.
 */

const RAIL_X = 26;
const ROW_HEIGHT = 56;
const TOP = 24;
const BOX_X = 56;
const BOX_W = 590;
const BOX_H = 40;

const textFillFor = (tone?: FlowStep["tone"]) =>
  tone === "signal"
    ? "fill-signal"
    : tone === "healthy"
      ? "fill-status-healthy"
      : tone === "critical"
        ? "fill-status-critical"
        : "fill-text";

const ringClassFor = (tone?: FlowStep["tone"]) =>
  tone === "signal"
    ? "fill-bg stroke-signal"
    : tone === "healthy"
      ? "fill-bg stroke-status-healthy"
      : tone === "critical"
        ? "fill-bg stroke-status-critical"
        : "fill-bg stroke-border-hover";

const boxStrokeFor = (tone?: FlowStep["tone"]) =>
  tone === "signal"
    ? "stroke-signal"
    : tone === "healthy"
      ? "stroke-status-healthy"
      : tone === "critical"
        ? "stroke-status-critical"
        : "stroke-border";

export function FlowDiagram({ steps, animated = false }: { steps: FlowStep[]; animated?: boolean }) {
  const arrowId = `flow-arrow-${useId()}`;
  const prefersReducedMotion = useReducedMotion();
  const playing = animated && !prefersReducedMotion && steps.length > 1;
  const height = TOP + ROW_HEIGHT * (steps.length - 1) + BOX_H + 16;

  // Same shape as HeroDiagram's Packet: keyframe positions plus a matching
  // `times` array (0..1) so the dot's arrival at ring `i` and that ring's
  // opacity peak land on the exact same instant in the loop.
  const ringYs = steps.map((_, i) => TOP + ROW_HEIGHT * i);
  const times = steps.map((_, i) => i / (steps.length - 1));
  const duration = steps.length * 0.9;

  return (
    <svg
      viewBox={`0 0 680 ${height}`}
      className="h-auto w-full text-text-muted"
      role="img"
      aria-label={`Step-by-step flow: ${steps.map((step) => step.title).join(", then ")}.`}
    >
      <ArrowMarker id={arrowId} />

      <line
        x1={RAIL_X}
        y1={TOP}
        x2={RAIL_X}
        y2={TOP + ROW_HEIGHT * (steps.length - 1)}
        strokeWidth={1}
        className="stroke-border"
      />

      {steps.map((step, i) => {
        const cy = TOP + ROW_HEIGHT * i;
        const boxY = cy - BOX_H / 2;

        return (
          <g key={i}>
            {i > 0 && (
              <line
                x1={RAIL_X}
                y1={cy - ROW_HEIGHT + 10}
                x2={RAIL_X}
                y2={cy - 10}
                strokeWidth={1}
                className="stroke-border-hover"
                markerEnd={`url(#${arrowId})`}
              />
            )}
            <circle cx={RAIL_X} cy={cy} r={9} strokeWidth={1} className={ringClassFor(step.tone)} />
            <text x={RAIL_X} y={cy + 3} textAnchor="middle" className={`${textFillFor(step.tone)} text-[9px] font-medium`}>
              {i + 1}
            </text>

            <rect
              x={BOX_X}
              y={boxY}
              width={BOX_W}
              height={BOX_H}
              rx={2}
              strokeWidth={1}
              className={`fill-bg-elevated ${boxStrokeFor(step.tone)}`}
            />
            <text x={BOX_X + 12} y={boxY + (step.detail ? 16 : 24)} className={`${textFillFor(step.tone)} text-[11px] font-medium`}>
              {step.title}
            </text>
            {step.detail && (
              <text x={BOX_X + 12} y={boxY + 30} className="fill-text-subtle text-[9.5px]">
                {step.detail}
              </text>
            )}

            {playing && (
              <motion.rect
                x={BOX_X - 2}
                y={boxY - 2}
                width={BOX_W + 4}
                height={BOX_H + 4}
                rx={3}
                fill="none"
                strokeWidth={1.5}
                style={{ stroke: "var(--color-signal)" }}
                initial={false}
                animate={{ opacity: times.map((_, k) => (k === i ? 1 : 0)) }}
                transition={{ duration, times, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
              />
            )}
          </g>
        );
      })}

      {playing && (
        <motion.circle
          r={4.5}
          style={{ fill: "var(--color-signal)", filter: "drop-shadow(0 0 4px var(--color-signal))" }}
          initial={false}
          animate={{ cx: RAIL_X, cy: ringYs }}
          transition={{ duration, times, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}
