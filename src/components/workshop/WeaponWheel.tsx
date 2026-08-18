import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import type { EntityCatalogItem } from "@/lib/entityCatalog";
import type { EntityType } from "@/simulation/types";

/**
 * "Batman Mode" (the `night-ops` theme)'s replacement for the plain
 * Components panel — a radial select, same idea as a game's weapon wheel:
 * a ring of wedges around a hollow center that echoes back whatever's
 * currently under the pointer, one click commits it. Reserved for
 * night-ops specifically (see ComponentSidebar.tsx) — a docked list is the
 * right tool for scanning 12 items in light/dark, but this theme already
 * commits to a HUD aesthetic, so leaning into it here is a fit, not a
 * gimmick tacked onto every theme.
 *
 * SVG carries the wedge geometry (real clickable sectors, computed with
 * polar trig below) while each icon is a plain positioned HTML node laid
 * on top at the same coordinates — mixing the two is simpler than fighting
 * `foreignObject` just to keep using the existing lucide `<Icon />`
 * components without re-deriving their paths.
 */

const WHEEL_SIZE = 400;
const CENTER = WHEEL_SIZE / 2;
const OUTER_R = 188;
const INNER_R = 84;
const ICON_R = (INNER_R + OUTER_R) / 2;
const GAP_DEG = 1.5;

function polarToCartesian(radius: number, angleDeg: number) {
  // -90 so index 0 starts at 12 o'clock instead of 3 o'clock — reads as a
  // clock face, matching the reference image's layout.
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function wedgePath(startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(OUTER_R, endAngle);
  const outerEnd = polarToCartesian(OUTER_R, startAngle);
  const innerStart = polarToCartesian(INNER_R, startAngle);
  const innerEnd = polarToCartesian(INNER_R, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

export function WeaponWheel({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (type: EntityType) => void;
}) {
  const [hovered, setHovered] = useState<EntityCatalogItem | null>(null);
  const items = ENTITY_CATALOG;
  const step = 360 / items.length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose a component"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center justify-center"
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
        onClick={(event) => event.stopPropagation()}
      >
        <svg
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          className="absolute inset-0"
          style={{ filter: "drop-shadow(0 0 50px color-mix(in srgb, var(--color-signal) 35%, transparent))" }}
        >
          <circle cx={CENTER} cy={CENTER} r={OUTER_R + 2} fill="none" stroke="var(--color-border)" strokeWidth={1} />
          {items.map((item, i) => {
            const start = i * step + GAP_DEG / 2;
            const end = (i + 1) * step - GAP_DEG / 2;
            const disabled = !item.implemented;
            const isHovered = hovered?.type === item.type;
            return (
              <path
                key={item.type}
                d={wedgePath(start, end)}
                stroke="var(--color-border)"
                strokeWidth={1}
                className={
                  disabled
                    ? "cursor-not-allowed fill-bg-panel opacity-40"
                    : isHovered
                      ? "cursor-pointer fill-signal/25 transition-colors duration-100"
                      : "cursor-pointer fill-bg-elevated transition-colors duration-100 hover:fill-signal/15"
                }
                role={disabled ? undefined : "button"}
                tabIndex={disabled ? -1 : 0}
                aria-label={disabled ? `${item.name} — coming soon` : item.name}
                aria-disabled={disabled}
                onMouseEnter={() => !disabled && setHovered(item)}
                onMouseLeave={() => setHovered((h) => (h?.type === item.type ? null : h))}
                onFocus={() => !disabled && setHovered(item)}
                onBlur={() => setHovered((h) => (h?.type === item.type ? null : h))}
                onClick={() => !disabled && onSelect(item.type)}
                onKeyDown={(event) => {
                  if (disabled) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item.type);
                  }
                }}
              />
            );
          })}
        </svg>

        {items.map((item, i) => {
          const mid = i * step + step / 2;
          const pos = polarToCartesian(ICON_R, mid);
          const Icon = item.icon;
          const disabled = !item.implemented;
          const isHovered = hovered?.type === item.type;
          return (
            <div
              key={item.type}
              className="pointer-events-none absolute flex flex-col items-center gap-1"
              style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
            >
              <Icon
                className={`size-5 transition-colors duration-100 ${
                  disabled ? "text-text-subtle" : isHovered ? "text-signal" : "text-text-muted"
                }`}
                aria-hidden
              />
            </div>
          );
        })}

        <div
          className="pointer-events-none absolute flex flex-col items-center justify-center gap-1 text-center"
          style={{ left: CENTER, top: CENTER, transform: "translate(-50%, -50%)", width: INNER_R * 2 - 28 }}
        >
          {hovered ? (
            <>
              <p className="text-sm font-medium text-text">{hovered.name}</p>
              <p className="text-[11px] leading-snug text-text-subtle">{hovered.description}</p>
              {!hovered.implemented && (
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-signal">Soon</p>
              )}
            </>
          ) : (
            <p className="text-xs text-text-subtle">Pick a component</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-1 -right-1 flex size-8 items-center justify-center rounded-full border border-border bg-bg-elevated text-text-muted transition-colors duration-fast ease-standard hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
