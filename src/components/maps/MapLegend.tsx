const KEY: { label: string; dotClassName: string }[] = [
  { label: "Available", dotClassName: "border border-signal bg-bg-elevated" },
  { label: "Completed", dotClassName: "border border-status-healthy bg-status-healthy" },
];

// LOCKING DISABLED (see "batman-only arcade maps" change): the legend used
// to carry a third "Locked"/cave-only "Unlit" entry plus a torch hint line
// — nothing is ever locked anymore, so both are commented out rather than
// removed.
// const CAVE_LOCKED_KEY = { label: "Unlit", dotClassName: "border border-border/40 bg-bg" };

/**
 * A HUD corner readout — the map's node/edge coloring is otherwise
 * unexplained, and a first-time visitor shouldn't have to guess what a
 * dim gray circle vs. a lit copper one means. Sits pinned to the
 * viewport (not the scrolling canvas), same "chrome floats over the
 * canvas" placement `ArchitectureCanvas.tsx`'s own corner panels use.
 */
export function MapLegend({ completed, total }: { completed: number; total: number }) {
  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-10 flex flex-col gap-2 border border-border bg-bg/90 px-3 py-2.5 backdrop-blur">
      <span className="font-mono text-[10px] uppercase tracking-wide text-text-subtle">
        {completed} / {total} complete
      </span>
      <div className="flex items-center gap-3">
        {KEY.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${item.dotClassName}`} aria-hidden />
            <span className="font-mono text-[9px] uppercase tracking-wide text-text-subtle">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
