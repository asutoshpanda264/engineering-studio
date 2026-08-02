import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { EntityType } from "@/simulation/types";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import type { EntityCatalogItem } from "@/lib/entityCatalog";
import { useWorkshopStore } from "@/store/workshopStore";
import { SCENARIOS } from "@/scenarios";
import type { Scenario } from "@/scenarios";

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

type SidebarTab = "components" | "scenarios";

export function ComponentSidebar() {
  const [tab, setTab] = useState<SidebarTab>("components");

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <Panel.Header title={tab === "components" ? "Components" : "Scenarios"} />
      <div className="flex gap-1 border-b border-border p-2" role="tablist" aria-label="Sidebar">
        <TabButton active={tab === "components"} onClick={() => setTab("components")}>
          Components
        </TabButton>
        <TabButton active={tab === "scenarios"} onClick={() => setTab("scenarios")}>
          Scenarios
        </TabButton>
      </div>
      {tab === "components" ? <ComponentsTab /> : <ScenariosTab />}
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated ${
        active
          ? "bg-primary/15 text-primary"
          : "text-text-subtle hover:bg-bg-panel hover:text-text"
      }`}
    >
      {children}
    </button>
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

function ScenariosTab() {
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const loadScenario = useWorkshopStore((s) => s.loadScenario);

  return (
    <Panel.Body className="flex flex-col gap-2">
      <p className="px-1 text-xs text-text-subtle">
        Pick a problem to solve. Loading a scenario replaces the current
        architecture with its starting point.
      </p>
      {SCENARIOS.map((scenario) => (
        <ScenarioCard
          key={scenario.id}
          scenario={scenario}
          active={scenario.id === activeScenarioId}
          onSelect={() => loadScenario(scenario.id)}
        />
      ))}
    </Panel.Body>
  );
}

function ScenarioCard({
  scenario,
  active,
  onSelect,
}: {
  scenario: Scenario;
  active: boolean;
  onSelect: () => void;
}) {
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
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`flex flex-col gap-1.5 rounded-md border p-2.5 text-left transition-colors duration-fast ease-standard
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated
        ${
          active
            ? "cursor-default border-primary/40 bg-primary/10"
            : "cursor-pointer border-transparent hover:border-border-hover hover:bg-bg-panel"
        }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-text">{scenario.title}</p>
        {active && <Badge variant="primary">Active</Badge>}
      </div>
      <p className="text-[11px] text-text-subtle">
        {"★".repeat(scenario.difficulty)}
        {"☆".repeat(5 - scenario.difficulty)}
      </p>
      <p className="line-clamp-2 text-xs text-text-subtle">{scenario.story}</p>
    </div>
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
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      draggable={!disabled}
      onDragStart={handleDragStart}
      onClick={activate}
      onKeyDown={handleKeyDown}
      className={`group flex items-start gap-2.5 rounded-md border border-transparent p-2 text-left
        transition-colors duration-fast ease-standard
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated
        ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-grab hover:border-border-hover hover:bg-bg-panel active:cursor-grabbing"
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
