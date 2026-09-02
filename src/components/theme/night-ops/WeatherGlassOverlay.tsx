"use client";

import type { WeatherPhase } from "@/components/theme/night-ops/weatherCycle";

/**
 * The visual payoff of Night Ops's heavy-rain phase (see weatherCycle.ts)
 * — a blur/glass pane with a faint signal-and-cold bloom, masked so
 * `backdrop-filter` only blurs the viewport's edges and never the center
 * of the screen where the page's actual reading content lives. Sits below
 * `RainCanvas`'s `z-[60]` so the rain streaks still visibly fall on top of
 * the fogged glass, above ordinary page content.
 *
 * Always mounted while Night Ops is active (not just during heavy-rain)
 * so `opacity`/`backdrop-filter` can transition smoothly on plain CSS —
 * ramping in as the cycle reaches heavy-rain and back out as it moves on,
 * rather than a JS-animated loop of its own. `pointer-events-none`
 * throughout so it never blocks input.
 */
export function WeatherGlassOverlay({ phase }: { phase: WeatherPhase }) {
  const active = phase === "heavy-rain";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55]"
      style={{
        opacity: active ? 1 : 0,
        transition: "opacity 2200ms ease-out, backdrop-filter 2200ms ease-out",
        backdropFilter: active ? "blur(5px)" : "blur(0px)",
        WebkitBackdropFilter: active ? "blur(5px)" : "blur(0px)",
        // Transparent at the center, opaque toward the edges — the mask
        // (not the blur radius) is what keeps the middle of the screen
        // crisp, since backdrop-filter only affects pixels where this
        // element itself is visible.
        maskImage:
          "radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, transparent 40%, black 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, transparent 40%, black 100%)",
        background:
          "linear-gradient(155deg, hsl(50 100% 60% / 0.10), transparent 45%, hsl(210 70% 60% / 0.06) 80%)",
      }}
    />
  );
}
