import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { TourStep } from "@/components/tour/types";
import { useLiveRect } from "@/lib/useLiveRect";

const SPOTLIGHT_PADDING = 8;
const CALLOUT_WIDTH = 320;
const CALLOUT_GAP = 16;

/**
 * Renders the current step as a dimmed backdrop with a cutout "spotlight"
 * around the target element, plus an anchored callout bubble explaining
 * what to do. Everything here is `pointer-events: none` except the
 * callout's own buttons — the spotlight is a visual frame, not a click
 * blocker, since the whole point is that the user interacts with the real
 * element underneath it (drags the real sidebar card, clicks the real
 * node, presses the real Run button).
 */
export function TourOverlay({
  step,
  onNext,
  onSkip,
}: {
  step: TourStep;
  onNext: () => void;
  onSkip: () => void;
}) {
  const targetRect = useLiveRect(step.getTarget, true);

  const spotlightStyle = useMemo(() => {
    if (!targetRect) return null;
    return {
      top: targetRect.top - SPOTLIGHT_PADDING,
      left: targetRect.left - SPOTLIGHT_PADDING,
      width: targetRect.width + SPOTLIGHT_PADDING * 2,
      height: targetRect.height + SPOTLIGHT_PADDING * 2,
    };
  }, [targetRect]);

  const calloutStyle = useMemo(
    () => computeCalloutPosition(targetRect, step.placement),
    [targetRect, step.placement]
  );

  const isAutoAdvancing = !step.requiresAck;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Dimmed backdrop — a single box-shadow illusion (huge spread on a
          box the exact size of the target) rather than four separate
          dimming rectangles, so it self-adjusts to any target size/shape
          with one style object. No spotlight (welcome/completion beats)
          just dims the whole screen instead. */}
      <div
        className="absolute inset-0 transition-all duration-normal ease-standard"
        style={
          spotlightStyle
            ? {
                top: spotlightStyle.top,
                left: spotlightStyle.left,
                width: spotlightStyle.width,
                height: spotlightStyle.height,
                position: "fixed",
                boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.65)",
                border: "2px solid var(--color-signal)",
              }
            : { background: "rgb(0 0 0 / 0.65)" }
        }
      />

      <div
        className="pointer-events-auto fixed flex w-80 flex-col gap-3 border border-signal bg-bg-elevated p-4 shadow-dropdown"
        style={calloutStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
            Guide
          </span>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Hide this guide — resume it anytime from the panel in the corner"
            title="Hide this guide — resume it anytime from the panel in the corner"
            className="text-text-subtle transition-colors duration-fast ease-standard hover:text-text"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-text">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{step.body}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="font-mono text-[11px] text-text-subtle">
            {isAutoAdvancing ? "Waiting for you…" : ""}
          </span>
          {!isAutoAdvancing && (
            <Button variant="primary" size="sm" onClick={onNext}>
              {step.primaryLabel ?? "Next"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Places the callout on the requested side of the target, clamped inside
 * the viewport so it never renders partially offscreen near an edge —
 * good enough for this tour's fixed, hand-picked placements (no target
 * sits close enough to two edges at once to need a full auto-flip
 * algorithm).
 */
function computeCalloutPosition(
  targetRect: DOMRect | null,
  placement: TourStep["placement"]
): { top: number; left: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!targetRect) {
    return {
      top: viewportHeight / 2 - 100,
      left: viewportWidth / 2 - CALLOUT_WIDTH / 2,
    };
  }

  let top: number;
  let left: number;

  switch (placement) {
    case "bottom":
      top = targetRect.bottom + CALLOUT_GAP;
      left = targetRect.left + targetRect.width / 2 - CALLOUT_WIDTH / 2;
      break;
    case "top":
      top = targetRect.top - CALLOUT_GAP - 160;
      left = targetRect.left + targetRect.width / 2 - CALLOUT_WIDTH / 2;
      break;
    case "left":
      top = targetRect.top;
      left = targetRect.left - CALLOUT_GAP - CALLOUT_WIDTH;
      break;
    case "right":
    default:
      top = targetRect.top;
      left = targetRect.right + CALLOUT_GAP;
      break;
  }

  return {
    top: Math.min(Math.max(top, 12), viewportHeight - 12),
    left: Math.min(Math.max(left, 12), viewportWidth - CALLOUT_WIDTH - 12),
  };
}
