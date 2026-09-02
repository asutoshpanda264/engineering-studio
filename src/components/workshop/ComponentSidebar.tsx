import { useState } from "react";
import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { Brain, LayoutGrid, Swords, X } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { EntityType } from "@/simulation/types";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import type { ComponentPackId, EntityCatalogItem } from "@/lib/entityCatalog";
import { useWorkshopStore } from "@/store/workshopStore";
import { useTheme } from "@/components/theme/ThemeProvider";
import { WeaponWheel } from "@/components/workshop/WeaponWheel";
import { VillainAttackPicker } from "@/components/workshop/night-ops/VillainAttackPicker";
import { DetectiveVisionHUD } from "@/components/workshop/night-ops/DetectiveVisionHUD";

export const ENTITY_DRAG_MIME_TYPE = "application/x-engineering-studio-entity";

/**
 * Staggers click-added nodes in a grid so they don't overlap.
 * Step sizes are larger than the 176px node card so cards never touch.
 *
 * The starting `x` clears the open palette panel (`w-72` anchored at
 * `left-3`, so its right edge sits ~300px into the canvas — see the
 * `<aside>` below) plus a margin. Without this, the very first click-added
 * node lands directly underneath the panel that's still open above it —
 * added, but fully hidden until the panel closes or the canvas is panned.
 */
function nextClickPosition(nodeCount: number) {
  const paletteClearanceX = 340;
  const columns = 4;
  const columnStep = 240;
  const rowStep = 120;
  return {
    x: paletteClearanceX + (nodeCount % columns) * columnStep,
    y: 120 + Math.floor(nodeCount / columns) * rowStep,
  };
}

/**
 * The palette is on-demand, not a permanent dock (feedback: the fixed
 * left+right slabs made the workshop feel cluttered) — this renders only
 * small trigger buttons floating over the canvas's top-left corner; the
 * actual picker mounts on top of the canvas when opened instead of pushing
 * it, so the default view is canvas-first. What the triggers open depends
 * on theme: `night-ops` ("Batman Mode") gets the WeaponWheel — two
 * independent radial dials, one per pack, matching that theme's HUD
 * styling — light/dark get two independent trigger buttons, each opening
 * its own docked panel. Both variants split the catalog the same way:
 * distributed-systems components (`DistributedSystemsPanel` / the wheel's
 * "Distributed Systems" dial) vs. agentic-AI primitives (`AIFlowPanel` /
 * its "AI Flow" dial) — two separate sandboxes.
 *
 * The two light/dark panels are mutually exclusive
 * (`workshopStore.openComponentPack`, same "opening one closes the other"
 * shape as `tracePanelOpen`/`reliabilityPanelOpen`) rather than both able
 * to be open and stacked at once — that stacking was the earlier design
 * (feedback: with both packs' full item lists open together, the panel
 * could run tall enough to push past the bottom of the screen). Splitting
 * them into two separately-triggered panels also gives the guided tour a
 * clean way to point at just the pack a given step's target actually lives
 * in, instead of needing one long combined list open at all times.
 *
 * `nodes`/`addNode` live here (not inside the panels/wheel) since every
 * selection path funnels through the same `handleSelectComponent`.
 *
 * `forceListMode`: set by `/tutorial` (via `WorkshopShell`'s
 * `forceComponentsList`) to keep the plain panels even in night-ops — the
 * guided tour's steps spotlight specific catalog cards by DOM id, which
 * WeaponWheel's wedges don't carry. `/workshop` never sets it, so Batman
 * Mode still gets the wheel there.
 *
 * In night-ops, the "Choose Weapon" trigger anchors a small vertical stack
 * of the theme's other toolbelt controls — VillainAttackPicker and
 * DetectiveVisionHUD — so all three live in one top-left cluster instead
 * of being scattered across the header and canvas corners. Both render
 * `null` outside night-ops, so stacking them here is safe even though this
 * component itself isn't night-ops-exclusive.
 */
