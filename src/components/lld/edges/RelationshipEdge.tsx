import { useId } from "react";
import type { ReactNode } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import {
  FilledDiamondMarker,
  HollowDiamondMarker,
  HollowTriangleMarker,
  OpenArrowMarker,
} from "@/components/content/diagrams/UmlMarkers";
import { createRelationshipEdgeData } from "@/lld-modeling/types";
import type { RelationshipEdge as RelationshipEdgeModel } from "@/store/lldStore";

/**
 * Renders one of the 6 UML relationship kinds with correct arrow/line
 * semantics, reusing the exact marker components `UmlDiagram.tsx` already
 * draws in `/lld`'s lesson content (`UmlMarkers.tsx`) instead of redrawing
 * diamond/triangle/arrow SVG paths a second time.
 *
 * Marker placement follows `UmlRelationship`'s own `from`/`to` convention
 * (see lesson 4, `content/shared/lesson.ts`): the diamond sits at the
 * "whole" end (`source`, since that's naturally where you'd start
 * dragging "ParkingLot has ParkingFloor" from), the triangle/open-arrow
 * sit at the "to" end (`target` — the superclass/interface/depended-on
 * class).
 */
export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<RelationshipEdgeModel>) {
  const uid = useId();
  const edgeData = data ?? createRelationshipEdgeData();
  const { kind, fromMultiplicity, toMultiplicity, label } = edgeData;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const dashed = kind === "realization" || kind === "dependency";
  const diamondId = `rel-diamond-${uid}`;
  const triangleId = `rel-triangle-${uid}`;
  const openArrowId = `rel-open-arrow-${uid}`;

  let markerStart: string | undefined;
  let markerEnd: string | undefined;
  let markerDefs: ReactNode = null;
  const tone = selected ? "signal" : "neutral";

  switch (kind) {
    case "aggregation":
      markerStart = `url(#${diamondId})`;
      markerDefs = <HollowDiamondMarker id={diamondId} tone={tone} />;
      break;
    case "composition":
      markerStart = `url(#${diamondId})`;
      markerDefs = <FilledDiamondMarker id={diamondId} tone={tone} />;
      break;
    case "inheritance":
    case "realization":
      markerEnd = `url(#${triangleId})`;
      markerDefs = <HollowTriangleMarker id={triangleId} tone={tone} />;
      break;
    case "dependency":
      markerEnd = `url(#${openArrowId})`;
      markerDefs = <OpenArrowMarker id={openArrowId} tone={tone} />;
      break;
    case "association":
      break;
  }

  // Multiplicities sit near each endpoint, inset slightly along the
  // straight line toward the midpoint so they don't overlap the marker
  // itself — the same inward-offset idea `UmlDiagram.tsx` uses, adapted
  // from that component's fixed horizontal layout to an arbitrary bezier.
  const fromLabelX = sourceX + (labelX - sourceX) * 0.18;
  const fromLabelY = sourceY + (labelY - sourceY) * 0.18;
  const toLabelX = targetX + (labelX - targetX) * 0.18;
  const toLabelY = targetY + (labelY - targetY) * 0.18;

  return (
    <>
      {markerDefs}
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          strokeDasharray: dashed ? "4 3" : undefined,
          strokeWidth: selected ? 2 : 1.5,
        }}
        className={selected ? "!stroke-signal" : "!stroke-border-hover"}
      />
      <EdgeLabelRenderer>
        {label && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 bg-bg-panel px-1 font-mono text-[10px] font-medium text-text-subtle"
            style={{ left: labelX, top: labelY }}
          >
            {label}
          </div>
        )}
        {fromMultiplicity && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 bg-bg-panel px-0.5 font-mono text-[9px] text-text-subtle"
            style={{ left: fromLabelX, top: fromLabelY }}
          >
            {fromMultiplicity}
          </div>
        )}
        {toMultiplicity && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 bg-bg-panel px-0.5 font-mono text-[9px] text-text-subtle"
            style={{ left: toLabelX, top: toLabelY }}
          >
            {toMultiplicity}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
