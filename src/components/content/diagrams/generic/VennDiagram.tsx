import { useId } from "react";
import type { VennPanel } from "@/content/shared/lesson";

/**
 * Two overlapping-circle Venn diagrams, one per panel — built for SQL JOIN
 * semantics (`09-sql-deep-dive.ts`'s JOINs section), where the existing
 * "A ∩ B" / "A" / "B" / "A ∪ B" notation table is accurate but asks the
 * reader to translate set notation into a mental picture themselves. A
 * shaded region does that translation for them.
 *
 * `overlap`-only highlighting (INNER JOIN) is the one case that isn't just
 * "fill one whole circle" — SVG has no boolean circle-intersection
 * primitive, so it's built from two nested `clipPath`s: a rect clipped by
 * circle A, then that already-clipped group clipped again by circle B,
 * which composes as an intersection rather than a union.
 */

const R = 42;
const CENTER_DIST = 48;
const PANEL_W = 200;
const PANEL_H = 130;
const TITLE_H = 20;

export function VennDiagram({ panels }: { panels: VennPanel[] }) {
  const baseId = useId();

  return (
    <div
      className="flex flex-wrap items-start gap-x-8 gap-y-6"
      role="img"
      aria-label={`${panels.map((p) => p.title).join(", ")} Venn diagrams.`}
    >
      {panels.map((panel, i) => {
        const clipLeftId = `venn-left-${baseId}-${i}`;
        const clipRightId = `venn-right-${baseId}-${i}`;
        const cx = PANEL_W / 2;
        const cy = TITLE_H + PANEL_H / 2 - 6;
        const leftCx = cx - CENTER_DIST / 2;
        const rightCx = cx + CENTER_DIST / 2;
        const svgH = TITLE_H + PANEL_H;

        return (
          <svg
            key={i}
            viewBox={`0 0 ${PANEL_W} ${svgH}`}
            width={PANEL_W}
            height={svgH}
            style={{ width: "100%", maxWidth: PANEL_W, height: "auto" }}
            className="min-w-0 shrink text-text-muted"
            aria-hidden
          >
            <defs>
              <clipPath id={clipLeftId}>
                <circle cx={leftCx} cy={cy} r={R} />
              </clipPath>
              <clipPath id={clipRightId}>
                <circle cx={rightCx} cy={cy} r={R} />
              </clipPath>
            </defs>

            <text x={cx} y={TITLE_H - 6} textAnchor="middle" className="fill-text text-[11px] font-semibold uppercase tracking-wide">
              {panel.title}
            </text>

            {(panel.highlight === "left" || panel.highlight === "all") && (
              <circle cx={leftCx} cy={cy} r={R} className="fill-signal opacity-50" />
            )}
            {(panel.highlight === "right" || panel.highlight === "all") && (
              <circle cx={rightCx} cy={cy} r={R} className="fill-signal opacity-50" />
            )}
            {panel.highlight === "overlap" && (
              <g clipPath={`url(#${clipLeftId})`}>
                <g clipPath={`url(#${clipRightId})`}>
                  <rect x={0} y={0} width={PANEL_W} height={svgH} className="fill-signal opacity-60" />
                </g>
              </g>
            )}

            {/* Outlines drawn last so the highlight fill never covers them. */}
            <circle cx={leftCx} cy={cy} r={R} className="fill-none stroke-border-hover" strokeWidth={1} />
            <circle cx={rightCx} cy={cy} r={R} className="fill-none stroke-border-hover" strokeWidth={1} />

            <text x={leftCx - 16} y={cy + 4} textAnchor="middle" className="fill-text text-[10px] font-medium">
              {panel.leftLabel}
            </text>
            <text x={rightCx + 16} y={cy + 4} textAnchor="middle" className="fill-text text-[10px] font-medium">
              {panel.rightLabel}
            </text>

            {panel.subtitle && (
              <text x={cx} y={svgH - 4} textAnchor="middle" className="fill-text-subtle text-[9px]">
                {panel.subtitle}
              </text>
            )}
          </svg>
        );
      })}
    </div>
  );
}
