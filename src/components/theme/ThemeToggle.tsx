"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/theme/ThemeProvider";

/**
 * Icon-only theme toggle, dropped into every header in the app. Shows the
 * *current* theme's icon (Sun = light, Moon = dark) rather than the theme
 * it switches to — matches the OS/Slack convention most people already
 * know. `theme` briefly reads "dark" on first client render for a visitor
 * who has light mode saved (see ThemeProvider's `getServerSnapshot` doc)
 * and self-corrects a frame later — the page's actual colors never flash,
 * only this icon can lag by one frame.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="!px-0 size-8 shrink-0"
      icon={
        theme === "dark" ? (
          <Moon className="size-4" aria-hidden />
        ) : (
          <Sun className="size-4" aria-hidden />
        )
      }
    />
  );
}
