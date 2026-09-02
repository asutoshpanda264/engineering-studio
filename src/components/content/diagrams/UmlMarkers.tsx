import type { BoxTone } from "./primitives";

/**
 * UML relationship-end markers — hollow diamond (aggregation), filled
 * diamond (composition), hollow triangle (inheritance/realization), and
 * an open arrowhead (dependency). Siblings to `primitives.tsx`'s plain
 * `ArrowMarker`, same tone-to-fill-class mapping, each wrapping its own
 * `<defs>` so a diagram can drop one in wherever it needs that end shape.
 */

function classesFor(tone: BoxTone) {
  // Hollow markers (diamond/triangle outlines) must stay hollow — matching
  // the canvas background — no matter the tone; only their stroke should
  // pick up the tone's color. A tone-colored `fill` here would make a
  // selected aggregation/inheritance edge render as a solid shape,
  // indistinguishable from composition's genuinely filled diamond.
  const fill = "fill-bg-elevated";
  const solidFill =
    tone === "signal"
      ? "fill-signal"
      : tone === "healthy"
        ? "fill-status-healthy"
        : tone === "critical"
          ? "fill-status-critical"
          : "fill-text-muted";
  const stroke =
    tone === "signal"
      ? "stroke-signal"
      : tone === "healthy"
        ? "stroke-status-healthy"
        : tone === "critical"
          ? "stroke-status-critical"
          : "stroke-border-hover";
  return { fill, solidFill, stroke };
}

/** Hollow diamond — aggregation, placed at the "whole" (`from`) end. */
export function HollowDiamondMarker({ id, tone = "neutral" }: { id: string; tone?: BoxTone }) {
  const { fill, stroke } = classesFor(tone);
  return (
    <defs>
      <marker id={id} viewBox="0 0 20 10" refX="18" refY="5" markerWidth="14" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,5 L10,0 L20,5 L10,10 z" strokeWidth={1} className={`${fill} ${stroke}`} />
      </marker>
    </defs>
  );
}

/** Filled diamond — composition, placed at the "whole" (`from`) end. */
export function FilledDiamondMarker({ id, tone = "neutral" }: { id: string; tone?: BoxTone }) {
  const { solidFill, stroke } = classesFor(tone);
  return (
    <defs>
      <marker id={id} viewBox="0 0 20 10" refX="18" refY="5" markerWidth="14" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,5 L10,0 L20,5 L10,10 z" strokeWidth={1} className={`${solidFill} ${stroke}`} />
      </marker>
    </defs>
  );
}

/** Hollow triangle — inheritance/realization, placed at the "parent"/"interface" (`to`) end. */
export function HollowTriangleMarker({ id, tone = "neutral" }: { id: string; tone?: BoxTone }) {
  const { fill, stroke } = classesFor(tone);
  return (
    <defs>
      <marker id={id} viewBox="0 0 12 10" refX="10.5" refY="5" markerWidth="10" markerHeight="8" orient="auto-start-reverse">
        <path d="M0,0 L12,5 L0,10 z" strokeWidth={1} className={`${fill} ${stroke}`} />
      </marker>
    </defs>
  );
}

/** Open arrowhead — dependency, placed at the (`to`) end. */
export function OpenArrowMarker({ id, tone = "neutral" }: { id: string; tone?: BoxTone }) {
  const { stroke } = classesFor(tone);
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10" fill="none" strokeWidth={1.5} className={stroke} />
      </marker>
    </defs>
  );
}
