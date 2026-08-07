import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { computeEdgePositions } from "@/simulation/entities/CDN";
import type { CDNEdgeMetrics } from "@/simulation/types";

/**
 * An interactive, schematic (not geographic) 0–100 plane, not a real map.
 * Edges sit at fixed, auto-arranged positions (same ring `CDN.ts` itself
 * routes against — computeEdgePositions, imported rather than
 * recomputed, so this diagram can never drift from what's actually
 * simulated). The User and Origin are real, draggable pins: dragging the
 * User pin changes both the per-edge latency numbers (nearest edge = min
 * latency) *and* which edge gets more traffic (proximity-weighted
 * routing — see CDN.ts's class doc) — the map isn't just a picture of
 * the simulation, it's a control for it.
 *
 * Request count and hit rate are printed under every edge, not hidden
 * behind hover. Any edge that had at least one miss gets a line back to
 * the Origin pin (opacity scaled by that edge's miss count), so a miss
 * reads as a visible round trip rather than just a colder dot.
 *
 * `activeEdge` (from InspectorPanel's useCDNActivePulse) turns the
 * aggregate hit-rate color into a live event: whichever edge the CDN's
 * most recent request landed on, as playback passes that moment, gets a
 * one-shot ping — green for a hit, red plus a brightened Origin line for
 * a miss.
 */

const PLANE = 100;
const PAD_LEFT = 10;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
/** Extra room below the plane for two-line edge stat labels and the
 * pin-position controls that follow the diagram. */
const PAD_BOTTOM = 32;
const VIEW_BOX = `${-PAD_LEFT} ${-PAD_TOP} ${PLANE + PAD_LEFT + PAD_RIGHT} ${PLANE + PAD_TOP + PAD_BOTTOM}`;

export interface CDNEdgeMapProps {
  edgeCount: number;
  edgeLatencyMs: number[];
  edgeMetrics?: CDNEdgeMetrics[];
  userX: number;
  userY: number;
  originX: number;
  originY: number;
  onMoveUser: (x: number, y: number) => void;
  onMoveOrigin: (x: number, y: number) => void;
  onReset: () => void;
  /** The edge (and hit/miss outcome) the playback cursor is passing over
   * right now, if any — see the class doc above. */
  activeEdge?: { edgeIndex: number; hit: boolean } | null;
}

