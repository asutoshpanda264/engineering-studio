"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { BatSpotlight } from "@/components/theme/night-ops/BatSpotlight";
import { RainCanvas } from "@/components/theme/night-ops/RainCanvas";
import { BatSwarmTransition } from "@/components/theme/night-ops/BatSwarmTransition";

const BatSwarmTriggerContext = createContext<(() => void) | null>(null);

/**
 * Call from the exact click handler that flips the theme into Night Ops
 * (see ThemeToggle) so the swarm plays synchronously with that one real
 * interaction — no observation/diffing of `theme` involved, and so no
 * chance of misfiring on hydration. Safe to call even where no provider
 * is mounted (falls back to a no-op) so ThemeToggle doesn't need to know
 * whether it's wrapped.
 */
export function useBatSwarmTrigger() {
  const trigger = useContext(BatSwarmTriggerContext);
  return trigger ?? (() => {});
}

/**
 * Mounted once in the root layout, wrapping the whole app. Renders the
 * Night Ops preview theme's decoration — see globals.css for the token
 * side of this theme:
 *  - BatSpotlight, the ambient backdrop glow, only while the theme
 *    actually *is* "night-ops". Rendered before `children` in this
 *    component's own output and left at the default stacking order, so
 *    ordinary page content paints on top of it by plain DOM order — no
 *    z-index needed.
 *  - RainCanvas, the ambient rain, also only while the theme is
 *    "night-ops" — but it's meant to read as rain on the glass in front
 *    of the whole app, so unlike BatSpotlight it carries an explicit
 *    z-index (see RainCanvas) to sit above page content, including SVGs
 *    and other canvases that create their own stacking contexts, rather
 *    than relying on DOM order.
 *  - BatSwarmTransition, the one-shot flock-crossing-the-screen moment
 *    played by bumping `swarmKey` via useBatSwarmTrigger above.
 *
 * All three are `pointer-events-none` so none of this ever blocks input.
 */
export function NightOpsAtmosphere({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [swarmKey, setSwarmKey] = useState(0);
  const triggerSwarm = useCallback(() => setSwarmKey((key) => key + 1), []);

  return (
    <BatSwarmTriggerContext.Provider value={triggerSwarm}>
      {theme === "night-ops" && (
        <>
          <BatSpotlight />
          <RainCanvas />
        </>
      )}
      <BatSwarmTransition replayKey={swarmKey} />
      {children}
    </BatSwarmTriggerContext.Provider>
  );
}
