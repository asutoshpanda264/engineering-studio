"use client";

import { Lock, Moon, Sun } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/Button";
import { useTheme, type Theme } from "@/components/theme/ThemeProvider";
import { useBatSignalTrigger } from "@/components/theme/NightOpsAtmosphere";
import { BatMark } from "@/components/theme/icons/BatMark";
import { useLockInState } from "@/lib/lockInMode";

const ICONS: Record<Theme, ComponentType<{ className?: string }>> = {
  dark: Moon,
  light: Sun,
  "night-ops": BatMark,
};

// Kept in sync by hand with ThemeProvider's THEME_CYCLE order.
const NEXT: Record<Theme, Theme> = {
  dark: "light",
  light: "night-ops",
  "night-ops": "dark",
};

/**
 * Icon-only theme toggle, dropped into every header in the app. Cycles
 * dark -> light (Paper, PREVIEW) -> night-ops (PREVIEW, see globals.css) ->
 * dark. Shows the icon for the theme a click switches *to*, not the
 * current one — a sun while in dark (click for Paper), a bat mark while in
 * Paper (click to enter Batman Mode), a moon while in night-ops (click to
 * return to dark) — so the icon always reads as the action the button
 * performs, same convention as a play/pause button.
 * `theme` briefly reads "dark" on first client render for a visitor who
 * has a different theme saved (see ThemeProvider's `getServerSnapshot`
 * doc) and self-corrects a frame later — the page's actual colors never
 * flash, only this icon can lag by one frame.
 *
 * The click into Night Ops also fires the full-screen bat-signal
 * transition (see NightOpsAtmosphere) — done here, synchronously with
 * the actual click, rather than by watching `theme` change elsewhere.
 *
 * While a Batman Mode run is active, `ThemeProvider.toggleTheme` itself
 * refuses to leave night-ops (see its docblock) — this component just
 * reflects that: disabled, swapped to a lock icon, with a label that says
 * why, instead of a click that silently does nothing.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const triggerBatSignal = useBatSignalTrigger();
  const lockInState = useLockInState();
  const locked = theme === "night-ops" && lockInState.active;
  const nextTheme = NEXT[theme];
  const Icon = locked ? Lock : ICONS[nextTheme];
  const label = locked ? "Theme locked — Batman Mode is active" : `Switch to ${nextTheme} mode`;

  const handleClick = () => {
    if (nextTheme === "night-ops") {
      triggerBatSignal();
    }
    toggleTheme();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={locked}
      aria-label={label}
      title={label}
      className="!px-0 size-8 shrink-0"
      icon={<Icon className="size-4" aria-hidden />}
    />
  );
}
