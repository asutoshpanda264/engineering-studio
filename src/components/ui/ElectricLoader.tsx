import { Zap } from "lucide-react";

/**
 * Route-level loading UI — the bolt from the landing page's Cache node,
 * flickering, with a trace line sweeping under it like current on a wire.
 * Sits inside the same hairline "specimen" frame (corner Fig. tag) as
 * every other block in the product, on the plain page background, so a
 * route change reads as this interface doing something rather than a
 * blank flash before an abrupt swap. Wired in via each route's
 * `loading.tsx` — Next.js shows it immediately on navigation and swaps it
 * out once the destination has rendered.
 *
 * `fullScreen` (default `true`, unchanged for every existing `loading.tsx`
 * caller) makes the wrapper `min-h-screen` and paint the page background
 * itself. Pass `false` to embed this same loader *inside* an
 * already-sized container instead (fills it via `h-full w-full`, no
 * background of its own) — `FoundationsMap` uses this for its own
 * client-side "still resolving progress" gap, the same visual language
 * as a route change rather than a bespoke spinner.
 */
export function ElectricLoader({ fullScreen = true }: { fullScreen?: boolean } = {}) {
  return (
    <div
      className={
        fullScreen
          ? "flex min-h-screen items-center justify-center bg-bg"
          : "flex h-full w-full items-center justify-center"
      }
    >
      <div className="relative flex flex-col items-center gap-4 border border-border bg-bg-panel px-10 py-8">
        <span className="absolute -top-px -left-px border border-signal/50 bg-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
          Fig. 00 — Loading
        </span>
        <Zap className="size-8 fill-signal text-signal animate-electric-flicker" aria-hidden />
        <div className="h-px w-24 overflow-hidden bg-border">
          <div className="h-full w-8 bg-signal animate-electric-sweep" />
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-subtle">
          Loading
        </span>
      </div>
    </div>
  );
}