export function CDNEdgeMap({
  edgeCount,
  edgeLatencyMs,
  edgeMetrics,
  userX,
  userY,
  originX,
  originY,
  onMoveUser,
  onMoveOrigin,
  onReset,
  activeEdge,
}: CDNEdgeMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingPin, setDraggingPin] = useState<"user" | "origin" | null>(null);
  const positions = computeEdgePositions(edgeCount);
  const metricsByEdge = new Map(edgeMetrics?.map((m) => [m.edgeIndex, m]));
  const maxMisses = Math.max(1, ...(edgeMetrics ?? []).map((m) => m.misses));
  const user = { x: userX, y: userY };
  const origin = { x: originX, y: originY };
  const activeEdgePos =
    activeEdge && activeEdge.edgeIndex < positions.length ? positions[activeEdge.edgeIndex] : null;

  return (
    <div className="flex flex-col gap-2">
      <svg
        ref={svgRef}
        viewBox={VIEW_BOX}
        className="w-full touch-none"
        role="img"
        aria-label="Interactive map: drag the User and Origin pins to see how proximity changes which CDN edge is used"
      >
        <rect
          x={0}
          y={0}
          width={PLANE}
          height={PLANE}
          className="fill-bg-elevated stroke-border"
          strokeWidth={0.5}
        />

        {/* Latency source: every edge's distance to the User pin. */}
        {positions.map((pos, index) => (
          <line
            key={`user-${index}`}
            x1={user.x}
            y1={user.y}
            x2={pos.x}
            y2={pos.y}
            className="stroke-border"
            strokeWidth={0.5}
            strokeDasharray="1.5 2"
          />
        ))}

        {/* Miss round trips: only edges that actually fell through. */}
        {positions.map((pos, index) => {
          const metrics = metricsByEdge.get(index);
          if (!metrics || metrics.misses === 0) return null;
          const opacity = 0.25 + 0.55 * (metrics.misses / maxMisses);
          return (
            <line
              key={`origin-${index}`}
              x1={pos.x}
              y1={pos.y}
              x2={origin.x}
              y2={origin.y}
              className="stroke-warning"
              strokeWidth={0.9}
              strokeOpacity={opacity}
            />
          );
        })}

        {activeEdgePos && activeEdge && !activeEdge.hit && (
          <line
            x1={activeEdgePos.x}
            y1={activeEdgePos.y}
            x2={origin.x}
            y2={origin.y}
            className="stroke-error animate-pulse"
            strokeWidth={1.4}
          />
        )}

        {positions.map((pos, index) => {
          const latencyMs = edgeLatencyMs[index];
          const metrics = metricsByEdge.get(index);
          const hasData = !!metrics && metrics.requests > 0;

          return (
            <g key={index}>
              {activeEdge?.edgeIndex === index && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={4}
                  className={`animate-ping ${activeEdge.hit ? "fill-success" : "fill-error"}`}
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={4}
                className={hitRateFillClass(metrics)}
                stroke="var(--color-bg-panel)"
                strokeWidth={0.8}
              >
                <title>
                  {`Edge ${index + 1}: ${latencyMs}ms latency` +
                    (hasData
                      ? `, ${(metrics.hitRate * 100).toFixed(0)}% hit rate (${metrics.requests} requests, ${metrics.misses} to origin)`
                      : ", no requests yet")}
                </title>
              </circle>
              <text x={pos.x} y={pos.y + 9} textAnchor="middle" className="fill-text-subtle text-[5.5px]">
                {latencyMs}ms
              </text>
              <text
                x={pos.x}
                y={pos.y + 15}
                textAnchor="middle"
                className={hasData ? "fill-text-muted text-[5.5px] font-medium" : "fill-text-subtle text-[5.5px]"}
              >
                {hasData ? `${metrics.requests} req · ${(metrics.hitRate * 100).toFixed(0)}%` : "no data"}
              </text>
            </g>
          );
        })}

        {/* Origin pin — draggable. */}
        <g
          onPointerDown={(e: ReactPointerEvent<SVGGElement>) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDraggingPin("origin");
          }}
          onPointerMove={(e: ReactPointerEvent<SVGGElement>) => {
            if (!svgRef.current) return;
            const point = clientToPlanePoint(svgRef.current, e.clientX, e.clientY);
            onMoveOrigin(Math.round(point.x), Math.round(point.y));
          }}
          onPointerUp={(e: ReactPointerEvent<SVGGElement>) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setDraggingPin(null);
          }}
          className="cursor-grab active:cursor-grabbing"
        >
          <rect
            x={origin.x - 4.5}
            y={origin.y - 4.5}
            width={9}
            height={9}
            rx={1.5}
            className={draggingPin === "origin" ? "fill-warning" : "fill-bg-panel stroke-warning"}
            strokeWidth={1}
          />
          <text
            x={origin.x}
            y={origin.y + 10.5}
            textAnchor="middle"
            className="fill-text-muted text-[6px] font-medium"
          >
            Origin
          </text>
        </g>

        {/* User pin — draggable. */}
        <g
          onPointerDown={(e: ReactPointerEvent<SVGGElement>) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDraggingPin("user");
          }}
          onPointerMove={(e: ReactPointerEvent<SVGGElement>) => {
            if (!svgRef.current) return;
            const point = clientToPlanePoint(svgRef.current, e.clientX, e.clientY);
            onMoveUser(Math.round(point.x), Math.round(point.y));
          }}
          onPointerUp={(e: ReactPointerEvent<SVGGElement>) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setDraggingPin(null);
          }}
          className="cursor-grab active:cursor-grabbing"
        >
          <circle
            cx={user.x}
            cy={user.y}
            r={4.5}
            className={draggingPin === "user" ? "fill-primary" : "fill-bg-panel stroke-primary"}
            strokeWidth={1}
          />
          <text x={user.x} y={user.y + 10.5} textAnchor="middle" className="fill-text-muted text-[6px] font-medium">
            User
          </text>
        </g>
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-text-subtle">
        <LegendDot className="bg-success" label="Hot (≥70% hits)" />
        <LegendDot className="bg-warning" label="Warm" />
        <LegendDot className="bg-error" label="Cold (<30% hits)" />
        <LegendDot className="bg-text-subtle" label="No data" />
      </div>
      <p className="text-center text-[10px] text-text-subtle">
        Drag <span className="font-medium text-primary">User</span> to change which edge wins —
        drag <span className="font-medium text-warning">Origin</span> to see where a miss round-trips
      </p>

      <PinCoordinateControls
        userX={userX}
        userY={userY}
        originX={originX}
        originY={originY}
        onMoveUser={onMoveUser}
        onMoveOrigin={onMoveOrigin}
        onReset={onReset}
      />
    </div>
  );
}

