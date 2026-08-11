export interface MapPathPoint {
  x: number;
  y: number;
}

export interface MapPathProps {
  /** Same 0–100 percent coordinate space `LessonNode`s are positioned
      in, in path order. */
  points: MapPathPoint[];
  /** Segments before this index render solid/bright ("behind you");
      this one and everything after render dashed/muted ("ahead").
      -1 (the default) means nothing has been traveled yet. */
  traveledUpToIndex?: number;
  className?: string;
}

/**
 * The trail connecting map nodes. Deliberately straight segments, not
 * curves — the zigzag comes from the nodes' own placement, and a
 * straight `<line>` keeps `strokeDasharray` predictable. One known,
 * accepted simplification: `preserveAspectRatio="none"` maps the
 * 0–100 viewBox directly onto the container's actual (non-square) box
 * so it lines up exactly with `LessonNode`'s percent-based CSS
 * positioning — the tradeoff is that the dash pattern stretches
 * slightly unevenly on a non-square container. Not worth a
 * runtime-measured pixel path for a map this small; revisit if a
 * future map's proportions make it visible.
 */
export function MapPath({ points, traveledUpToIndex = -1, className = "" }: MapPathProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {points.slice(0, -1).map((point, i) => {
        const next = points[i + 1];
        const traveled = i < traveledUpToIndex;
        return (
          <line
            key={i}
            x1={point.x}
            y1={point.y}
            x2={next.x}
            y2={next.y}
            stroke={traveled ? "var(--quest-yellow)" : "var(--quest-ink-on-dark-muted)"}
            strokeWidth={1.4}
            strokeDasharray={traveled ? undefined : "3 2.5"}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
