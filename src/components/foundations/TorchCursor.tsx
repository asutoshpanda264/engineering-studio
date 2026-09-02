"use client";

import { forwardRef } from "react";
import { Flame } from "lucide-react";

/**
 * The reader's cursor while the torch is lit — a small flame-blue glow
 * that follows the pointer, rendered as its own `fixed` element rather than
 * an actual CSS `cursor: url(...)` image because a real glow (blur, drop-
 * shadow, a flicker animation) isn't expressible in the tiny static bitmap
 * a custom cursor allows. `FoundationsMap` hides the native cursor over the
 * map (`cursor-none`) whenever this is showing and swaps it back the
 * instant the torch goes out or the pointer leaves the canvas.
 *
 * Positioned via `transform: translate3d(...)` written directly onto this
 * element by `FoundationsMap`'s pointer-move handler (through the
 * forwarded `ref`), not React state — the same zero-re-render-per-move
 * discipline `CaveShroud` follows for the mask it's paired with. Starts at
 * `opacity-0` (no flash at the top-left corner before the first real
 * pointer position arrives) and `left-0 top-0` so the translate is the
 * *only* thing ever positioning it, in plain viewport (not canvas-local)
 * coordinates — unlike `CaveShroud`'s mask, this never needs to account
 * for the map's own pan/zoom.
 *
 * Blue rather than the signal-yellow every "lit" node/edge already uses —
 * this is the reader's own light source, actively searching, not a
 * lesson's resting "you can go here" state; keeping the hue distinct
 * means the two glows never get confused for each other on screen.
 */
export const TorchCursor = forwardRef<HTMLDivElement>(function TorchCursor(_props, ref) {
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-40 -translate-x-1/2 -translate-y-1/2 opacity-0"
      style={{ willChange: "transform, opacity" }}
    >
      <div
        className="animate-torch-flicker flex size-9 items-center justify-center rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(205 90% 62% / 0.55) 0%, hsl(205 90% 62% / 0.22) 45%, transparent 75%)",
        }}
      >
        <Flame
          className="size-4 text-[hsl(205_90%_78%)]"
          style={{ filter: "drop-shadow(0 0 6px hsl(205 90% 62%))" }}
          aria-hidden
        />
      </div>
    </div>
  );
});
