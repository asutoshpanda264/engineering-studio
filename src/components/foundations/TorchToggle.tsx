"use client";

import { Flashlight, FlashlightOff } from "lucide-react";
import { setTorchOn, useTorchMode } from "@/lib/torchMode";

/**
 * The map's one piece of cave gear — a HUD control, viewport-pinned bottom-left
 * (stacked directly above `MapZoomControls`, same corner, so "the left
 * corner" reads as one cluster rather than two unrelated ones) — that
 * switches the reader's cursor into a torch (see `TorchCursor`) and lets
 * `CaveShroud` start punching a small moving hole in the darkness instead
 * of leaving locked lessons fully invisible. Only ever rendered by
 * `FoundationsMap` when `cave` is true (Batman Mode / `data-theme="night-ops"`)
 * — outside the cave there's no darkness to light, so no control for it.
 *
 * Styled as a literal glowing stick standing in the corner rather than a
 * plain icon button: a slim vertical bar that's dark and inert when off,
 * and lit with a soft blue bloom (the same "flame-blue" the torch cursor
 * itself uses, not the signal-yellow reserved for progress) once switched
 * on — the visual promise being lit here is "this is a light source you're
 * carrying," not just a settings toggle.
 */
export function TorchToggle() {
  const on = useTorchMode();
  const Icon = on ? Flashlight : FlashlightOff;

  return (
    <button
      type="button"
      onClick={() => setTorchOn(!on)}
      aria-pressed={on}
      aria-label={on ? "Turn off the torch" : "Turn on the torch — reveals locked lessons near your cursor"}
      title={on ? "Torch on — click to put it out" : "Light the torch"}
      className="absolute bottom-20 left-6 z-10 flex items-center gap-2 border border-border bg-bg/90 px-2.5 py-2 backdrop-blur transition-colors duration-fast ease-standard hover:border-border-hover"
    >
      {/* The "stick" — a slim bar that's just a dim sliver unlit, and
          gains a saturated fill plus a soft outer bloom (box-shadow, not
          just a color change) once lit, so the "you're now carrying a
          light" read comes from brightness/glow, not only hue. */}
      <span
        aria-hidden
        className={`h-5 w-1 shrink-0 rounded-full transition-all duration-fast ease-standard ${
          on ? "bg-[hsl(205_90%_62%)] shadow-[0_0_10px_3px_hsl(205_90%_62%/0.65)]" : "bg-text-subtle/40"
        }`}
      />
      <Icon className={`size-3.5 ${on ? "text-[hsl(205_90%_72%)]" : "text-text-subtle"}`} aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-wide text-text-subtle">Torch</span>
    </button>
  );
}
