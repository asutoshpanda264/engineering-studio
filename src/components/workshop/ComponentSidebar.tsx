import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { EntityType } from "@/simulation/types";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import type { EntityCatalogItem } from "@/lib/entityCatalog";
import { useWorkshopStore } from "@/store/workshopStore";

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

export function ComponentSidebar() {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <Panel.Header title="Components" />
      <ComponentsTab />
    </aside>
  );
}

function ComponentsTab() {
  const [query, setQuery] = useState("");
  const nodes = useWorkshopStore((s) => s.nodes);
  const addNode = useWorkshopStore((s) => s.addNode);

  const handleSelectComponent = (type: EntityType) => {
    addNode(type, nextClickPosition(nodes.length));
  };

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
            onSelectComponent={handleSelectComponent}
          />
        )}
        {modules.length > 0 && (
          <ComponentGroup
            label="Modules"
            items={modules}
            onSelectComponent={handleSelectComponent}
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
