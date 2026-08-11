import { useId } from "react";
import { ArrowMarker } from "../primitives";
import { archNodeExtent, ArchitectureLayer } from "./ArchitectureDiagram";
import type { ComparePanel } from "@/content/shared/lesson";

/**
 * Side-by-side panels — before/after, A-vs-B, a short 2-3 stage journey.
 * Each panel is a small architecture topology in its own right, laid out
 * left to right with a small uppercase title above each (same treatment
 * the DNS-failover pilot used for its two panels) and an optional
 * `transitionLabel` centered in the gap between panel 0 and 1 only.
 */

const PAD = 16;
const GAP = 100;
const TITLE_H = 22;

export function CompareDiagram({ panels, transitionLabel }: { panels: ComparePanel[]; transitionLabel?: string[] }) {
  const arrowId = `compare-arrow-${useId()}`;
  const extents = panels.map((panel) => archNodeExtent(panel.nodes));
  const panelWidth = Math.max(...extents.map((e) => e.width));
  const panelHeight = Math.max(...extents.map((e) => e.height));
  const originX = (i: number) => PAD + i * (panelWidth + GAP);
  const width = PAD * 2 + panels.length * panelWidth + (panels.length - 1) * GAP;
  const height = TITLE_H + PAD * 2 + panelHeight;

  const midX = originX(0) + panelWidth + GAP / 2;
  const midY = TITLE_H + PAD + panelHeight / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full text-text-muted"
      role="img"
      aria-label={`${panels.map((p) => p.title).join(" versus ")} comparison.`}
    >
      <ArrowMarker id={arrowId} />

      {panels.map((panel, i) => (
        <g key={i}>
          <text x={originX(i)} y={TITLE_H - 8} className="fill-text-subtle text-[10px] font-medium uppercase tracking-wide">
            {panel.title}
          </text>
          <ArchitectureLayer nodes={panel.nodes} edges={panel.edges} arrowId={arrowId} originX={originX(i)} originY={TITLE_H + PAD} />
        </g>
      ))}

      {transitionLabel && panels.length > 1 && (
        <g>
          {transitionLabel.map((line, i) => (
            <text
              key={i}
              x={midX}
              y={midY - ((transitionLabel.length - 1) * 12) / 2 + i * 12}
              textAnchor="middle"
              className="fill-signal text-[9px] font-medium"
            >
              {line}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
