"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { RainCanvas } from "@/components/theme/night-ops/RainCanvas";
import { WeatherGlassOverlay } from "@/components/theme/night-ops/WeatherGlassOverlay";
import { useWeatherCycle } from "@/components/theme/night-ops/weatherCycle";
import { BatSignalTransition } from "@/components/theme/night-ops/BatSignalTransition";

const BatSignalTriggerContext = createContext<(() => void) | null>(null);

/**
 * Call from the exact click handler that flips the theme into Night Ops
 * (see ThemeToggle) so the bat signal plays synchronously with that one
 * real interaction — no observation/diffing of `theme` involved, and so
 * no chance of misfiring on hydration. Safe to call even where no
 * provider is mounted (falls back to a no-op) so ThemeToggle doesn't
 * need to know whether it's wrapped.
 */
export function useBatSignalTrigger() {
  const trigger = useContext(BatSignalTriggerContext);
  return trigger ?? (() => {});
}

/**
 * Mounted once in the root layout, wrapping the whole app. Renders the
 * Night Ops preview theme's decoration — see globals.css for the token
 * side of this theme:
 *  - RainCanvas + WeatherGlassOverlay, driven by useWeatherCycle's
 *    automatic rain -> heavy rain (blur + glass + bloom) -> snow -> rain
 *    loop (see weatherCycle.ts — there's no "nothing falling" state,
 *    always some precipitation), only while the theme is "night-ops".
 *    RainCanvas is meant to read as
 *    weather on the glass in front of the whole app, so it carries an
 *    explicit z-index (see RainCanvas) to sit above page content,
 *    including SVGs and other canvases that create their own stacking
 *    contexts, rather than relying on DOM order.
 *  - The snow phase also flips the app's signal color from lime-yellow to
 *    blue — done here by toggling `data-weather="snow"` on `<html>`
 *    (globals.css's `[data-weather="snow"]` block does the actual color
 *    swap), the same attribute-on-root pattern ThemeProvider uses for
 *    `data-theme`, since --color-signal cascades to the whole app via
 *    Tailwind's `@theme inline` tokens and a locally-scoped override
 *    wouldn't reach it.
 *  - BatSignalTransition, the one-shot bat-signal moment played by
 *    bumping `signalKey` via useBatSignalTrigger above. There is no
 *    ambient bat-signal glow anymore — it used to sit behind every
 *    night-ops page for the whole session, which read as clutter; now
 *    the signal only ever appears as this transient overlay, tied to
 *    the actual toggle click.
 *
 * All three of RainCanvas/WeatherGlassOverlay/BatSignalTransition are
 * `pointer-events-none` so none of them ever blocks input.
 */
export function NightOpsAtmosphere({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [signalKey, setSignalKey] = useState(0);
  const triggerSignal = useCallback(() => setSignalKey((key) => key + 1), []);
  const weatherPhase = useWeatherCycle(theme === "night-ops");

  useEffect(() => {
    if (theme === "night-ops" && weatherPhase === "snow") {
      document.documentElement.setAttribute("data-weather", "snow");
    } else {
      document.documentElement.removeAttribute("data-weather");
    }
    return () => document.documentElement.removeAttribute("data-weather");
  }, [theme, weatherPhase]);

  return (
    <BatSignalTriggerContext.Provider value={triggerSignal}>
      {theme === "night-ops" && (
        <>
          <WeatherGlassOverlay phase={weatherPhase} />
          <RainCanvas phase={weatherPhase} />
        </>
      )}
      <BatSignalTransition replayKey={signalKey} />
      {children}
    </BatSignalTriggerContext.Provider>
  );
}
