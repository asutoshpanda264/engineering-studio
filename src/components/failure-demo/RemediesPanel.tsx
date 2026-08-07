"use client";

import { AlertTriangle, ArrowRight, BarChart3, Check } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useFailureDemoStore } from "@/store/failureDemoStore";
import type { FailureModeDemo, Remedy } from "@/lib/entityDeepDive";
import type { MetricsSnapshot } from "@/simulation/types";

/**
 * Replaces ComponentSidebar's slot on this page — instead of a palette of
 * draggable components (there's nothing to drag in for a config-only fix
 * like Cache Stampede), this lists the remedies a student can try.
 *
 * Manual-apply is the default interaction: picking a remedy changes the
 * live canvas config, same as editing a field in the real Inspector would
 * — the student still has to hit Run themselves to see the effect. Each
 * remedy also offers an optional "Compare" action for a fast, automatic
 * before/after without a second manual run.
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
      className={`flex flex-col gap-1.5 rounded-md border p-3 text-left transition-colors duration-fast ease-standard
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated
        ${
          active
            ? "cursor-default border-error/40 bg-error/10"
            : "cursor-pointer border-transparent hover:border-border-hover hover:bg-bg-panel"
        }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-text">
          <AlertTriangle className="size-3.5 shrink-0 text-error" aria-hidden />
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

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border p-3 transition-colors duration-fast ease-standard
        ${active ? "border-success/40 bg-success/10" : "border-border bg-bg-panel"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text">{remedy.label}</span>
        {active && <Badge variant="success">Applied</Badge>}
      </div>
      <p className="text-xs leading-relaxed text-text-muted">{remedy.description}</p>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant={active ? "secondary" : "primary"}
          size="sm"
          icon={active ? <Check className="size-3.5" aria-hidden /> : undefined}
          disabled={active}
          onClick={onApply}
          className="flex-1"
        >
          {active ? "Applied — run to see it" : "Apply"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<BarChart3 className="size-3.5" aria-hidden />}
          loading={isComparing}
          onClick={() => compareRemedy(remedy.id)}
          aria-label={`Compare ${remedy.label} against the broken baseline`}
        >
          Compare
        </Button>
      </div>

      {comparison && (
        <div className="mt-1 rounded-md border border-border bg-bg-elevated p-2.5">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
            Same seed, broken vs. this remedy — run fresh just now, not cached
          </p>
          <StatusComparisonRow baseline={comparison.baseline} withRemedy={comparison.withRemedy} demo={demo} />
          <ComparisonRow
            label="Overall success rate"
            before={`${(comparison.baseline.successRate * 100).toFixed(1)}%`}
            after={`${(comparison.withRemedy.successRate * 100).toFixed(1)}%`}
          />
          <ComparisonRow
            label="Avg latency"
            before={`${comparison.baseline.averageLatency.toFixed(1)} ms`}
            after={`${comparison.withRemedy.averageLatency.toFixed(1)} ms`}
          />
        </div>
      )}
    </div>
  );
}

type EntityHealth = "crashed" | "degraded" | "healthy";

const ENTITY_HEALTH_LABEL: Record<EntityHealth, string> = {
  crashed: "Crashed",
  degraded: "Degraded",
  healthy: "Healthy",
};

const ENTITY_HEALTH_CLASS: Record<EntityHealth, string> = {
  crashed: "text-error",
  degraded: "text-warning",
  healthy: "text-success",
};

/**
 * Finds whichever entity took the worst hit in a run (highest failure
 * rate among entities that saw any traffic at all) and labels it — the
 * concrete "what actually broke" evidence a plain latency/success-rate
 * number doesn't spell out on its own. Same crash threshold
 * (`src/lib/nodeStatus.ts`'s CRASH_FAILURE_RATE) the node's own status
 * dot uses, so this reads consistently with the canvas.
 */
function worstEntityHealth(
  metrics: MetricsSnapshot,
  demo: FailureModeDemo
): { label: string; health: EntityHealth } | null {
  let worst: { id: string; failureRate: number } | null = null;
  for (const [id, entityMetrics] of Object.entries(metrics.entityMetrics)) {
    const attempts = entityMetrics.requestCount + entityMetrics.errorCount;
    if (attempts === 0) continue;
    const failureRate = entityMetrics.errorCount / attempts;
    if (!worst || failureRate > worst.failureRate) worst = { id, failureRate };
  }
  if (!worst) return null;

  const label = demo.startingEntities.find((e) => e.id === worst!.id)?.label ?? worst.id;
  const health: EntityHealth =
    worst.failureRate >= 0.9 ? "crashed" : worst.failureRate > 0 ? "degraded" : "healthy";
  return { label, health };
}

function StatusComparisonRow({
  baseline,
  withRemedy,
  demo,
}: {
  baseline: MetricsSnapshot;
  withRemedy: MetricsSnapshot;
  demo: FailureModeDemo;
}) {
  const before = worstEntityHealth(baseline, demo);
  const after = worstEntityHealth(withRemedy, demo);
  if (!before && !after) return null;

  // Labels the row after whichever entity was worst in the baseline run —
  // reasonable as long as the same entity stays the worst-hit one in both
  // runs, which holds for this demo (the Database, in both modes). A
  // future demo where a remedy shifts strain onto a *different* entity
  // would need this row to show both labels, not just one.

  return (
    <div className="mb-1.5 flex items-center justify-between text-[11px] text-text-muted">
      <span>{before?.label ?? after?.label}</span>
      <span className="flex items-center gap-1.5 font-medium tabular-nums">
        <span className={before ? ENTITY_HEALTH_CLASS[before.health] : "text-text-subtle"}>
          {before ? ENTITY_HEALTH_LABEL[before.health] : "Idle"}
        </span>
        <ArrowRight className="size-3 shrink-0 text-text-subtle" aria-hidden />
        <span className={after ? ENTITY_HEALTH_CLASS[after.health] : "text-text-subtle"}>
          {after ? ENTITY_HEALTH_LABEL[after.health] : "Idle"}
        </span>
      </span>
    </div>
  );
}

function ComparisonRow({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px] text-text-muted">
      <span>{label}</span>
      <span className="flex items-center gap-1.5 tabular-nums">
        <span className="text-text-subtle">{before}</span>
        <ArrowRight className="size-3 shrink-0 text-text-subtle" aria-hidden />
        <span className="font-medium text-text">{after}</span>
      </span>
    </div>
  );
}