export function ComponentSidebar({ forceListMode = false }: { forceListMode?: boolean }) {
  const { theme } = useTheme();
  const isBatman = theme === "night-ops" && !forceListMode;
  // Store-backed, not local state — the guided tour (TutorialRunner) needs
  // to force the right pack open for steps that point at the real catalog
  // list (see tutorialPlanner.ts's `requiresComponentsPanel`).
  const openPack = useWorkshopStore((s) => s.openComponentPack);
  const setOpenPack = useWorkshopStore((s) => s.setOpenComponentPack);
  const [wheelOpen, setWheelOpen] = useState(false);
  const nodes = useWorkshopStore((s) => s.nodes);
  const addNode = useWorkshopStore((s) => s.addNode);

  const handleSelectComponent = (type: EntityType) => {
    addNode(type, nextClickPosition(nodes.length));
  };

  // Clicking the already-open pack's trigger closes it; clicking the
  // other one switches straight to it (never both open at once).
  const togglePack = (pack: ComponentPackId) => setOpenPack(openPack === pack ? null : pack);

  return (
    <>
      <div className="absolute left-3 top-3 z-30 flex flex-col items-start gap-3">
        {isBatman ? (
          <>
            <button
              type="button"
              onClick={() => setWheelOpen(true)}
              className="inline-flex h-9 items-center gap-2 border border-signal/40 bg-bg-elevated px-3 text-xs font-medium uppercase tracking-wide text-text shadow-elevated transition-colors duration-fast ease-standard hover:border-signal hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Swords className="size-4 text-signal" aria-hidden />
              Choose Weapon
            </button>
            <VillainAttackPicker />
            <DetectiveVisionHUD />
          </>
        ) : (
          <div className="flex items-center gap-2">
            <PackTriggerButton
              icon={LayoutGrid}
              label="Distributed Systems"
              active={openPack === "distributed"}
              onClick={() => togglePack("distributed")}
            />
            <PackTriggerButton
              icon={Brain}
              label="AI Flow"
              active={openPack === "ai-flow"}
              onClick={() => togglePack("ai-flow")}
            />
          </div>
        )}
      </div>

      {!isBatman && openPack === "distributed" && (
        <DistributedSystemsPanel
          onClose={() => setOpenPack(null)}
          onSelectComponent={handleSelectComponent}
        />
      )}
      {!isBatman && openPack === "ai-flow" && (
        <AIFlowPanel onClose={() => setOpenPack(null)} onSelectComponent={handleSelectComponent} />
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

function PackTriggerButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof LayoutGrid;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`inline-flex h-9 items-center gap-2 border px-3 text-xs font-medium shadow-elevated transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
        active
          ? "border-signal/40 bg-bg-elevated text-signal"
          : "border-border bg-bg-elevated text-text-muted hover:border-border-hover hover:text-text"
      }`}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
}

/**
 * Shared panel chrome for both packs below — a bordered/docked box with a
 * header (title + close), a search box, and whatever's passed as children.
 * Only one of `DistributedSystemsPanel`/`AIFlowPanel` is ever mounted at a
 * time (see `ComponentSidebar`'s `openPack`), so this doesn't nest inside
 * any other box — it *is* the outer box.
 */
function PackPanel({
  title,
  query,
  onQueryChange,
  onClose,
  children,
}: {
  title: string;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside className="absolute left-3 top-14 z-30 flex max-h-[calc(100%-4rem)] w-72 flex-col overflow-hidden border border-border bg-bg-elevated shadow-elevated">
      <Panel.Header
        title={title}
        accent
        action={
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title} panel`}
            className="text-text-subtle transition-colors duration-fast ease-standard hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        }
      />
      <div className="border-b border-border p-3">
        <Input
          type="text"
          placeholder="Search components…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label={`Search ${title}`}
        />
      </div>
      <Panel.Body className="flex flex-col gap-4">{children}</Panel.Body>
    </aside>
  );
}

function filterByQuery(items: EntityCatalogItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  return normalized ? items.filter((item) => item.name.toLowerCase().includes(normalized)) : items;
}

/**
 * One of the Workshop's two Component Library panels — the original
 * distributed-systems catalog (load balancer, cache, queue, database, ...).
 */
function DistributedSystemsPanel({
  onClose,
  onSelectComponent,
}: {
  onClose: () => void;
  onSelectComponent: (type: EntityType) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = filterByQuery(
    ENTITY_CATALOG.filter((item) => !item.domain),
    query
  );
  const core = filtered.filter((item) => item.phase === 1);
  const modules = filtered.filter((item) => item.phase === 2);

  return (
    <PackPanel title="Distributed Systems" query={query} onQueryChange={setQuery} onClose={onClose}>
      {core.length > 0 && (
        <ComponentGroup label="Core" items={core} onSelectComponent={onSelectComponent} />
      )}
      {modules.length > 0 && (
        <ComponentGroup label="Modules" items={modules} onSelectComponent={onSelectComponent} />
      )}
      {filtered.length === 0 && (
        <p className="px-1 text-xs text-text-subtle">No components match &ldquo;{query}&rdquo;.</p>
      )}
    </PackPanel>
  );
}

/**
 * The Workshop's other Component Library panel — `docs/Agentic_AI.md`'s
 * agent-pattern primitives (LLM Call, Tool Call, Retriever, ...).
 */
function AIFlowPanel({
  onClose,
  onSelectComponent,
}: {
  onClose: () => void;
  onSelectComponent: (type: EntityType) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = filterByQuery(
    ENTITY_CATALOG.filter((item) => item.domain === "agentic"),
    query
  );

  return (
    <PackPanel title="AI Flow" query={query} onQueryChange={setQuery} onClose={onClose}>
      {filtered.length > 0 ? (
        <ComponentGroup items={filtered} onSelectComponent={onSelectComponent} />
      ) : (
        <p className="px-1 text-xs text-text-subtle">No components match &ldquo;{query}&rdquo;.</p>
      )}
    </PackPanel>
  );
}

function ComponentGroup({
  label,
  items,
  onSelectComponent,
}: {
  label?: string;
  items: EntityCatalogItem[];
  onSelectComponent?: (type: EntityType) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <p className="px-1 text-xs font-medium uppercase tracking-wide text-text-subtle">
          {label}
        </p>
      )}
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
      className={`group flex items-start gap-2.5 border border-transparent p-2 text-left
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
