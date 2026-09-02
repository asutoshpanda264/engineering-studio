"use client";

import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { AlertTriangle, BarChart3, Check, Wrench } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useFailureDemoStore } from "@/store/failureDemoStore";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { ENTITY_DRAG_MIME_TYPE } from "@/components/workshop/ComponentSidebar";
import { CompareModal } from "@/components/failure-demo/CompareModal";
import type { FailureModeDemo, Remedy } from "@/lib/entityDeepDive";
import type { EntityType } from "@/simulation/types";
import type { ScenarioEntity } from "@/scenarios/types";

/**
 * Replaces ComponentSidebar's slot on this page — instead of a palette of
 * every component (there's nothing to drag in for a config-only fix like
 * Cache Stampede), this lists the remedies a student can try. An
 * architecture remedy's own scoped palette (see ArchitectureRemedyPalette
 * below) only appears inline on its own card, once that remedy is active.
 *
 * Manual-apply is the default interaction: picking a config remedy changes
 * the live canvas config, same as editing a field in the real Inspector
 * would; picking an architecture remedy instead resets the canvas to the
 * baseline and reveals instructions + a scoped palette so the student
 * builds the fix themselves — see failureDemoStore.ts's `applyRemedy`.
 * Either way, the student still has to hit Run to see the effect. Each
 * remedy also offers an optional "Compare" action for a fast before/after
 * without a second manual run — see RemedyCard's own comment for what it
 * measures for each remedy kind.
 */
export function RemediesPanel() {
  const demo = useFailureDemoStore((s) => s.demo);
  const activeRemedyId = useFailureDemoStore((s) => s.activeRemedyId);
  const applyRemedy = useFailureDemoStore((s) => s.applyRemedy);
  const resetToBaseline = useFailureDemoStore((s) => s.resetToBaseline);

  if (!demo) return null;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-bg-elevated">
      <Panel.Header title="Remedies" />
      <Panel.Body className="flex flex-col gap-3">
        <p className="px-1 text-xs text-text-subtle">
          This architecture starts broken, on purpose. Try a remedy below,
          then run the simulation to see whether — and how — it helps.
        </p>

        <BaselineCard active={activeRemedyId === null} onSelect={resetToBaseline} />

        <h3 className="px-1 pt-1 text-xs font-medium uppercase tracking-wide text-text-subtle">
          Solutions
        </h3>

        {demo.remedies.map((remedy) => (
          <RemedyCard
            key={remedy.id}
            remedy={remedy}
            demo={demo}
            active={activeRemedyId === remedy.id}
            onApply={() => applyRemedy(remedy.id)}
          />
        ))}
      </Panel.Body>
    </aside>
  );
}

function BaselineCard({ active, onSelect }: { active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-1.5 border p-3 text-left transition-colors duration-fast ease-standard
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated
        ${
          active
            ? "cursor-default border-status-critical/40 bg-status-critical/10"
            : "cursor-pointer border-transparent hover:border-border-hover hover:bg-bg-panel"
        }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-text">
          <AlertTriangle className="size-3.5 shrink-0 text-status-critical" aria-hidden />
          Broken (starting state)
        </span>
        {active && <Badge variant="error">Active</Badge>}
      </div>
      <p className="text-xs leading-relaxed text-text-subtle">
        No remedy applied — this is the architecture exactly as described in
        the reproduce steps. Run it first to see the failure for yourself.
      </p>
    </button>
  );
}

/**
 * The union of entities a comparison might need to label: a config
 * remedy never introduces a new node, so `demo.startingEntities` alone is
 * enough; an architecture remedy's reference fix can (the whole point —
 * a 2nd API Server, a Load Balancer), so its `referenceEntities` are
 * merged in too, deduped by id. Passed to CompareModal so a brand-new
 * node's label still resolves instead of falling back to its bare id.
 */
function knownEntitiesFor(demo: FailureModeDemo, remedy: Remedy): ScenarioEntity[] {
  if (remedy.kind !== "architecture") return demo.startingEntities;
  const byId = new Map(demo.startingEntities.map((e) => [e.id, e]));
  for (const entity of remedy.referenceEntities) byId.set(entity.id, entity);
  return [...byId.values()];
}

