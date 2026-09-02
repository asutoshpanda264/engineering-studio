"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface PannableCanvasOptions {
  /** Unscaled canvas size, in px — the same 0–100 percent coordinate space every map's layout positions its nodes in resolves against this. */
  width: number;
  height: number;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  /**
   * Where to center the viewport, in the canvas's 0–100 percent space —
   * called once on mount (at zoom 1) and again every time `reset()` is
   * called. A function rather than a fixed point so a caller like
   * `FoundationsMap` can recompute "the current frontier lesson" fresh
   * each time rather than freezing whatever was true at mount. Returning
   * `null` skips centering (the viewport is left wherever the browser put
   * it, i.e. scroll position 0,0).
   */
  getInitialFocus: () => { x: number; y: number } | null;
}

/**
 * Pan/zoom mechanics for a large, absolutely-positioned canvas (a "map") —
 * click-drag to pan, Ctrl/Cmd+wheel (also how Chrome/Firefox report
 * trackpad pinch-zoom) or an external `zoomIn`/`zoomOut`/`reset` to zoom,
 * anchored at the cursor or viewport center respectively so the content
 * under the anchor point stays visually still while everything around it
 * scales. Extracted out of `FoundationsMap` (the original, single-domain
 * version of this map) so `EntitiesMap`/`LLDMap`/`AgenticMap` don't each
 * need their own copy of this ~150-line block — see that component's own
 * history for why every timing/anchor/RAF-batching decision here is the
 * way it is (each one traces back to a real reported interaction bug).
 *
 * Returns everything a map shell needs to wire up the DOM: `scrollRef`
 * for the `overflow-auto` container, `zoom` for the inner canvas's
 * `transform: scale()`, `isPanning` for cursor styling, and the handlers/
 * controls themselves. Deliberately doesn't own the vignette/loader/
 * legend chrome around it — that's `PannableMapCanvas`, the component
 * this hook is built for.
 */
export function usePannableCanvas({
  width,
  height,
  minZoom = 0.4,
  maxZoom = 1.5,
  zoomStep = 0.15,
  getInitialFocus,
}: PannableCanvasOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  const recenterOnFocus = useCallback(
    (targetZoom: number) => {
      const container = scrollRef.current;
      if (!container) return;
      const focus = getInitialFocus();
      if (!focus) return;
      container.scrollTo({
        left: Math.max(0, (focus.x / 100) * width * targetZoom - container.clientWidth / 2),
        top: Math.max(0, (focus.y / 100) * height * targetZoom - container.clientHeight / 2),
        behavior: "auto",
      });
    },
    [width, height, getInitialFocus]
  );

  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (hasScrolledRef.current) return;
    hasScrolledRef.current = true;
    recenterOnFocus(1);
    // Deliberately mount-only, same reasoning as `FoundationsMap`'s
    // original effect: re-running this on every focus/size change would
    // fight the reader's own panning, not just be redundant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drag-to-pan, via native Pointer Events + `setPointerCapture` rather
  // than a `mousedown`/`mousemove`/`mouseup` trio on `document` — capturing
  // the pointer on the scroll container itself means `pointermove`/
  // `pointerup` keep firing on it even once the cursor leaves its bounds
  // mid-drag, with no separate cleanup-on-unmount to get wrong. Skips
  // starting a pan at all when the pointerdown lands on an `<a>`/
  // `<button>` (a node card) — letting those elements' own click handling
  // run completely untouched.
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(
    null
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("a, button")) return;
    const container = scrollRef.current;
    if (!container) return;
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    container.setPointerCapture(event.pointerId);
    setIsPanning(true);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    const container = scrollRef.current;
    if (!pan || !container || pan.pointerId !== event.pointerId) return;
    container.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
    container.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
  }, []);

  const endPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId !== event.pointerId) return;
    panRef.current = null;
    setIsPanning(false);
  }, []);

  // Zoom, anchored at an arbitrary point (the cursor for wheel-zoom, the
  // viewport center for the +/- buttons) rather than always the top-left
  // corner — the content under that point stays visually still while
  // everything around it scales. Deferred to a `useLayoutEffect` keyed on
  // `zoom` rather than computed inline: the scroll adjustment depends on
  // the *new* zoom's scaled canvas size, which doesn't exist in the DOM
  // until this state update has actually committed.
  const pendingZoomAnchorRef = useRef<{ contentX: number; contentY: number; anchorX: number; anchorY: number } | null>(
    null
  );

  const zoomTo = useCallback(
    (nextZoomRaw: number, anchorX: number, anchorY: number) => {
      const nextZoom = Math.min(maxZoom, Math.max(minZoom, nextZoomRaw));
      const container = scrollRef.current;
      if (!container || nextZoom === zoom) return;
      pendingZoomAnchorRef.current = {
        contentX: (container.scrollLeft + anchorX) / zoom,
        contentY: (container.scrollTop + anchorY) / zoom,
        anchorX,
        anchorY,
      };
      setZoom(nextZoom);
    },
    [zoom, minZoom, maxZoom]
  );

  useLayoutEffect(() => {
    const pending = pendingZoomAnchorRef.current;
    const container = scrollRef.current;
    if (!pending || !container) return;
    pendingZoomAnchorRef.current = null;
    container.scrollLeft = pending.contentX * zoom - pending.anchorX;
    container.scrollTop = pending.contentY * zoom - pending.anchorY;
  }, [zoom]);

  // Ctrl/Cmd+wheel — a native listener via `addEventListener`, not React's
  // `onWheel`: React attaches wheel/touch listeners as passive by default,
  // which silently no-ops `preventDefault()` instead of actually stopping
  // the browser's own page-zoom on Ctrl+wheel. Scales exponentially off
  // `deltaY` so the gesture feels like a constant *rate* of zoom
  // regardless of how zoomed-in it already is.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      zoomTo(zoom * Math.exp(-event.deltaY * 0.01), event.clientX - rect.left, event.clientY - rect.top);
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [zoom, zoomTo]);

  const zoomIn = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    zoomTo(zoom + zoomStep, container.clientWidth / 2, container.clientHeight / 2);
  }, [zoom, zoomStep, zoomTo]);

  const zoomOut = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    zoomTo(zoom - zoomStep, container.clientWidth / 2, container.clientHeight / 2);
  }, [zoom, zoomStep, zoomTo]);

  // "Reset view" recenters on the current focus *at* zoom 1, not just
  // "set zoom to 1 wherever panned to." Deferred the same way `zoomTo`
  // defers its scroll adjustment — `zoom` must have already committed to
  // `1` before `recenterOnFocus`'s pixel math is correct.
  const pendingRecenterRef = useRef(false);

  const reset = useCallback(() => {
    pendingRecenterRef.current = true;
    setZoom(1);
  }, []);

  useLayoutEffect(() => {
    if (!pendingRecenterRef.current) return;
    pendingRecenterRef.current = false;
    recenterOnFocus(zoom);
  }, [zoom, recenterOnFocus]);

  return {
    scrollRef,
    zoom,
    isPanning,
    handlePointerDown,
    handlePointerMove,
    endPan,
    zoomIn,
    zoomOut,
    reset,
    canZoomIn: zoom < maxZoom - 0.001,
    canZoomOut: zoom > minZoom + 0.001,
  };
}
