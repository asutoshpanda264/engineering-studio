"use client";

import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import type { BadgeProps } from "@/components/ui/Badge";
import { ENTITY_CONFIG_SCHEMA, formatConfigFieldValue } from "@/lib/entityConfigSchema";
import type { ConfigFieldSchema } from "@/lib/entityConfigSchema";
import type { FailureModeDemo, Remedy } from "@/lib/entityDeepDive";
import type { MetricsSnapshot } from "@/simulation/types";
import type { ScenarioEntity } from "@/scenarios/types";

/**
 * The "Compare" popup for a Try It remedy — pulled out of RemediesPanel's
 * 320px-wide, 11px-text inline box (see the screenshot that prompted this:
 * unreadable) into a real dialog with room to breathe. Two things this adds
 * beyond a bigger box: a "What changed" section spelling out the exact
 * config fields the remedy touched (before → after, in the same units a
 * student edited them in), and a proper table instead of truncated flex
 * rows for the per-component breakdown.
 */
export function CompareModal({
  open,
  onClose,
  remedy,
  demo,
  baseline,
  withRemedy,
  entities,
}: {
  open: boolean;
  onClose: () => void;
  remedy: Remedy;
  demo: FailureModeDemo;
  baseline: MetricsSnapshot;
  withRemedy: MetricsSnapshot;
  entities: ScenarioEntity[];
}) {
  const before = worstEntityHealth(baseline, entities);
  const after = worstEntityHealth(withRemedy, entities);
  const nonClientEntities = entities.filter((entity) => entity.type !== "client");
  const configChanges = remedy.kind === "config" ? describeConfigChanges(remedy, demo, entities) : [];

  const successBefore = baseline.successRate * 100;
  const successAfter = withRemedy.successRate * 100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Compare — ${remedy.label}`}
      action={<Badge variant="neutral">Same seed &amp; traffic</Badge>}
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            {remedy.kind === "architecture" ? "What to build" : "What changed"}
          </h3>
          {remedy.kind === "architecture" ? (
            <>
              <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed text-text-muted">
                {remedy.instructions.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
              <p className="text-xs leading-relaxed text-text-subtle">
                This compares the reference fix above, not whatever you&apos;ve
                built on canvas — build it yourself, then Run, to see your
                own result.
              </p>
            </>
          ) : configChanges.length > 0 ? (
            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
              {configChanges.map((change) => (
                <div
                  key={change.label}
                  className="flex items-center justify-between gap-3 bg-bg-panel px-3 py-2"
                >
                  <span className="text-sm text-text-muted">{change.label}</span>
                  <span className="flex items-center gap-2 text-sm tabular-nums">
                    <span className="text-text-subtle">{change.before}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-text-subtle" aria-hidden />
                    <span className="font-medium text-text">{change.after}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-subtle">No config fields changed.</p>
          )}
        </section>

        {(before || after) && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Worst-hit component
            </h3>
            <div className="flex items-center gap-3 rounded-md border border-border bg-bg-panel px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-text">
                {before?.label ?? after?.label}
              </span>
              <Badge variant={before ? ENTITY_HEALTH_BADGE[before.health] : "neutral"}>
                {before ? ENTITY_HEALTH_LABEL[before.health] : "Idle"}
              </Badge>
              <ArrowRight className="size-4 shrink-0 text-text-subtle" aria-hidden />
              <Badge variant={after ? ENTITY_HEALTH_BADGE[after.health] : "neutral"}>
                {after ? ENTITY_HEALTH_LABEL[after.health] : "Idle"}
              </Badge>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3">
          <StatCard
            label="Overall success rate"
            before={`${successBefore.toFixed(1)}%`}
            after={`${successAfter.toFixed(1)}%`}
            improved={successAfter >= successBefore}
          />
          <StatCard
            label="Avg latency"
            before={`${baseline.averageLatency.toFixed(1)} ms`}
            after={`${withRemedy.averageLatency.toFixed(1)} ms`}
            improved={withRemedy.averageLatency <= baseline.averageLatency}
          />
        </section>

        {nonClientEntities.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Per-component breakdown
            </h3>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-panel text-left text-xs uppercase tracking-wide text-text-subtle">
                    <th className="px-3 py-2 font-medium">Component</th>
                    <th className="px-3 py-2 font-medium">Before</th>
                    <th className="px-3 py-2 font-medium">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {nonClientEntities.map((entity) => {
                    const beforeMetrics = baseline.entityMetrics[entity.id];
                    const afterMetrics = withRemedy.entityMetrics[entity.id];
                    if (!beforeMetrics && !afterMetrics) return null;
                    return (
                      <tr key={entity.id}>
                        <td className="px-3 py-2 text-text">{entity.label}</td>
                        <td className="px-3 py-2 tabular-nums text-text-subtle">
                          {formatEntitySnapshot(beforeMetrics)}
                        </td>
                        <td className="px-3 py-2 tabular-nums font-medium text-text">
                          {formatEntitySnapshot(afterMetrics)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

function StatCard({
  label,
  before,
  after,
  improved,
}: {
  label: string;
  before: string;
  after: string;
  improved: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-bg-panel px-3 py-3">
      <span className="text-xs uppercase tracking-wide text-text-subtle">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-text-subtle">{before}</span>
        <ArrowRight className="size-3.5 shrink-0 text-text-subtle" aria-hidden />
        <span
          className={`text-lg font-semibold tabular-nums ${improved ? "text-status-healthy" : "text-status-critical"}`}
        >
          {after}
        </span>
      </div>
    </div>
  );
}

function formatEntitySnapshot(metrics: MetricsSnapshot["entityMetrics"][string] | undefined): string {
  if (!metrics) return "idle";
  const utilization = `${(metrics.utilization * 100).toFixed(0)}% util`;
  return metrics.errorCount > 0 ? `${utilization}, ${metrics.errorCount} err` : utilization;
}

type EntityHealth = "crashed" | "degraded" | "healthy";

const ENTITY_HEALTH_LABEL: Record<EntityHealth, string> = {
  crashed: "Crashed",
  degraded: "Degraded",
  healthy: "Healthy",
};

const ENTITY_HEALTH_BADGE: Record<EntityHealth, BadgeProps["variant"]> = {
  crashed: "error",
  degraded: "warning",
  healthy: "success",
};

/**
 * Finds whichever entity took the worst hit in a run (highest failure rate
 * among entities that saw any traffic at all). Same heuristic
 * RemediesPanel's own status row used before this moved into the modal —
 * see `src/lib/nodeStatus.ts`'s CRASH_FAILURE_RATE for why 0.9 is the
 * "crashed" line, matching the canvas's own status dot.
 */
function worstEntityHealth(
  metrics: MetricsSnapshot,
  entities: ScenarioEntity[]
): { label: string; health: EntityHealth } | null {
  let worst: { id: string; failureRate: number } | null = null;
  for (const [id, entityMetrics] of Object.entries(metrics.entityMetrics)) {
    const attempts = entityMetrics.requestCount + entityMetrics.errorCount;
    if (attempts === 0) continue;
    const failureRate = entityMetrics.errorCount / attempts;
    if (!worst || failureRate > worst.failureRate) worst = { id, failureRate };
  }
  if (!worst) return null;

  const label = entities.find((entity) => entity.id === worst!.id)?.label ?? worst.id;
  const health: EntityHealth =
    worst.failureRate >= 0.9 ? "crashed" : worst.failureRate > 0 ? "degraded" : "healthy";
  return { label, health };
}

interface ConfigChange {
  label: string;
  before: string;
  after: string;
}

/**
 * What a config remedy actually did, field by field: the demo's own
 * authored starting value (never whatever's live on canvas — same
 * "measure against the documented baseline" rule `compareRemedy` itself
 * follows) vs. the override the remedy applies. Resolved against the
 * touched entity's own config schema for a human label and units.
 * Load Balancer's `weights` / Reverse Proxy's `routes` have no
 * ENTITY_CONFIG_SCHEMA entry at all (they're keyed per graph edge, not a
 * fixed field — see entityConfigSchema.ts's own header comment), so those
 * fall back to a humanized key and an id-keyed dump with ids resolved
 * against `entities` where possible.
 */
function describeConfigChanges(
  remedy: Extract<Remedy, { kind: "config" }>,
  demo: FailureModeDemo,
  entities: ScenarioEntity[]
): ConfigChange[] {
  const baselineEntity = demo.startingEntities.find((entity) => entity.id === remedy.nodeId);
  if (!baselineEntity) return [];
  const schema = ENTITY_CONFIG_SCHEMA[baselineEntity.type] ?? [];

  return Object.entries(remedy.configOverride).map(([key, afterValue]) => {
    const field = schema.find((f) => f.key === key);
    return {
      label: field?.label ?? humanizeKey(key),
      before: describeConfigValue(field, baselineEntity.config[key], entities),
      after: describeConfigValue(field, afterValue, entities),
    };
  });
}

function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function describeConfigValue(
  field: ConfigFieldSchema | undefined,
  value: unknown,
  entities: ScenarioEntity[]
): string {
  if (field) return formatConfigFieldValue(field, value);
  if (value === undefined) return "default";
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .map(([id, v]) => `${entities.find((entity) => entity.id === id)?.label ?? id} = ${v}`)
      .join(", ");
  }
  return String(value);
}
