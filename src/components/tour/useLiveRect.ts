import { useEffect, useState } from "react";

/**
 * Tracks a target element's viewport rect on every animation frame, for as
 * long as `active` is true. A rAF poll (rather than ResizeObserver /
 * MutationObserver) is the deliberately simple choice here: the tour's
 * targets move for reasons those observers don't cleanly cover in this
 * app — React Flow pans/zooms nodes via a CSS transform on an ancestor,
 * the Inspector panel mounts/unmounts based on selection, the whole layout
 * reflows when a panel appears. A single element's getBoundingClientRect
 * every frame is cheap enough that polling for it is simpler and more
 * robust than wiring three different observers to catch every case.
 *
 * Returns null while inactive, while the target doesn't exist yet (an
 * earlier step hasn't been completed), or before the first frame ticks.
 */
export function useLiveRect(
  getTarget: () => HTMLElement | null,
  active: boolean
): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) return;

    let frame: number;
    const tick = () => {
      const el = getTarget();
      setRect((prev) => {
        if (!el) return prev === null ? prev : null;
        const next = el.getBoundingClientRect();
        // Skip the setState when nothing actually moved — avoids a
        // constant 60fps re-render of the overlay while the page is idle.
        if (
          prev &&
          prev.top === next.top &&
          prev.left === next.left &&
          prev.width === next.width &&
          prev.height === next.height
        ) {
          return prev;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, getTarget]);

  // Masked rather than reset via a setState call when `active` flips off —
  // `rect` is allowed to go stale internally while inactive, the caller
  // just never sees it (avoids a synchronous setState-in-effect for what's
  // otherwise a one-line "clear on deactivate").
  return active ? rect : null;
}
