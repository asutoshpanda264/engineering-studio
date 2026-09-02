"use client";

import { useState } from "react";
import { ScanEye } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useWorkshopStore } from "@/store/workshopStore";
import { findBottleneckNodeId } from "@/lib/bottleneckDetection";
import { useLiveRect } from "@/lib/useLiveRect";

const SPOTLIGHT_PADDING = 14;

/**
 * "Batman Mode" (`night-ops`)'s reskin of the plain "Bottleneck" badge
 * ComponentNode already renders (see bottleneckDetection.ts) — same
 * detection, same threshold, just a dramatically different presentation:
 * a toggleable full-screen scan that fades the whole app to near-black
 * except a spotlight cutout around whichever node is over the utilization
 * threshold, with a scanning sweep and a live readout, the way Arkham's
 * Detective Mode singles out a threat in an otherwise dead scene.
 *
 * Reserved for night-ops specifically, like WeaponWheel — this theme
 * already commits to a HUD aesthetic, so leaning into it here fits rather
 * than being a gimmick bolted onto every theme. Renders nothing outside
 * night-ops so callers (ArchitectureCanvas) don't need their own
 * conditional.
 *
 * The spotlight geometry mirrors TourOverlay's box-shadow cutout trick
 * (a huge shadow spread on a box the target's exact size, rather than
 * four separate dimming rectangles) — `useLiveRect` is the same shared
 * hook that pattern already used, promoted out of `components/tour/` now
 * that a second, unrelated caller needs it.
 *
 * The scrim itself is `pointer-events-none` (read-only visual mode, not a
 * click blocker) and sits at `z-[80]`; the toggle button carries its own
 * `z-[90]` so it stays visibly lit and clickable above the dimming rather
 * than getting swallowed into the dark like everything else underneath —
 * it's the one piece of chrome this mode deliberately leaves alone.
 */
export function DetectiveVisionHUD() {
  const { theme } = useTheme();
  const [active, setActive] = useState(false);
  const nodes = useWorkshopStore((s) => s.nodes);
  const entityMetrics = useWorkshopStore((s) => s.playbackMetrics?.entityMetrics);
  const bottleneckId = findBottleneckNodeId(nodes, entityMetrics);
  const bottleneckNode = bottleneckId ? nodes.find((n) => n.id === bottleneckId) : undefined;
  const utilization = bottleneckId ? entityMetrics?.[bottleneckId]?.utilization : undefined;

  const targetRect = useLiveRect(
    () => (bottleneckId ? document.querySelector<HTMLElement>(`.react-flow__node[data-id="${bottleneckId}"]`) : null),
    active
  );

  if (theme !== "night-ops") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setActive((v) => !v)}
        aria-pressed={active}
        aria-label={active ? "Exit Detective Vision" : "Enter Detective Vision"}
        title={active ? "Exit Detective Vision" : "Enter Detective Vision"}
        className={`relative z-[90] inline-flex h-9 items-center gap-2 border px-3 text-xs font-medium uppercase tracking-wide shadow-elevated transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
          active
            ? "border-signal bg-signal/15 text-signal"
            : "border-signal/40 bg-bg-elevated text-text hover:border-signal hover:text-signal"
        }`}
      >
        <ScanEye className="size-4 text-signal" aria-hidden />
        Detective Vision
      </button>

      {active && (
        <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
          {targetRect ? (
            <>
              {/* Dark scrim everywhere except a box the size of the
                  flagged node — same box-shadow-spread illusion
                  TourOverlay uses, so it self-adjusts to any node size
                  with one style object rather than four dimming rects. */}
              <motion.div
                className="fixed"
                style={{
                  top: targetRect.top - SPOTLIGHT_PADDING,
                  left: targetRect.left - SPOTLIGHT_PADDING,
                  width: targetRect.width + SPOTLIGHT_PADDING * 2,
                  height: targetRect.height + SPOTLIGHT_PADDING * 2,
                }}
                animate={{
                  boxShadow: [
                    "0 0 0 9999px hsl(240 30% 3% / 0.82), 0 0 0 2px var(--color-signal)",
                    "0 0 0 9999px hsl(240 30% 3% / 0.82), 0 0 24px 2px var(--color-signal)",
                    "0 0 0 9999px hsl(240 30% 3% / 0.82), 0 0 0 2px var(--color-signal)",
                  ],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* The scanning sweep, bounded to the cutout. */}
              <motion.div
                className="fixed h-px"
                style={{
                  left: targetRect.left - SPOTLIGHT_PADDING,
                  width: targetRect.width + SPOTLIGHT_PADDING * 2,
                  background:
                    "linear-gradient(to right, transparent, var(--color-signal), transparent)",
                  boxShadow: "0 0 8px 1px var(--color-signal)",
                }}
                initial={{ top: targetRect.top - SPOTLIGHT_PADDING }}
                animate={{
                  top: [
                    targetRect.top - SPOTLIGHT_PADDING,
                    targetRect.top + targetRect.height + SPOTLIGHT_PADDING,
                    targetRect.top - SPOTLIGHT_PADDING,
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              />

              {/* Readout, anchored just above the cutout. */}
              <div
                className="fixed flex flex-col items-start gap-0.5 font-mono"
                style={{
                  left: targetRect.left - SPOTLIGHT_PADDING,
                  top: Math.max(targetRect.top - SPOTLIGHT_PADDING - 44, 12),
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-signal">
                  Threat flagged
                </span>
                <span className="text-xs text-[hsl(47_6%_93%)]">
                  {bottleneckNode?.data.label ?? "Unknown node"}
                  {utilization !== undefined && ` — ${Math.round(utilization * 100)}% load`}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="fixed inset-0 bg-[hsl(240_30%_3%/0.82)]" />
              <div className="fixed inset-0 flex items-center justify-center">
                <p className="font-mono text-sm uppercase tracking-[0.14em] text-signal">
                  No threats detected — all systems nominal
                </p>
              </div>
            </>
          )}
        </div>
      )}

    </>
  );
}
