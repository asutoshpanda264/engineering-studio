import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { LayoutGrid, Swords, X } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { EntityType } from "@/simulation/types";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import type { EntityCatalogItem } from "@/lib/entityCatalog";
import { useWorkshopStore } from "@/store/workshopStore";
import { useTheme } from "@/components/theme/ThemeProvider";
import { WeaponWheel } from "@/components/workshop/WeaponWheel";

export const ENTITY_DRAG_MIME_TYPE = "application/x-engineering-studio-entity";

/**
 * Staggers click-added nodes in a grid so they don't overlap.
 * Step sizes are larger than the 176px node card so cards never touch.
 */
function nextClickPosition(nodeCount: number) {
  const columns = 4;
  const columnStep = 240;
  const rowStep = 120;
  return {
    x: 120 + (nodeCount % columns) * columnStep,
    y: 120 + Math.floor(nodeCount / columns) * rowStep,
  };
}

/**
 * The palette is on-demand, not a permanent dock (feedback: the fixed
 * left+right slabs made the workshop feel cluttered) — this renders only
 * a small trigger floating over the canvas's top-left corner; the actual
 * picker mounts on top of the canvas when opened instead of pushing it,
 * so the default view is canvas-first. What the trigger opens depends on
 * theme: `night-ops` ("Batman Mode") gets the WeaponWheel, a radial pick
 * matching that theme's HUD styling — light/dark get a plain docked list,
 * which is the better tool for scanning 12 items outside that theme.
 * `nodes`/`addNode` live here (not inside the list/wheel) since both
 * selection paths funnel through the same `handleSelectComponent`.
 *
 * `forceListMode`: set by `/tutorial` (via `WorkshopShell`'s
 * `forceComponentsList`) to keep the plain list even in night-ops — the
 * guided tour's steps spotlight specific catalog cards by DOM id, which
 * WeaponWheel's wedges don't carry. `/workshop` never sets it, so Batman
 * Mode still gets the wheel there.
 */
export function ComponentSidebar({ forceListMode = false }: { forceListMode?: boolean }) {
  const { theme } = useTheme();
  const isBatman = theme === "night-ops" && !forceListMode;
  // Store-backed, not local state — the guided tour (TutorialRunner) needs
  // to force this open for steps that point at the real catalog list (see
  // tutorialPlanner.ts's `requiresComponentsPanel`).
  const open = useWorkshopStore((s) => s.componentsPanelOpen);
  const setOpen = useWorkshopStore((s) => s.setComponentsPanelOpen);
  const [wheelOpen, setWheelOpen] = useState(false);
  const nodes = useWorkshopStore((s) => s.nodes);
  const addNode = useWorkshopStore((s) => s.addNode);

  const handleSelectComponent = (type: EntityType) => {
    addNode(type, nextClickPosition(nodes.length));
  };

  return (
    <>
      <div className="absolute left-3 top-3 z-30">
        {isBatman ? (
          <button
            type="button"
            onClick={() => setWheelOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-signal/40 bg-bg-elevated px-3 text-xs font-medium uppercase tracking-wide text-text shadow-elevated transition-colors duration-fast ease-standard hover:border-signal hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <Swords className="size-4 text-signal" aria-hidden />
            Choose Weapon
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 text-xs font-medium text-text-muted shadow-elevated transition-colors duration-fast ease-standard hover:border-border-hover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <LayoutGrid className="size-4" aria-hidden />
            {open ? "Hide Components" : "Show Components"}
          </button>
        )}
      </div>

      {open && !isBatman && (
        <aside className="absolute left-3 top-14 z-30 flex max-h-[calc(100%-4rem)] w-72 flex-col overflow-hidden rounded-lg border border-border bg-bg-elevated shadow-elevated">
          <Panel.Header
            title="Components"
            accent
            action={
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close components panel"
                className="text-text-subtle transition-colors duration-fast ease-standard hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            }
          />
          <ComponentsTab onSelectComponent={handleSelectComponent} />
        </aside>
      )}

      {isBatman && wheelOpen && (
        <WeaponWheel
          onClose={() => setWheelOpen(false)}
          onSelect={(type) => {
            handleSelectComponent(type);
            setWheelOpen(false);
          }}
        />
      )}
    </>
  );
}

function ComponentsTab({
  onSelectComponent,
}: {
  onSelectComponent: (type: EntityType) => void;
}) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? ENTITY_CATALOG.filter((item) =>
        item.name.toLowerCase().includes(normalizedQuery)
      )
    : ENTITY_CATALOG;

  const core = filtered.filter((item) => item.phase === 1);
  const modules = filtered.filter((item) => item.phase === 2);

  return (
    <>
      <div className="border-b border-border p-3">
        <Input
          type="text"
          placeholder="Search components…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search components"
        />
      </div>
      <Panel.Body className="flex flex-col gap-4">
        {core.length > 0 && (
          <ComponentGroup
            label="Core"
            items={core}
            onSelectComponent={onSelectComponent}
          />
        )}
        {modules.length > 0 && (
          <ComponentGroup
            label="Modules"
            items={modules}
            onSelectComponent={onSelectComponent}
          />
        )}
        {filtered.length === 0 && (
          <p className="px-1 text-xs text-text-subtle">
            No components match &ldquo;{query}&rdquo;.
          </p>
        )}
      </Panel.Body>
    </>
  );
}

function ComponentGroup({
  label,
  items,
  onSelectComponent,
}: {
  label: string;
  items: EntityCatalogItem[];
  onSelectComponent?: (type: EntityType) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-xs font-medium uppercase tracking-wide text-text-subtle">
        {label}
      </p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <ComponentCard
            key={item.type}
            item={item}
            onSelect={onSelectComponent}
          />
        ))}
      </div>
    </div>
  );
}

function ComponentCard({
  item,
  onSelect,
}: {
  item: EntityCatalogItem;
  onSelect?: (type: EntityType) => void;
}) {
  const disabled = !item.implemented;
  const Icon = item.icon;

  const activate = () => {
    if (!disabled) onSelect?.(item.type);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(ENTITY_DRAG_MIME_TYPE, item.type);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  };

  return (
    <div
      data-tour-id={`sidebar-component-${item.type}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      draggable={!disabled}
      onDragStart={handleDragStart}
      onClick={activate}
      onKeyDown={handleKeyDown}
      className={`group flex items-start gap-2.5 rounded-md border border-transparent p-2 text-left
        transition-all duration-fast ease-standard
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated
        ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-grab hover:-translate-y-0.5 hover:border-border-hover hover:bg-bg-panel active:translate-y-0 active:cursor-grabbing"
        }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-text">
            {item.name}
          </p>
          {disabled && <Badge variant="neutral">Soon</Badge>}
        </div>
        <p className="truncate text-xs text-text-subtle">
          {item.description}
        </p>
      </div>
    </div>
  );
}
