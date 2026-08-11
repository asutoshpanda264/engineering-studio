/**
 * Small shared building blocks for the hand-drawn SVG figures under
 * `src/components/content/diagrams/` — a labeled box and a couple of
 * connector-line helpers, styled with the same tokens `CDNEdgeMap.tsx`
 * (`src/components/workshop/`) already established for in-app SVG:
 * `fill-*`/`stroke-*` utilities bound to the design-token color scale, so
 * every figure is theme-aware for free with zero hardcoded colors.
 *
 * Deliberately not a full diagramming library — just enough shape reuse
 * that each diagram component reads as "compose boxes and lines", not
 * "hand-place a dozen rects". Anything more bespoke (a tree's bus
 * connectors, a timeline rail) stays local to the diagram that needs it.
 */

export type BoxTone = "neutral" | "signal" | "healthy" | "critical";

const TONE_CLASSES: Record<BoxTone, { box: string; text: string }> = {
  neutral: { box: "fill-bg-elevated stroke-border", text: "fill-text" },
  signal: { box: "fill-bg-elevated stroke-signal", text: "fill-signal" },
  healthy: { box: "fill-bg-elevated stroke-status-healthy", text: "fill-status-healthy" },
  critical: { box: "fill-bg-elevated stroke-status-critical", text: "fill-status-critical" },
};

export interface DiagramBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  /** First line renders as the title (medium weight); any further lines render smaller and muted. */
  lines: string[];
  tone?: BoxTone;
  dashed?: boolean;
}

/** A bordered box with one bold title line and optional muted sub-lines, vertically centered as a group. */
export function DiagramBox({ x, y, width, height, lines, tone = "neutral", dashed = false }: DiagramBoxProps) {
  const { box, text } = TONE_CLASSES[tone];
  const [title, ...rest] = lines;
  const lineHeight = 13;
  const blockHeight = lineHeight * lines.length;
  const startY = y + height / 2 - blockHeight / 2 + lineHeight * 0.75;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        strokeWidth={1}
        strokeDasharray={dashed ? "3 3" : undefined}
        className={box}
      />
      <text x={x + width / 2} y={startY} textAnchor="middle" className={`${text} text-[11px] font-medium`}>
        {title}
      </text>
      {rest.map((line, i) => (
        <text
          key={i}
          x={x + width / 2}
          y={startY + lineHeight * (i + 1)}
          textAnchor="middle"
          className="fill-text-subtle text-[9.5px]"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/** Straight connector, optionally arrowed, optionally labeled at its midpoint. */
export function DiagramArrow({
  x1,
  y1,
  x2,
  y2,
  markerId,
  label,
  dashed = false,
  tone = "neutral",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  markerId?: string;
  label?: string;
  dashed?: boolean;
  tone?: BoxTone;
}) {
  const strokeClass =
    tone === "signal"
      ? "stroke-signal"
      : tone === "healthy"
        ? "stroke-status-healthy"
        : tone === "critical"
          ? "stroke-status-critical"
          : "stroke-border-hover";
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={1}
        strokeDasharray={dashed ? "3 3" : undefined}
        className={strokeClass}
        markerEnd={markerId ? `url(#${markerId})` : undefined}
      />
      {label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 4}
          textAnchor="middle"
          className="fill-text-subtle text-[9px]"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** A `<defs>` arrowhead marker, colored to match a given tone — give each diagram its own id (e.g. `"dns-hierarchy-arrow"`) so multiple figures on one page never collide. */
export function ArrowMarker({ id, tone = "neutral" }: { id: string; tone?: BoxTone }) {
  const fillClass =
    tone === "signal"
      ? "fill-signal"
      : tone === "healthy"
        ? "fill-status-healthy"
        : tone === "critical"
          ? "fill-status-critical"
          : "fill-border-hover";
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" className={fillClass} />
      </marker>
    </defs>
  );
}
