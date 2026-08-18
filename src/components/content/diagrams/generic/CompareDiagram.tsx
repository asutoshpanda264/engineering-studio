import { useId } from "react";
import { ArrowMarker } from "../primitives";
import { archNodeExtent, ArchitectureLayer } from "./ArchitectureDiagram";
import type { ComparePanel } from "@/content/shared/lesson";

/**
 * Side-by-side panels — before/after, A-vs-B, a short 2-3 stage journey.
 * Each panel is a small architecture topology in its own right, with a
 * small uppercase title above it (same treatment the DNS-failover pilot
 * used for its two panels) and an optional `transitionLabel` centered in
 * the gap between panel 0 and 1 only.
 *
 * One `<svg>` PER PANEL in a `flex flex-wrap` row, not one shared wide
 * `<svg>` sized to every panel's combined width. The previous single-svg
 * version used `svgResponsiveProps`'s "never shrink below native size"
 * rule (see primitives.tsx) against the *combined* width of all panels —
 * for a two-panel compare that combined width routinely exceeds the
 * ~600px article column, so the second panel was pushed off the visible
 * edge behind a horizontal scrollbar most readers never notice (they'd
 * see panel one and an arrow trailing off into nothing). Splitting into
 * one svg per panel and capping each one's own CSS width at its own
 * native pixel size — `width: 100%; max-width: <native>px` — means: with
 * room for both, they sit side by side at crisp native size (no squish,
 * no scroll); without room for both but room for each alone, `flex-wrap`
 * drops the second panel to its own line, still fully visible; only a
 * single panel wider than the viewport itself ever needs to shrink below
 * native, and it does so proportionally via its own viewBox rather than
 * clipping.
 */

const PAD = 16;
const TITLE_H = 22;

export function CompareDiagram({ panels, transitionLabel }: { panels: ComparePanel[]; transitionLabel?: string[] }) {
  const baseId = useId();
  const extents = panels.map((panel) => archNodeExtent(panel.nodes));
  // Every panel's svg shares one height so a before/after pair's rows line
  // up even when one panel has fewer nodes than the other.
  const panelHeight = Math.max(...extents.map((e) => e.height));
  const svgHeight = TITLE_H + PAD * 2 + panelHeight;

  return (
    <div
      className="flex flex-wrap items-center gap-x-16 gap-y-8"
      role="img"
      aria-label={`${panels.map((p) => p.title).join(" versus ")} comparison.`}
    >
      {panels.map((panel, i) => {
        const arrowId = `compare-arrow-${baseId}-${i}`;
        const svgWidth = extents[i].width + PAD * 2;
        return (
          <div key={i} className="flex min-w-0 items-center gap-x-4">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              width={svgWidth}
              height={svgHeight}
              style={{ width: "100%", maxWidth: svgWidth, height: "auto" }}
              className="min-w-0 shrink text-text-muted"
              aria-hidden
            >
              <ArrowMarker id={arrowId} />
              <text x={PAD} y={TITLE_H - 8} className="fill-text-subtle text-[10px] font-medium uppercase tracking-wide">
                {panel.title}
              </text>
              <ArchitectureLayer nodes={panel.nodes} edges={panel.edges} arrowId={arrowId} originX={PAD} originY={TITLE_H + PAD} />
            </svg>

            {transitionLabel && i === 0 && panels.length > 1 && (
              <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 self-center text-center">
                {transitionLabel.map((line, li) => (
                  <span key={li} className="text-[9px] font-medium leading-tight text-signal">
                    {line}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
