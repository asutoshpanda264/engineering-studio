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

import type { LucideIcon } from "lucide-react";

export type BoxTone = "neutral" | "signal" | "healthy" | "critical";

const TONE_CLASSES: Record<BoxTone, { box: string; text: string; icon: string }> = {
  neutral: { box: "fill-bg-elevated stroke-border", text: "fill-text", icon: "text-text-subtle" },
  signal: { box: "fill-bg-elevated stroke-signal", text: "fill-signal", icon: "text-signal" },
  healthy: { box: "fill-bg-elevated stroke-status-healthy", text: "fill-status-healthy", icon: "text-status-healthy" },
  critical: { box: "fill-bg-elevated stroke-status-critical", text: "fill-status-critical", icon: "text-status-critical" },
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
  /**
   * Which entity this box represents, from `ENTITY_CATALOG`'s icon set —
   * the same glyph shown on its Workshop canvas card and `/entities/[slug]`
   * hero, so a Database box reads as a database at a glance instead of
   * needing its label read first. Deliberately opt-in (omit for boxes that
   * don't correspond to one real catalog entity — a row label, a generic
   * "not yet added" placeholder) rather than inferred from `lines`, so a
   * box never gets a wrong or misleading icon. Drawn top-left, clear of the
   * centered title/sub-line text block below it, and colored by the box's
   * own `tone` (same as the text) rather than a per-entity color — this
   * design system reserves color for tone/status, not category, so the
   * icon's job is shape recognition, not another color to learn.
   */
  icon?: LucideIcon;
}

/** A bordered box with one bold title line and optional muted sub-lines, vertically centered as a group, plus an optional top-left entity icon. */
export function DiagramBox({ x, y, width, height, lines, tone = "neutral", dashed = false, icon: Icon }: DiagramBoxProps) {
  const { box, text, icon } = TONE_CLASSES[tone];
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
      {Icon && <Icon x={x + 6} y={y + 6} width={11} height={11} strokeWidth={2} className={icon} aria-hidden />}
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

/**
 * A label longer than this renders as two lines instead of one — halves the
 * worst case width of the backing chip (see `DiagramArrow`'s own comment)
 * so a long label sitting in a short gap still mostly clears its neighbors'
 * own title text, rather than the chip growing wide enough to blot out a
 * whole box. Breaks at whichever space sits closest to the middle; a label
 * with no space at all (rare — a single long word) is left on one line
 * since there's nowhere sane to cut it.
 */
function wrapLabel(label: string, maxLineLen = 18): [string] | [string, string] {
  if (label.length <= maxLineLen) return [label];
  const mid = label.length / 2;
  let splitAt = -1;
  let bestDist = Infinity;
  for (let i = 0; i < label.length; i++) {
    if (label[i] === " ") {
      const dist = Math.abs(i - mid);
      if (dist < bestDist) {
        bestDist = dist;
        splitAt = i;
      }
    }
  }
  if (splitAt === -1) return [label];
  return [label.slice(0, splitAt), label.slice(splitAt + 1)];
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
  offset = 0,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  markerId?: string;
  label?: string;
  dashed?: boolean;
  tone?: BoxTone;
  /**
   * Perpendicular shift (px) applied to the whole line + label — lets
   * `ArchitectureLayer` draw a request/response pair (two edges between the
   * same two nodes, opposite directions) as two parallel lines instead of
   * one line with both labels stacked exactly on top of each other, which
   * silently hid whichever edge was declared first.
   */
  offset?: number;
}) {
  const strokeClass =
    tone === "signal"
      ? "stroke-signal"
      : tone === "healthy"
        ? "stroke-status-healthy"
        : tone === "critical"
          ? "stroke-status-critical"
          : "stroke-border-hover";
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ox = offset ? (-dy / len) * offset : 0;
  const oy = offset ? (dx / len) * offset : 0;
  const [ax1, ay1, ax2, ay2] = [x1 + ox, y1 + oy, x2 + ox, y2 + oy];
  const lines = label ? wrapLabel(label) : undefined;
  const cx = (ax1 + ax2) / 2;
  const cy = (ay1 + ay2) / 2;
  return (
    <g>
      <line
        x1={ax1}
        y1={ay1}
        x2={ax2}
        y2={ay2}
        strokeWidth={1}
        strokeDasharray={dashed ? "3 3" : undefined}
        className={strokeClass}
        markerEnd={markerId ? `url(#${markerId})` : undefined}
      />
      {lines && (
        <g>
          {/* Backing chip behind the label, same fill token `DiagramBox` uses —
              short inter-node gaps (`ArchitectureLayer`'s fixed 40px column
              gutter) are routinely narrower than a real label, so the text
              spills over whichever node sits next to it. Rather than cap
              label length or widen every diagram's layout globally, give the
              label its own opaque backing so it stays legible sitting on top
              of a neighboring box instead of being silently painted over by
              one (nodes still render after edges in `ArchitectureLayer`, so
              without this the box fill would hide the tail of any label
              longer than the gap). Width is a rough monospace-ish estimate
              (SVG text can't be measured synchronously pre-layout) generous
              enough to cover real 9px sans-serif labels, sized off the
              longer of the (up to 2) wrapped lines rather than the raw
              label so a long label wraps instead of ballooning the chip. */}
          <rect
            x={cx - (Math.max(...lines.map((l) => l.length)) * 2.7 + 4)}
            y={cy - 13 - (lines.length - 1) * 9}
            width={Math.max(...lines.map((l) => l.length)) * 5.4 + 8}
            height={12 + (lines.length - 1) * 9}
            rx={2}
            className="fill-bg-elevated"
          />
          {lines.map((line, i) => (
            <text
              key={i}
              x={cx}
              y={cy - 4 - (lines.length - 1 - i) * 9}
              textAnchor="middle"
              className="fill-text-subtle text-[9px]"
            >
              {line}
            </text>
          ))}
        </g>
      )}
    </g>
  );
}

/**
 * Sizing props for a diagram's outer `<svg>` that keep its hand-tuned
 * text/box sizes legible at every container width, replacing the naive
 * `w-full h-auto` pattern every diagram used before this existed — that
 * scaled the whole SVG down to match *any* container narrower than the
 * viewBox, including ones far narrower than the diagram's natural
 * proportions (many nodes in one row, or a side-by-side `CompareDiagram`
 * panel pair), which squeezed text down to a couple of pixels tall.
 * `width: max(100%, native)` still fills a container bigger than the
 * diagram (the zoom modal's whole point) but never shrinks below native
 * size — a narrower container scrolls horizontally instead, via the
 * `overflow-x-auto` every diagram already renders inside (`FigureFrame`,
 * `Modal`).
 */
export function svgResponsiveProps(width: number, height: number) {
  return {
    width,
    height,
    style: { width: `max(100%, ${width}px)`, height: "auto" as const },
  };
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
