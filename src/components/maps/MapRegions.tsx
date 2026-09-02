const PAD = 10;

export interface MapRegion {
  label: string;
  slugs: string[];
}

/**
 * Margin labels naming a map's thematic clusters — the thing a mostly-
 * empty canvas was missing on `/foundations`' original forest map: with
 * most nodes dimmed on a fresh visit, the map read as gray circles
 * floating in dead space rather than a place with any territory to it.
 * Went through two earlier passes before landing here: a blurred glow
 * alone read as too subtle ("not visible"), and a dashed oval boundary
 * around the glow was rejected outright ("remove the background circle")
 * — a bold, clearly legible label is enough to mark territory without
 * drawing a shape over the canvas at all. No per-region hue — distinction
 * comes from typography weight, not color, same rule this app's design
 * system applies everywhere else (color means tone/status, not category).
 *
 * Generic over `regions`/`getPosition` (originally hardcoded to
 * `/foundations`' own data) so `EntitiesMap`/`LLDMap`/`AgenticMap` can
 * reuse this exact component with their own category/domain groupings
 * instead of each re-deriving the same bounding-box-label math.
 */
export function MapRegions({
  regions,
  getPosition,
}: {
  regions: MapRegion[];
  getPosition: (slug: string) => { x: number; y: number } | undefined;
}) {
  return (
    <>
      {regions.map((region) => {
        const positions = region.slugs.map(getPosition).filter((p): p is NonNullable<typeof p> => Boolean(p));
        if (positions.length === 0) return null;
        const minX = Math.min(...positions.map((p) => p.x));
        const minY = Math.min(...positions.map((p) => p.y)) - PAD;
        return (
          <span
            key={region.label}
            className="absolute z-0 flex items-center gap-1.5 whitespace-nowrap font-mono text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
            style={{ left: `${minX}%`, top: `${minY}%` }}
          >
            <span className="h-px w-4 bg-text-muted" aria-hidden />
            {region.label}
          </span>
        );
      })}
    </>
  );
}
