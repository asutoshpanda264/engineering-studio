"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowMarker, estimateMaxChars, svgResponsiveProps, wrapText } from "../primitives";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import type { FlowStep } from "@/content/shared/lesson";

/**
 * Generic numbered vertical sequence — "step 1 → step 2 → ..." — the
 * workhorse shape for any strictly linear, top-to-bottom process. Same
 * vertical-rail layout as the DNS pilot's `DnsResolutionFlowDiagram`,
 * generalized: every step gets a numbered ring uniformly, no special-cased
 * start/end step.
 *
 * Every step's box height is computed from its own wrapped title/detail
 * line count (`wrapText`, `estimateMaxChars`), not a fixed constant — a
 * one-line title and a five-line title get correctly different box
 * heights, and text can no longer render past a box's own edge the way an
 * earlier unwrapped-`<text>` version of this component did. `entityType`
 * is optional per step (same opt-in shape `ArchNode.entityType` already
 * uses for `ArchitectureDiagram`) — draws the real catalog icon as a
 * small tone-colored mark on the box's left edge instead of leaving every
 * step visually identical.
 *
 * `animated` adds a request traveling down the rail, on a loop, pulsing
 * each ring as it passes — same declarative keyframe-array + `times`
 * pattern `HeroDiagram`'s `Packet` uses, so a step's ring lights up right
 * when the dot reaches it instead of needing separate state/timers. Now
 * timed by each step's actual vertical position (not an equal 1/N split)
 * so the dot travels at a visually constant speed even though box heights
 * vary. Static by default (and always static under `prefers-reduced-
 * motion`) since most flows are just a numbered checklist, not a single
 * causal chain worth animating — see the `animated` doc on the `flow`
 * block kind.
 */

const RAIL_X = 26;
const TOP = 24;
const BOTTOM_PAD = 16;
const GAP = 26; // vertical gap between one step's box and the next
const BOX_X = 56;
const BOX_W = 590;
const BOX_PAD_X = 14;
const BOX_PAD_Y = 12;
const TITLE_LINE_H = 15;
const DETAIL_GAP = 5; // extra space between the last title line and the first detail line
const DETAIL_LINE_H = 13;
const ICON_SIZE = 13;

const TITLE_MAX_LINES = 2;
const DETAIL_MAX_LINES = 3;

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

const iconClassFor = (tone?: FlowStep["tone"]) =>
  tone === "signal"
    ? "text-signal"
    : tone === "healthy"
      ? "text-status-healthy"
      : tone === "critical"
        ? "text-status-critical"
        : "text-text-subtle";

interface StepLayout {
  step: FlowStep;
  titleLines: string[];
  detailLines: string[];
  boxY: number;
  boxH: number;
  cy: number;
  textX: number;
}

// Room ceded to a left-edge icon, when a step draws one — text starts
// this much further right, so it gets a correspondingly smaller char
// budget per line rather than risk overflowing past the icon's column.
const ICON_TEXT_INSET = 18;

function layoutSteps(steps: FlowStep[]): { layouts: StepLayout[]; totalHeight: number } {
  const innerW = BOX_W - BOX_PAD_X * 2;
  const maxCharsFor = (fontSizePx: number, hasIcon: boolean) =>
    estimateMaxChars(hasIcon ? innerW - ICON_TEXT_INSET : innerW, fontSizePx);

  let cursorY = TOP;
  const layouts: StepLayout[] = steps.map((step) => {
    const hasIcon = step.entityType !== undefined;
    const titleLines = wrapText(step.title, maxCharsFor(11, hasIcon), TITLE_MAX_LINES);
    const detailLines = step.detail ? wrapText(step.detail, maxCharsFor(9.5, hasIcon), DETAIL_MAX_LINES) : [];
    const boxH =
      BOX_PAD_Y * 2 +
      titleLines.length * TITLE_LINE_H +
      (detailLines.length > 0 ? DETAIL_GAP + detailLines.length * DETAIL_LINE_H : 0);
    const boxY = cursorY;
    const cy = boxY + boxH / 2;
    cursorY = boxY + boxH + GAP;
    return { step, titleLines, detailLines, boxY, boxH, cy, textX: BOX_X + (hasIcon ? 32 : BOX_PAD_X) };
  });

  return { layouts, totalHeight: cursorY - GAP + BOTTOM_PAD };
}

export function FlowDiagram({ steps, animated = false }: { steps: FlowStep[]; animated?: boolean }) {
  const arrowId = `flow-arrow-${useId()}`;
  const prefersReducedMotion = useReducedMotion();
  const playing = animated && !prefersReducedMotion && steps.length > 1;

  const { layouts, totalHeight } = layoutSteps(steps);
  const cys = layouts.map((l) => l.cy);
  const span = cys[cys.length - 1] - cys[0] || 1;
  // Timed by actual vertical distance (not an equal 1/N split per step) so
  // the traveling dot moves at a visually constant speed regardless of how
  // tall any individual step's box turned out to be.
  const times = cys.map((cy) => (cy - cys[0]) / span);
  const duration = Math.max(steps.length * 0.9, 1.4);

  return (
    <svg
      viewBox={`0 0 680 ${totalHeight}`}
      {...svgResponsiveProps(680, totalHeight)}
      className="text-text-muted"
      role="img"
      aria-label={`Step-by-step flow: ${steps.map((step) => step.title).join(", then ")}.`}
    >
      <ArrowMarker id={arrowId} />

      <line x1={RAIL_X} y1={cys[0]} x2={RAIL_X} y2={cys[cys.length - 1]} strokeWidth={1} className="stroke-border" />

      {layouts.map((layout, i) => {
        const { step, titleLines, detailLines, boxY, boxH, cy, textX } = layout;
        const Icon = step.entityType ? getEntityCatalogItem(step.entityType).icon : undefined;
        const titleStartY = boxY + BOX_PAD_Y + TITLE_LINE_H * 0.72;
        const detailStartY = titleStartY + TITLE_LINE_H * (titleLines.length - 1) + DETAIL_GAP + DETAIL_LINE_H * 0.72;

        return (
          <g key={i}>
            {i > 0 && (
              <line
                x1={RAIL_X}
                y1={cys[i - 1] + 10}
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
              height={boxH}
              rx={3}
              strokeWidth={1}
              className={`fill-bg-elevated ${boxStrokeFor(step.tone)}`}
            />

            {Icon && (
              <Icon
                x={BOX_X + BOX_PAD_X}
                y={boxY + boxH / 2 - ICON_SIZE / 2}
                width={ICON_SIZE}
                height={ICON_SIZE}
                strokeWidth={2}
                className={iconClassFor(step.tone)}
                aria-hidden
              />
            )}

            {titleLines.map((line, li) => (
              <text
                key={li}
                x={textX}
                y={titleStartY + TITLE_LINE_H * li}
                className={`${textFillFor(step.tone)} text-[11px] font-medium`}
              >
                {line}
              </text>
            ))}
            {detailLines.map((line, li) => (
              <text key={li} x={textX} y={detailStartY + DETAIL_LINE_H * li} className="fill-text-subtle text-[9.5px]">
                {line}
              </text>
            ))}

            {playing && (
              <motion.rect
                x={BOX_X - 2}
                y={boxY - 2}
                width={BOX_W + 4}
                height={boxH + 4}
                rx={4}
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
          animate={{ cx: RAIL_X, cy: cys }}
          transition={{ duration, times, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}
