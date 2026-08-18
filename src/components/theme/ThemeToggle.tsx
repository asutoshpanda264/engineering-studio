"use client";

import { Lock, Moon, Sun } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/Button";
import { useTheme, type Theme } from "@/components/theme/ThemeProvider";
import { useBatSwarmTrigger } from "@/components/theme/NightOpsAtmosphere";
import { BatMark } from "@/components/theme/icons/BatMark";
import { useLockInState } from "@/lib/lockInMode";

const ICONS: Record<Theme, ComponentType<{ className?: string }>> = {
  dark: Moon,
  "night-ops": BatMark,
  light: Sun,
};

// Kept in sync by hand with ThemeProvider's THEME_CYCLE order.
const NEXT: Record<Theme, Theme> = {
  dark: "night-ops",
  "night-ops": "light",
  light: "dark",
};

/**
 * Icon-only theme toggle, dropped into every header in the app. Cycles
 * dark -> night-ops (PREVIEW, see globals.css) -> light -> dark. Shows the
 * *current* theme's icon rather than the theme it switches to — matches
 * the OS/Slack convention most people already know for the light/dark
 * pair, extended with a bat mark for the preview third theme. `theme`
 * briefly reads "dark" on first client render for a visitor who has a
 * different theme saved (see ThemeProvider's `getServerSnapshot` doc) and
 * self-corrects a frame later — the page's actual colors never flash,
 * only this icon can lag by one frame.
 *
 * The click into Night Ops also fires the flying-bat swarm transition
 * (see NightOpsAtmosphere) — done here, synchronously with the actual
 * click, rather than by watching `theme` change elsewhere.
 *
 * While a Batman Mode run is active, `ThemeProvider.toggleTheme` itself
 * refuses to leave night-ops (see its docblock) — this component just
 * reflects that: disabled, swapped to a lock icon, with a label that says
 * why, instead of a click that silently does nothing.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const triggerSwarm = useBatSwarmTrigger();
  const lockInState = useLockInState();
  const locked = theme === "night-ops" && lockInState.active;
  const nextTheme = NEXT[theme];
  const Icon = locked ? Lock : ICONS[theme];
  const label = locked ? "Theme locked — Batman Mode is active" : `Switch to ${nextTheme} mode`;

  const handleClick = () => {
    if (nextTheme === "night-ops") {
      triggerSwarm();
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
