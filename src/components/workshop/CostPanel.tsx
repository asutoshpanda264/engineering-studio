"use client";

import { useState } from "react";
import { DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWorkshopStore } from "@/store/workshopStore";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { estimateCost } from "@/lib/costEngine";
import type { EntityCostEstimate, CostSeverity } from "@/lib/costEngine";

const SEVERITY_CLASSES: Record<CostSeverity, string> = {
  normal: "border-success/40 text-success",
  elevated: "border-warning/40 text-warning",
  high: "border-error/40 text-error",
};

const SEVERITY_LABELS: Record<CostSeverity, string> = {
  normal: "Normal",
  elevated: "Elevated",
  high: "Over budget",
};

function formatMonthly(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`;
}

/**
 * Button + popover breaking down every priced entity's estimated
 * infrastructure cost side by side — the "compare everything at once"
 * counterpart to the Inspector's per-entity "Estimated Cost" section
 * (which only shows whatever's currently selected). Lives on the canvas
 * next to SuggestionsPanel rather than the Inspector so it works
 * regardless of what's selected — same reasoning, see that file.
 *
 * Reads simulationResult (the final tally), not playbackMetrics — a
 * monthly cost projection shouldn't jitter as the user scrubs playback,
 * same reasoning InspectorPanel.tsx's ScenarioBriefing already documents.
 * That result is allowed to be null, deliberately: estimateCost's base
 * (provisioned) cost only ever reads each node's own config, so it's
 * real and worth showing the moment components exist on the canvas — a
 * real cloud bill starts accruing before the first request too. Only the
 * usage-cost line needs a completed run.
 */
export function CostPanel() {
  const [open, setOpen] = useState(false);
  const result = useWorkshopStore((s) => s.simulationResult);
  const nodes = useWorkshopStore((s) => s.nodes);

  const cost = estimateCost(result, nodes);
  if (cost.entities.length === 0) return null;

  const hasUsageData = result !== null;

  return (
    <div className="flex flex-col items-end gap-2">
      {open && (
        <div className="max-h-96 w-80 overflow-auto rounded-lg border border-border bg-bg-elevated shadow-dropdown">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div>
              <p className="text-xs font-medium text-text">Estimated Cost</p>
              <p className="text-[11px] text-text-subtle">
                {formatMonthly(cost.totalMonthlyCost)}
                {hasUsageData ? " total, illustrative" : "+ base only — run a simulation for usage"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close cost breakdown"
              className="text-text-subtle transition-colors hover:text-text"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {cost.entities.map((entity) => (
              <EntityCostCard key={entity.entityId} entity={entity} />
            ))}
          </div>
          <p className="border-t border-border px-3 py-2 text-[10px] leading-relaxed text-text-subtle">
            {hasUsageData
              ? "Estimates use typical public cloud on-demand pricing — directional, not a quote."
              : "Base (provisioned) cost from each component's own config, priced against typical public cloud on-demand rates. Run a simulation to add usage-based cost from actual traffic."}
          </p>
        </div>
      )}
      <Button
        variant={cost.severity === "high" ? "primary" : "secondary"}
        size="sm"
        icon={<DollarSign className="size-4" aria-hidden />}
        onClick={() => setOpen((v) => !v)}
      >
        {formatMonthly(cost.totalMonthlyCost)}
        {!hasUsageData && "+"}
      </Button>
    </div>
  );
}

function EntityCostCard({ entity }: { entity: EntityCostEstimate }) {
  const nodes = useWorkshopStore((s) => s.nodes);
  const label = nodes.find((n) => n.id === entity.entityId)?.data.label ?? entity.entityId;
  const name = getEntityCatalogItem(entity.entityType).name;

  return (
    <div
      className={`rounded-md border-l-2 bg-bg-panel py-1.5 pl-2.5 pr-2 ${SEVERITY_CLASSES[entity.severity]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-text">{label}</p>
          <p className="text-[11px] text-text-muted">{name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium tabular-nums text-text">
            {formatMonthly(entity.monthlyTotalCost)}
            {!entity.hasUsageData && "+"}
          </p>
          <p className={`text-[10px] ${SEVERITY_CLASSES[entity.severity].split(" ")[1]}`}>
            {SEVERITY_LABELS[entity.severity]}
          </p>
        </div>
      </div>
    </div>
  );
}