function RemedyCard({
  remedy,
  demo,
  active,
  onApply,
}: {
  remedy: Remedy;
  demo: FailureModeDemo;
  active: boolean;
  onApply: () => void;
}) {
  const compareRemedy = useFailureDemoStore((s) => s.compareRemedy);
  const isComparing = useFailureDemoStore((s) => s.isComparing);
  const comparison = useFailureDemoStore((s) =>
    s.remedyComparison?.remedyId === remedy.id ? s.remedyComparison : null
  );
  // Compare requires a real Run first — see failureDemoStore.compareRemedy's
  // own comment for why (it reuses that run's result for whichever side it
  // already represents, instead of always computing two hidden simulations).
  const hasRun = useFailureDemoStore((s) => s.simulationResult !== null);

  const isArchitecture = remedy.kind === "architecture";
  const knownEntities = knownEntitiesFor(demo, remedy);

  // The Compare popup (see CompareModal) — opened by this card's own
  // Compare button, closed independently of the comparison data itself so
  // a stale comparison from a previous click doesn't flash before the
  // fresh one lands. Closes itself if a later run/remedy switch clears the
  // comparison out from under it (e.g. Reset was clicked while this was
  // open) — adjusted during render rather than in a useEffect, React's own
  // documented pattern for deriving state off a changing value without an
  // extra render pass.
  const [compareOpen, setCompareOpen] = useState(false);
  const [prevComparison, setPrevComparison] = useState(comparison);
  if (comparison !== prevComparison) {
    setPrevComparison(comparison);
    if (!comparison) setCompareOpen(false);
  }

  return (
    <div
      className={`flex flex-col gap-2 border p-3 transition-colors duration-fast ease-standard
        ${active ? "border-status-healthy/40 bg-status-healthy/10" : "border-border bg-bg-panel"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text">{remedy.label}</span>
        {active && <Badge variant="success">{isArchitecture ? "In progress" : "Applied"}</Badge>}
      </div>
      <p className="text-xs leading-relaxed text-text-muted">{remedy.description}</p>

      {isArchitecture && active && (
        <div className="flex flex-col gap-2 bg-bg-elevated p-2.5">
          <ol className="flex list-decimal flex-col gap-1 pl-4 text-[11px] leading-relaxed text-text-muted">
            {remedy.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          <ArchitectureRemedyPalette allowedComponentTypes={remedy.allowedComponentTypes} />
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant={active ? "secondary" : "primary"}
          size="sm"
          icon={
            active ? (
              isArchitecture ? (
                <Wrench className="size-3.5" aria-hidden />
              ) : (
                <Check className="size-3.5" aria-hidden />
              )
            ) : undefined
          }
          disabled={active}
          onClick={onApply}
          className="flex-1"
        >
          {active
            ? isArchitecture
              ? "In progress — build it above"
              : "Applied — run to see it"
            : isArchitecture
              ? "Build it"
              : "Apply"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<BarChart3 className="size-3.5" aria-hidden />}
          loading={isComparing}
          disabled={!hasRun}
          onClick={() => {
            compareRemedy(remedy.id);
            setCompareOpen(true);
          }}
          aria-label={
            hasRun
              ? `Compare ${remedy.label} against the broken baseline`
              : "Run the simulation once to enable Compare"
          }
        >
          Compare
        </Button>
      </div>

      {!hasRun && (
        <p className="text-[11px] text-text-subtle">Run the simulation once to enable Compare.</p>
      )}

      {isArchitecture && (
        <p className="text-[10px] leading-relaxed text-text-subtle">
          Compare always measures a correctly-wired reference fix, not
          whatever you&apos;ve built above — build it yourself, then Run, to
          see your own result.
        </p>
      )}

      {comparison && (
        <CompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          remedy={remedy}
          demo={demo}
          baseline={comparison.baseline}
          withRemedy={comparison.withRemedy}
          entities={knownEntities}
        />
      )}
    </div>
  );
}

/**
 * A small, scoped drag-and-drop palette — only the component type(s) an
 * architecture remedy names in `allowedComponentTypes`, not the full
 * Component Library. Reuses the same drag payload ComponentSidebar's
 * ComponentCard sets (`ENTITY_DRAG_MIME_TYPE`), read by
 * FailureDemoCanvas's onDrop; click-to-add works too, same as the real
 * Workshop's sidebar. Every allowed type here is always implemented, so
 * unlike ComponentCard there's no disabled/"Soon" state to handle.
 */
function ArchitectureRemedyPalette({
  allowedComponentTypes,
}: {
  allowedComponentTypes: EntityType[];
}) {
  const nodeCount = useFailureDemoStore((s) => s.nodes.length);
  const addNode = useFailureDemoStore((s) => s.addNode);

  return (
    <div className="flex flex-col gap-1 border border-dashed border-border-hover p-2">
      <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-text-subtle">
        Drag onto the canvas
      </p>
      <div className="flex flex-col gap-1">
        {allowedComponentTypes.map((type, index) => (
          <PaletteCard
            key={type}
            type={type}
            onSelect={() =>
              addNode(type, {
                x: 520 + ((nodeCount + index) % 3) * 60,
                y: 80 + ((nodeCount + index) % 4) * 90,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function PaletteCard({ type, onSelect }: { type: EntityType; onSelect: () => void }) {
  const item = getEntityCatalogItem(type);
  const Icon = item.icon;

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(ENTITY_DRAG_MIME_TYPE, item.type);
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
      className="group flex cursor-grab items-center gap-2 border border-transparent p-1.5 text-left
        transition-colors duration-fast ease-standard active:cursor-grabbing
        hover:border-border-hover hover:bg-bg-panel
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
    >
      <Icon className="size-4 shrink-0 text-text-muted" aria-hidden />
      <span className="text-xs font-medium text-text">{item.name}</span>
    </div>
  );
}

// Comparison rendering (worst-entity status, per-component breakdown,
// overall stats) lives in CompareModal.tsx now — see its own header
// comment for why this moved out of an inline sidebar box.
