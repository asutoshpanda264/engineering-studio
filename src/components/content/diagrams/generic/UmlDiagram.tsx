import { useId, type ReactNode } from "react";
import { DiagramBox, svgResponsiveProps } from "../primitives";
import { FilledDiamondMarker, HollowDiamondMarker, HollowTriangleMarker, OpenArrowMarker } from "../UmlMarkers";
import type { UmlRelationship } from "@/content/shared/lesson";

/**
 * Generic UML class-relationship notation (LLD only) — one relationship
 * per horizontal row, `box(from) —connector— box(to)`, stacked vertically.
 * Connector line style and end marker follow standard UML notation per
 * relationship kind — see DIAGRAM-CONVERSION-PLAN.md §3's table.
 */

const ROW_HEIGHT = 76;
const BOX_W = 160;
const BOX_H = 40;
const WIDTH = 620;
const LEFT_X = 16;
const RIGHT_X = WIDTH - LEFT_X - BOX_W;
const TOP_PAD = 20;

export function UmlDiagram({ relationships }: { relationships: UmlRelationship[] }) {
  const uid = useId();
  const height = TOP_PAD + ROW_HEIGHT * relationships.length;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      {...svgResponsiveProps(WIDTH, height)}
      className="text-text-muted"
      role="img"
      aria-label={`UML relationships: ${relationships.map((r) => `${r.from} ${r.kind} ${r.to}`).join("; ")}.`}
    >
      {relationships.map((rel, i) => {
        const diamondId = `uml-diamond-${uid}-${i}`;
        const triangleId = `uml-triangle-${uid}-${i}`;
        const openArrowId = `uml-open-arrow-${uid}-${i}`;
        const cy = TOP_PAD + ROW_HEIGHT * i + BOX_H / 2;
        const x1 = LEFT_X + BOX_W;
        const x2 = RIGHT_X;
        const dashed = rel.kind === "realization" || rel.kind === "dependency";

        let markerStart: string | undefined;
        let markerEnd: string | undefined;
        let markerDefs: ReactNode = null;

        switch (rel.kind) {
          case "aggregation":
            markerStart = diamondId;
            markerDefs = <HollowDiamondMarker id={diamondId} />;
            break;
          case "composition":
            markerStart = diamondId;
            markerDefs = <FilledDiamondMarker id={diamondId} />;
            break;
          case "inheritance":
          case "realization":
            markerEnd = triangleId;
            markerDefs = <HollowTriangleMarker id={triangleId} />;
            break;
          case "dependency":
            markerEnd = openArrowId;
            markerDefs = <OpenArrowMarker id={openArrowId} />;
            break;
          case "association":
            break;
        }

        return (
          <g key={i}>
            {markerDefs}
            <DiagramBox x={LEFT_X} y={cy - BOX_H / 2} width={BOX_W} height={BOX_H} lines={[rel.from]} />
            <DiagramBox x={RIGHT_X} y={cy - BOX_H / 2} width={BOX_W} height={BOX_H} lines={[rel.to]} />

            <line
              x1={x1}
              y1={cy}
              x2={x2}
              y2={cy}
              strokeWidth={1}
              strokeDasharray={dashed ? "3 3" : undefined}
              className="stroke-border-hover"
              markerStart={markerStart ? `url(#${markerStart})` : undefined}
              markerEnd={markerEnd ? `url(#${markerEnd})` : undefined}
            />

            {rel.fromMultiplicity && (
              <text x={x1 + 8} y={cy - 6} className="fill-text-subtle text-[9px]">
                {rel.fromMultiplicity}
              </text>
            )}
            {rel.toMultiplicity && (
              <text x={x2 - 8} y={cy - 6} textAnchor="end" className="fill-text-subtle text-[9px]">
                {rel.toMultiplicity}
              </text>
            )}
            {rel.label && (
              <text x={(x1 + x2) / 2} y={cy - 6} textAnchor="middle" className="fill-text-subtle text-[9px] font-medium">
                {rel.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
