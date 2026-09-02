import Link from "next/link";
import { Compass, Pause, Play, RefreshCw, X } from "lucide-react";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import type { EntityType } from "@/simulation/types";
import type { TourStep } from "@/components/tour/types";
import { useWorkshopStore } from "@/store/workshopStore";

/**
 * Fixed top-left of the canvas, on top of everything else `/tutorial`
 * renders — the one place a tutorial ever starts, switches, pauses, or
 * resumes from. Two modes:
 *
 * - No target picked: an entity picker (Core Flow featured, then every
 *   catalog entry). Non-modal on purpose — the canvas behind it stays
 *   fully interactive, since the whole point of picking a target here is
 *   deciding what to do with whatever's *already* on the canvas.
 * - A target is active: a compact status readout (target, current step
 *   title, pause/resume, switch) instead of the picker. Pausing (the
 *   TourOverlay's own × button) never clears `target` — it's a genuinely
 *   different action from "choose a different tutorial," which just
 *   returns to the picker.
 *
 * Both states also carry an "Exit tutorial" link back to `/workshop` —
 * `/tutorial` is otherwise a one-way door (WorkshopHeader's own nav has
 * no link back), and loading a scenario from the header's Workshop menu
 * doesn't navigate away either, so without this the guide overlay would
 * just sit on top of the scenario with no way to dismiss it for good.
 * Distinct from "choose a different tutorial": that one stays on
 * `/tutorial` and re-plans; this one leaves tutorial mode entirely. Since
 * `WorkshopShell` is the same component both routes render, the canvas
 * (zustand store, not route state) is untouched by the navigation.
 *
 * Offset past `ComponentSidebar`'s docked list *only while that list is
 * actually on screen* — it lists the same catalog the sidebar does, and a
 * click on each does something different (pick a tutorial target vs.
 * actually add a node), so stacking two lookalike lists in the same spot
 * is a coin flip which one you'd hit. ComponentSidebar is on-demand now
 * (closed by default), so that collision only exists when its panel is
 * genuinely open — otherwise this sits at the true left edge instead of
 * leaving a dead gap where a permanent dock used to be. `/tutorial` always
 * forces the plain list (`WorkshopShell`'s `forceComponentsList` — see its
 * own doc comment for why), so no theme check is needed here.
 */
export function TutorialPanel({
  activeTarget,
  currentStep,
  paused,
  onPick,
  onTogglePaused,
  onChooseAnother,
}: {
  activeTarget: EntityType | null;
  currentStep: TourStep | null;
  paused: boolean;
  onPick: (type: EntityType) => void;
  onTogglePaused: () => void;
  onChooseAnother: () => void;
}) {
  const openComponentPack = useWorkshopStore((s) => s.openComponentPack);
  const leftOffset = openComponentPack ? "left-[20rem]" : "left-3";

  if (activeTarget && currentStep) {
    const catalogItem = ENTITY_CATALOG.find((item) => item.type === activeTarget);
    return (
      <div className={`pointer-events-auto fixed ${leftOffset} top-20 z-40 flex w-72 flex-col gap-2 border border-border bg-bg-elevated p-3 shadow-dropdown`}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
            <Compass className="size-3.5 text-signal" aria-hidden />
            Tutorial · {catalogItem?.name ?? activeTarget}
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={onChooseAnother}
              aria-label="Choose a different tutorial"
              title="Choose a different tutorial"
              className="text-text-subtle transition-colors duration-fast ease-standard hover:text-text"
            >
              <RefreshCw className="size-3.5" aria-hidden />
            </button>
            <Link
              href="/workshop"
              aria-label="Exit tutorial — back to Workshop"
              title="Exit tutorial — back to Workshop"
              className="text-text-subtle transition-colors duration-fast ease-standard hover:text-text"
            >
              <X className="size-3.5" aria-hidden />
            </Link>
          </span>
        </div>
        <p className="truncate text-xs text-text-muted" title={currentStep.title}>
          {paused ? "Paused at: " : "Now: "}
          {currentStep.title}
        </p>
        <button
          type="button"
          onClick={onTogglePaused}
          className="inline-flex h-8 items-center justify-center gap-1.5 border border-border bg-bg-panel text-xs font-medium text-text transition-colors duration-fast ease-standard hover:border-border-hover hover:bg-bg-elevated"
        >
          {paused ? (
            <>
              <Play className="size-3.5" aria-hidden />
              Resume guide
            </>
          ) : (
            <>
              <Pause className="size-3.5" aria-hidden />
              Hide guide
            </>
          )}
        </button>
      </div>
    );
  }

  const core = ENTITY_CATALOG.filter((item) => !item.domain && item.phase === 1);
  const modules = ENTITY_CATALOG.filter((item) => !item.domain && item.phase === 2);
  const agentic = ENTITY_CATALOG.filter((item) => item.domain === "agentic");

  return (
    <div className={`pointer-events-auto fixed ${leftOffset} top-20 z-40 flex max-h-[calc(100vh-6rem)] w-72 flex-col border border-border bg-bg-elevated shadow-dropdown`}>
      <div className="flex items-center justify-between gap-1.5 border-b border-border px-3 py-2.5">
        <span className="flex items-center gap-1.5">
          <Compass className="size-4 text-signal" aria-hidden />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text">
            Start a tutorial
          </h2>
        </span>
        <Link
          href="/workshop"
          aria-label="Exit tutorial — back to Workshop"
          title="Exit tutorial — back to Workshop"
          className="text-text-subtle transition-colors duration-fast ease-standard hover:text-text"
        >
          <X className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto p-3">
        <button
          type="button"
          onClick={() => onPick("database")}
          className="flex flex-col gap-0.5 border border-signal bg-signal/10 px-3 py-2 text-left transition-colors duration-fast ease-standard hover:bg-signal/15"
        >
          <span className="text-sm font-medium text-text">Core Flow</span>
          <span className="text-[11px] text-text-muted">Client → API Server → Database</span>
        </button>

        <EntityGroup title="Core" items={core} onPick={onPick} />
        <EntityGroup title="Modules" items={modules} onPick={onPick} />
        <EntityGroup title="Agentic AI" items={agentic} onPick={onPick} />
      </div>
    </div>
  );
}

function EntityGroup({
  title,
  items,
  onPick,
}: {
  title: string;
  items: typeof ENTITY_CATALOG;
  onPick: (type: EntityType) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-0.5 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => onPick(item.type)}
            disabled={!item.implemented}
            className="group flex items-center gap-2.5 px-2 py-1.5 text-left transition-colors duration-fast ease-standard
              hover:bg-bg-panel disabled:cursor-not-allowed disabled:opacity-50"
          >
            <item.icon className="size-3.5 shrink-0 text-text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-xs text-text">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