/**
 * Numeric fallback for placing the pins — dragging is the primary
 * interaction, but it isn't keyboard-operable, and exact coordinates are
 * sometimes just faster than eyeballing a drag (IMPLEMENTATION.md's
 * keyboard-accessibility requirement).
 */
function PinCoordinateControls({
  userX,
  userY,
  originX,
  originY,
  onMoveUser,
  onMoveOrigin,
  onReset,
}: {
  userX: number;
  userY: number;
  originX: number;
  originY: number;
  onMoveUser: (x: number, y: number) => void;
  onMoveOrigin: (x: number, y: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-bg-elevated p-2">
      <div className="grid grid-cols-2 gap-2">
        <CoordinateField
          label="User X / Y"
          dotClassName="bg-primary"
          x={userX}
          y={userY}
          onChange={(x, y) => onMoveUser(x, y)}
        />
        <CoordinateField
          label="Origin X / Y"
          dotClassName="bg-warning"
          x={originX}
          y={originY}
          onChange={(x, y) => onMoveOrigin(x, y)}
        />
      </div>
      <button
        type="button"
        onClick={onReset}
        className="self-start text-[11px] font-medium text-text-subtle transition-colors duration-fast ease-standard hover:text-text"
      >
        Reset positions
      </button>
    </div>
  );
}

function CoordinateField({
  label,
  dotClassName,
  x,
  y,
  onChange,
}: {
  label: string;
  dotClassName: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[10px] font-medium text-text-muted">
        <span className={`size-1.5 rounded-full ${dotClassName}`} aria-hidden />
        {label}
      </span>
      <div className="flex items-center gap-1">
        <CoordinateInput value={x} onChange={(next) => onChange(next, y)} />
        <CoordinateInput value={y} onChange={(next) => onChange(x, next)} />
      </div>
    </div>
  );
}

function CoordinateInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      step={1}
      value={Math.round(value)}
      onChange={(e) => {
        const next = clamp(Math.round(Number(e.target.value)) || 0, 0, 100);
        onChange(next);
      }}
      className="h-7 w-full min-w-0 rounded-md border border-border bg-bg px-1.5 text-center text-xs text-text
        transition-colors duration-fast ease-standard
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg
        hover:border-border-hover"
    />
  );
}

/** Client -> SVG user-space coordinates via the element's own screen CTM,
 * so dragging is correct regardless of how the SVG is scaled on screen —
 * simple bounding-rect math would drift the moment the viewBox's aspect
 * ratio doesn't match the rendered box exactly. */
function clientToPlanePoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 50, y: 50 };
  const transformed = point.matrixTransform(ctm.inverse());
  return { x: clamp(transformed.x, 0, PLANE), y: clamp(transformed.y, 0, PLANE) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
