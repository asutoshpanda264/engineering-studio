"use client";

import type { ReactNode } from "react";
import { usePannableCanvas } from "@/lib/usePannableCanvas";
import { MapZoomControls } from "./MapZoomControls";
import { ElectricLoader } from "@/components/ui/ElectricLoader";

export interface PannableMapCanvasProps {
  width: number;
  height: number;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  /** See `usePannableCanvas`'s own doc comment — where to center the viewport, recomputed on mount and on every "Reset view" click. */
  getInitialFocus: () => { x: number; y: number } | null;
  /** Gates `children`/`headerSlot` vs. the loading state — pass `true` once whatever data the map needs (progress, hydration) has settled. */
  ready: boolean;
  /** Rendered at a fixed spot inside the scaled canvas near its origin, so it scrolls away like any other map content once the reader pans past it — same convention `FoundationsMap`'s own `headerSlot` established. */
  headerSlot?: ReactNode;
  /** The map's actual content (regions/edges/nodes) — rendered inside the scaled, percent-coordinate canvas. Only mounted once `ready`. */
  children: ReactNode;
  /** A HUD element pinned to the viewport (not the scrolling canvas), e.g. `MapLegend` — only mounted once `ready`. */
  legendSlot?: ReactNode;
  /** Swaps the pan/grab cursor for `cursor-none` on the scroll container —
      for a caller drawing its own cursor replacement on top (e.g.
      `FoundationsMap`'s torch flame, via `TorchCursor` in `legendSlot`).
      Panning itself is unaffected; only the native cursor icon changes. */
  hideCursor?: boolean;
}

/**
 * The domain-agnostic map shell: pan/zoom canvas (via `usePannableCanvas`)
 * + vignette background + loading state + zoom controls + an optional
 * pinned legend. Extracted out of `FoundationsMap` so `EntitiesMap`/
 * `LLDMap`/`AgenticMap` don't each reimplement the same DOM structure —
 * each of those supplies its own `children` (its regions/edges/node
 * cards) and stays responsible for its own domain data, this component
 * only owns the canvas mechanics and chrome.
 */
export function PannableMapCanvas({
  width,
  height,
  minZoom,
  maxZoom,
  zoomStep,
  getInitialFocus,
  ready,
  headerSlot,
  children,
  legendSlot,
  hideCursor = false,
}: PannableMapCanvasProps) {
  const { scrollRef, zoom, isPanning, handlePointerDown, handlePointerMove, endPan, zoomIn, zoomOut, reset, canZoomIn, canZoomOut } =
    usePannableCanvas({ width, height, minZoom, maxZoom, zoomStep, getInitialFocus });

  return (
    <div className="relative h-full w-full">
      {/* Same radial vignette `ArchitectureCanvas.tsx` washes its own canvas
          with — reads as an open working surface rather than a flat fill.
          Plain CSS `background` (default `background-attachment: scroll`,
          despite the name, means "fixed to this box," not "scrolls with
          its content") keeps the vignette visually stable as the reader
          pans the map underneath it. */}
      <div
        ref={scrollRef}
        className={`no-scrollbar absolute inset-0 overflow-auto ${hideCursor ? "cursor-none" : isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          background: "radial-gradient(ellipse 75% 65% at 50% 42%, var(--color-bg) 0%, var(--color-bg-panel) 100%)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        {/* A real (untransformed) box sized to the *scaled* canvas — this,
            not the transformed div it wraps, is what tells the `overflow-
            auto` parent above how far there is to scroll. */}
        <div style={{ width: width * zoom, height: height * zoom }}>
          <div
            className="relative origin-top-left"
            style={{ width, height, transform: `scale(${zoom})` }}
          >
            {headerSlot && <div className="absolute left-6 top-6 z-10 max-w-xs">{headerSlot}</div>}
            {ready && children}
          </div>
        </div>
      </div>
      {!ready && (
        <div className="absolute inset-0 z-10">
          <ElectricLoader fullScreen={false} />
        </div>
      )}
      {ready && legendSlot}
      {ready && (
        <MapZoomControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={reset}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
        />
      )}
    </div>
  );
}
