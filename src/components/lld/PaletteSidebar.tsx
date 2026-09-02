import type { DragEvent, KeyboardEvent } from "react";
import { Component, Layers } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import type { ClassStereotype } from "@/lld-modeling/types";
import { useLldStore } from "@/store/lldStore";

export const LLD_DRAG_MIME_TYPE = "application/x-engineering-studio-lld-class";

const PALETTE_ITEMS: { stereotype: ClassStereotype; label: string; description: string; icon: typeof Component }[] = [
  { stereotype: "class", label: "Class", description: "A concrete class — fields, methods, both.", icon: Component },
  { stereotype: "interface", label: "Interface", description: "A contract — implicitly abstract methods.", icon: Layers },
];

/**
 * The `/lld/editor` equivalent of `ComponentSidebar.tsx`, cut down to what
 * a 2-item palette actually needs: always-docked (no on-demand
 * open/close toggle — that earns its complexity at 12+ catalog entries,
 * not 2), no night-ops/WeaponWheel variant. Same drag-and-drop mechanics
 * (a MIME-type constant carrying the stereotype, click-to-add as the
 * keyboard/no-drag fallback) as its counterpart.
 */
export function PaletteSidebar() {
  const nodes = useLldStore((s) => s.nodes);
  const addClass = useLldStore((s) => s.addClass);

  const handleAdd = (stereotype: ClassStereotype) => {
    const columns = 3;
    const columnStep = 280;
    const rowStep = 220;
    const index = nodes.length;
    addClass(stereotype, {
      x: 120 + (index % columns) * columnStep,
      y: 120 + Math.floor(index / columns) * rowStep,
    });
  };

  return (
    <aside className="absolute left-3 top-3 z-30 w-56 overflow-hidden border border-border bg-bg-elevated shadow-elevated">
      <Panel.Header title="Add to diagram" accent />
      <div className="flex flex-col gap-1 p-2">
        {PALETTE_ITEMS.map((item) => (
          <PaletteCard key={item.stereotype} item={item} onSelect={() => handleAdd(item.stereotype)} />
        ))}
      </div>
    </aside>
  );
}

function PaletteCard({
  item,
  onSelect,
}: {
  item: (typeof PALETTE_ITEMS)[number];
  onSelect: () => void;
}) {
  const Icon = item.icon;

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(LLD_DRAG_MIME_TYPE, item.stereotype);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className="group flex items-start gap-2.5 border border-transparent p-2 text-left
        transition-all duration-fast ease-standard cursor-grab
        hover:-translate-y-0.5 hover:border-border-hover hover:bg-bg-panel active:translate-y-0 active:cursor-grabbing
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{item.label}</p>
        <p className="truncate text-xs text-text-subtle">{item.description}</p>
      </div>
    </div>
  );
}
