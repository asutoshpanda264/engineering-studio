"use client";

import { forwardRef, type ReactNode } from "react";

/**
 * The dark half of the cave map — wraps every still-locked node/edge
 * (`FoundationsMap` only ever puts locked content in here; anything
 * `available`/`completed` renders as a direct sibling, always lit, never
 * passed through this) and controls whether it's paintable at all via a
 * CSS `mask-image`, not per-node opacity — one mask covering the whole
 * group means the "hole" the torch punches can uncover a locked node and
 * the locked trail leading to it in the same stroke, rather than each
 * needing its own independent reveal logic.
 *
 * The mask is read in *alpha* (opaque black = paint the content under this
 * pixel, transparent = don't) — the long-established CSS "flashlight
 * effect" trick. Its *shape* (`mask-image`) is a single, never-changing
 * radial gradient; the torch's actual position/radius drive `mask-size` +
 * `mask-position` instead of being baked into the gradient's own `at X Y`
 * argument. That split matters for performance: `FoundationsMap`'s
 * pointer-move handler rewrites these every frame the torch moves, and a
 * browser can reposition/rescale an already-generated mask image cheaply
 * (the same operation as animating `background-position`) but has to fully
 * regenerate — and then re-rasterize this whole subtree against — a brand
 * new gradient image every time its own function arguments (`at X Y`)
 * change. An earlier version baked the position into the gradient function
 * directly and was reported back as making the map feel slow specifically
 * while sweeping the torch around.
 *
 * `--torch-x`/`--torch-y`/`--torch-radius` are deliberately left out of
 * this component's own `style` prop and instead written directly onto the
 * DOM node by `FoundationsMap` (via the forwarded `ref`) — updating a
 * custom property imperatively repaints the mask every frame with zero
 * React re-renders, the same "don't run this component's render function
 * per mouse-move" discipline `FoundationsMap`'s own pan/zoom code already
 * follows. `--torch-radius` defaults to `0px` (a zero-size mask — nothing
 * revealed) so a fresh mount — before `FoundationsMap`'s effect has set a
 * real radius — fails safe to "everything hidden," not "everything
 * visible."
 */
export const CaveShroud = forwardRef<HTMLDivElement, { children: ReactNode }>(function CaveShroud(
  { children },
  ref
) {
  const maskImage = "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)";
  // A `--torch-radius`-square box containing the gradient above, positioned
  // so its center — not its top-left corner, which is what `mask-position`
  // itself anchors — lands on `(--torch-x, --torch-y)`.
  const size = "calc(var(--torch-radius, 0px) * 2)";
  const offset = "calc(-1 * var(--torch-radius, 0px))";
  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{
        maskImage,
        WebkitMaskImage: maskImage,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: `${size} ${size}`,
        WebkitMaskSize: `${size} ${size}`,
        maskPosition: `calc(var(--torch-x, -9999px) + ${offset}) calc(var(--torch-y, -9999px) + ${offset})`,
        WebkitMaskPosition: `calc(var(--torch-x, -9999px) + ${offset}) calc(var(--torch-y, -9999px) + ${offset})`,
        willChange: "mask-position, mask-size",
      }}
    >
      {children}
    </div>
  );
});
