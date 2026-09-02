import { Minus, Plus, RotateCcw } from "lucide-react";

export interface MapZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

/**
 * A HUD corner control cluster, mirroring `MapLegend`'s pinned-to-viewport
 * placement and chrome (`border border-border bg-bg/90 backdrop-blur`) —
 * bottom-left rather than bottom-right so the two don't collide. Exists
 * because the map's only navigation used to be the browser's own
 * scrollbars on a 2800×1300px canvas — no click-drag panning, no way to
 * zoom out far enough to see more than one cluster at a time. Reported
 * back directly: "I have not grab and move option, nor any zoom in zoom
 * out option."
 *
 * `FoundationsMap` owns the actual pan/zoom mechanics (drag-to-pan via
 * pointer capture, Ctrl/Cmd+scroll-wheel zoom anchored at the cursor) —
 * this is the discoverable, always-visible fallback for a reader who
 * doesn't know the wheel gesture exists or is on a device without one.
 * `disabled` (not hidden) at each zoom extreme — the control stays in the
 * same spot at all times, it just stops responding once there's nowhere
 * further to go, so the reader never loses track of where the button is.
 */
export function MapZoomControls({ zoom, onZoomIn, onZoomOut, onReset, canZoomIn, canZoomOut }: MapZoomControlsProps) {
  return (
    <div className="absolute bottom-6 left-6 z-10 flex items-center gap-1 border border-border bg-bg/90 px-1.5 py-1.5 backdrop-blur">
      <button
        type="button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
        className="flex size-7 items-center justify-center text-text-muted transition-colors duration-fast ease-standard hover:text-signal disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="size-3.5" aria-hidden />
      </button>
      <span className="min-w-11 text-center font-mono text-[10px] uppercase tracking-wide text-text-subtle">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
        className="flex size-7 items-center justify-center text-text-muted transition-colors duration-fast ease-standard hover:text-signal disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset the view — 100% zoom, re-centered on your current lesson"
        title="Reset view"
        className="flex size-7 items-center justify-center text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
      >
        <RotateCcw className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
