import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
 * right tool for scanning items in light/dark, but this theme already
 * commits to a HUD aesthetic, so leaning into it here is a fit, not a
 * gimmick tacked onto every theme.
 *
 * Renders exactly one `Dial` — "Distributed Systems" or "AI Flow" — for
 * whichever `group` its caller already picked (`ComponentSidebar`'s
 * separate "SDE Weapon"/"AI Weapon" triggers), mirroring the light/dark
 * sidebar's `DistributedSystemsPalette`/`AIFlowPalette` split: the two
 * catalogs are separate sandboxes, so the domain pick happens once, before
 * the wheel opens, rather than blending 20 wedges into one ring.
 *
 * SVG carries each dial's wedge geometry (real clickable sectors, computed
 * with polar trig below) while each icon is a plain positioned HTML node
 * laid on top at the same coordinates — mixing the two is simpler than
 * fighting `foreignObject` just to keep using the existing lucide `<Icon />`
 * components without re-deriving their paths.
 */

const DIAL_SIZE = 300;
const CENTER = DIAL_SIZE / 2;
const OUTER_R = 140;
const INNER_R = 62;
const ICON_R = (INNER_R + OUTER_R) / 2;
const GAP_DEG = 2;

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

export type WeaponWheelGroup = "distributed" | "ai-flow";

const DIAL_GROUP_LABEL: Record<WeaponWheelGroup, string> = {
  distributed: "Distributed Systems",
  "ai-flow": "AI Flow",
};

function itemsForGroup(items: EntityCatalogItem[], group: WeaponWheelGroup): EntityCatalogItem[] {
  return group === "distributed"
    ? items.filter((item) => !item.domain)
    : items.filter((item) => item.domain === "agentic");
}

/**
 * One wheel at a time, picked beforehand by the two separate "SDE Weapon"/
 * "AI Weapon" triggers in `ComponentSidebar` — replaces an earlier version
 * that opened both dials side by side behind one "Choose Weapon" trigger.
 * Direct feedback: two full wheels at once read as visually busy/boxed-in;
 * picking the domain first, the same way the light/dark sidebar's two
 * separate pack triggers already do, gives each wheel the full modal to
 * itself instead of competing for space.
 */
export function WeaponWheel({
  group,
  onClose,
  onSelect,
}: {
  group: WeaponWheelGroup;
  onClose: () => void;
  onSelect: (type: EntityType) => void;
}) {
  const items = itemsForGroup(ENTITY_CATALOG, group);

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
      aria-label={`Choose a component — ${DIAL_GROUP_LABEL[group]}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full border border-border bg-bg-elevated text-text-muted transition-colors duration-fast ease-standard hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        <X className="size-4" aria-hidden />
      </button>

      <div className="flex flex-col items-center" onClick={(event) => event.stopPropagation()}>
        <Dial label={DIAL_GROUP_LABEL[group]} items={items} onSelect={onSelect} index={0} />
      </div>
    </div>
  );
}

function Dial({
  label,
  items,
  onSelect,
  index,
}: {
  label: string;
  items: EntityCatalogItem[];
  onSelect: (type: EntityType) => void;
  index: number;
}) {
  const [hovered, setHovered] = useState<EntityCatalogItem | null>(null);
  const step = 360 / items.length;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-signal">{label}</p>
      {/* Cosmetic spin-in on open — the wedges (and everything laid over
          them) whirl into place rather than just appearing. Purely an
          entrance flourish: rotation always settles at 0deg, so selection
          geometry (`polarToCartesian`/`wedgePath` above) is never actually
          affected mid-animation, and once settled the wheel behaves
          exactly as before. */}
      <motion.div
        className="relative flex flex-col items-center justify-center"
        style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
        initial={{ rotate: -200, opacity: 0, scale: 0.85 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg
          width={DIAL_SIZE}
          height={DIAL_SIZE}
          viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
          className="absolute inset-0"
          style={{ filter: "drop-shadow(0 0 40px color-mix(in srgb, var(--color-signal) 35%, transparent))" }}
        >
          {/* No outer ring, no per-wedge stroke — the glow's `drop-shadow`
              (which re-projects every edge's alpha as a soft halo) turned
              the previous hairline borders into a hard gold grid, reading
              as a boxed-in pie chart rather than a wheel. `GAP_DEG`'s
              negative space between wedges, plus each wedge's own fill,
              are what separate them now — a soft radial cluster instead
              of a bordered chart. */}
          {items.map((item, i) => {
            const start = i * step + GAP_DEG / 2;
            const end = (i + 1) * step - GAP_DEG / 2;
            const disabled = !item.implemented;
            const isHovered = hovered?.type === item.type;
            return (
              <path
                key={item.type}
                d={wedgePath(start, end)}
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
                className={`size-4 transition-colors duration-100 ${
                  disabled ? "text-text-subtle" : isHovered ? "text-signal" : "text-text-muted"
                }`}
                aria-hidden
              />
            </div>
          );
        })}

        <div
          className="pointer-events-none absolute flex flex-col items-center justify-center gap-1 text-center"
          style={{ left: CENTER, top: CENTER, transform: "translate(-50%, -50%)", width: INNER_R * 2 - 20 }}
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
      </motion.div>
    </div>
  );
}
