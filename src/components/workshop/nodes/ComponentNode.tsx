import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Lock } from "lucide-react";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { ENTITY_CONFIG_SCHEMA } from "@/lib/entityConfigSchema";
import { estimateCost } from "@/lib/costEngine";
import { findBottleneckNodeId } from "@/lib/bottleneckDetection";
import { useWorkshopStore } from "@/store/workshopStore";
import type { ArchitectureNode, NodeStatus } from "@/store/workshopStore";
import { getScenario } from "@/scenarios";
import { isGivenNode } from "@/lib/scenarioLocking";
import { CornerBrackets } from "@/components/workshop/CornerBrackets";
import { Badge } from "@/components/ui/Badge";
import type { EntityType } from "@/simulation/types";

const STATUS_DOT_CLASSES: Record<NodeStatus, string> = {
  idle: "bg-text-subtle",
  running: "bg-status-healthy",
  overloaded: "bg-status-degraded",
  unavailable: "bg-status-critical",
  error: "bg-status-critical",
  disabled: "bg-text-subtle",
};

/**
 * Same status→color mapping as the dot, for the top status strip and the
 * utilization bar — one source of truth so a node's edge accent and its
 * dot never disagree.
 */
const STATUS_BAR_CLASSES: Record<NodeStatus, string> = STATUS_DOT_CLASSES;

/**
 * "Crashed" and "Errors" both render red — the pulse is what separates
 * "almost everything is failing here" from "some requests are failing
 * here" at a glance, per the legend (StatusLegend.tsx).
 */
const PULSING_STATUSES = new Set<NodeStatus>(["unavailable"]);

const STATUS_LABELS: Record<NodeStatus, string> = {
  idle: "Idle",
  running: "Running",
  overloaded: "Overloaded",
  unavailable: "Crashed",
  error: "Errors",
  disabled: "Disabled",
};

/**
 * Entity types whose whole point is splitting traffic across more than one
 * downstream target — the ones a mini distribution sparkline is actually
 * evidence *of* something, not noise. Mirrors InspectorPanel.tsx's own
 * `LoadBalancerDistributionSection` gating, minus Kafka's second
 * (Partition Distribution) section — the card only has room for one
 * number, so it prefers the consumer-group split (routingDistribution)
 * and falls back to the partition split only if that's all a Kafka node has.
 */
const ROUTING_ENTITY_TYPES = new Set<EntityType>([
  "load_balancer",
  "replica_pool",
  "reverse_proxy",
  "kafka",
]);

// The visible dot stays 10px (!size-2.5) — the `after:` pseudo-element
// expands only the *invisible* clickable area (to ~26px) around it, since
// React Flow starts a connection drag exclusively from a pointerdown that
// lands on this element. Without it, a normal-precision click near the dot
// misses the handle's small hit box and falls through to node-drag instead
// of connect — the "dragging wires up nodes instead" bug.
const HANDLE_CLASSES =
  "!size-2.5 !border-2 !border-bg-panel !bg-text-subtle !transition-colors hover:!bg-signal after:absolute after:-inset-2 after:content-['']";

function ComponentNodeImpl({ id, data, selected }: NodeProps<ArchitectureNode>) {
  const catalogItem = getEntityCatalogItem(data.entityType);
  const Icon = catalogItem.icon;
  const status = data.status ?? "idle";
  const disabled = status === "disabled";
  const fields = ENTITY_CONFIG_SCHEMA[data.entityType] ?? [];
  const prefersReducedMotion = useReducedMotion();
  const shouldPulse = PULSING_STATUSES.has(status) && !prefersReducedMotion;
  // A given node's identity is fixed by the active scenario (see
  // workshopStore.ts's onNodesChange) — a small lock glyph says so at a
  // glance, per WORKSHOP-UI.md §8: "Users should never need to click a
  // node simply to know what it represents."
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const scenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;
  const isGiven = isGivenNode(scenario, id);

  // Same entityMetrics field InspectorPanel's "Live Metrics" section reads
  // for whatever's currently selected — read here, per node, so utilization,
  // request count, and routing split are all visible on the canvas itself,
  // without clicking through every node in turn.
  const entityMetrics = useWorkshopStore((s) => s.playbackMetrics?.entityMetrics[id]);
  const utilization = entityMetrics?.utilization;

  // Cost reads simulationResult (the final tally), not playbackMetrics —
  // same "shouldn't jitter as the user scrubs playback" reasoning
  // CostPanel.tsx and InspectorPanel.tsx's EstimatedCostSection already
  // document. Base (provisioned) cost is real even pre-run, so this isn't
  // gated on a completed simulation the way utilization/requests are.
  const nodes = useWorkshopStore((s) => s.nodes);
  const simulationResult = useWorkshopStore((s) => s.simulationResult);
  const costEntry = estimateCost(simulationResult, nodes).entities.find(
    (e) => e.entityId === id
  );

  // The one busiest node on the whole canvas this run, if anything is
  // meaningfully loaded — see bottleneckDetection.ts. Suppressed below on
  // an already-crashed/erroring node: those already carry their own loud
  // red pulse, and stacking a second animated highlight on top reads as
  // noise, not signal. (The hook itself always runs, unconditionally —
  // Rules of Hooks — the status check is applied to its result instead.)
  const bottleneckId = useWorkshopStore((s) =>
    findBottleneckNodeId(s.nodes, s.playbackMetrics?.entityMetrics)
  );
  const isBottleneck = bottleneckId === id && status !== "unavailable" && status !== "error";

  const showsRoutingDistribution =
    ROUTING_ENTITY_TYPES.has(data.entityType) ||
    (data.entityType === "message_queue" && data.config.deliveryMode === "topic");
  const distribution = showsRoutingDistribution
    ? (entityMetrics?.routingDistribution ?? entityMetrics?.kafkaPartitions)
    : undefined;
  const distributionTotal = distribution?.reduce((sum, entry) => sum + entry.requests, 0) ?? 0;

  return (
    <div
      data-node-card
      className={`group relative w-56 overflow-hidden border bg-bg-panel shadow-elevated
        transition-all duration-fast ease-standard
        ${selected ? "border-signal" : "border-border hover:-translate-y-0.5 hover:border-border-hover hover:shadow-dropdown"}
        ${disabled ? "opacity-50" : ""}`}
    >
      {isBottleneck && (
        <>
          <Badge
            variant="warning"
            className="absolute -top-2 -right-2 z-10 bg-bg-panel"
          >
            <Flame className="size-2.5" aria-hidden />
            Bottleneck
          </Badge>
          {!prefersReducedMotion && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-0"
              animate={{
                boxShadow: [
                  "0 0 0 0px var(--color-status-degraded)",
                  "0 0 0 3px var(--color-status-degraded)",
                  "0 0 0 0px var(--color-status-degraded)",
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </>
      )}

      {/* A full-width strip reads at a glance even zoomed out, unlike the
          8px status dot alone — the dot stays too (it's what the legend
          documents and what carries the accessible label). */}
      <div className={`h-0.5 w-full ${status === "idle" ? "bg-border" : STATUS_BAR_CLASSES[status]}`} aria-hidden />

      {selected && <CornerBrackets size={9} inset={-1} colorClassName="border-signal" />}

      <Handle type="target" position={Position.Left} className={HANDLE_CLASSES} />

      <div className="flex items-start gap-2.5 px-3 pt-2.5 pb-2">
        <span className="flex size-7 shrink-0 items-center justify-center border border-border bg-bg-elevated">
          <Icon className="size-3.5 text-text-muted" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-text-subtle">
            {catalogItem.name}
          </p>
          <p className="truncate text-sm font-medium text-text">{data.label}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {isGiven && (
            <Lock
              className="size-3 text-text-subtle"
              aria-label="Fixed by this scenario — can't be deleted or reconfigured"
              role="img"
            />
          )}
          <span className="relative flex size-2 shrink-0">
            {shouldPulse && (
              <motion.span
                className={`absolute inline-flex size-full rounded-full ${STATUS_DOT_CLASSES[status]}`}
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <span
              className={`relative size-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[status]}`}
              role="img"
              aria-label={STATUS_LABELS[status]}
              title={STATUS_LABELS[status]}
            />
          </span>
        </div>
      </div>

      {fields.length > 0 && (
        <p className="truncate border-t border-border px-3 py-1.5 text-[11px] text-text-subtle">
          {fields
            .map((field) => {
              const raw = data.config[field.key];
              if (field.type === "select") {
                const value = typeof raw === "string" ? raw : field.default;
                return `${field.shortLabel} ${value}`;
              }
              const value = typeof raw === "number" ? raw : field.default;
              const display = field.type === "percent" ? value * 100 : value;
              return `${field.shortLabel} ${display}${field.unit ?? ""}`;
            })
            .join(" · ")}
        </p>
      )}

      {costEntry && (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1 text-[10px] tabular-nums text-text-subtle">
          <span>{entityMetrics ? `${entityMetrics.requestCount.toLocaleString()} req` : "—"}</span>
          <span>
            ${costEntry.monthlyTotalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
            {!costEntry.hasUsageData && "+"}
          </span>
        </div>
      )}

      {/* The visible evidence a routing algorithm needs (see
          LoadBalancerDistributionSection's own comment in
          InspectorPanel.tsx) — one segment per downstream target, width
          proportional to its share, alternating tone since the design
          system has exactly one accent color to spend on data, not one
          per target. */}
      {distribution && distribution.length > 0 && distributionTotal > 0 && (
        <div
          className="flex h-1.5 w-full overflow-hidden border-t border-border bg-bg-elevated"
          role="img"
          aria-label={`Traffic split across ${distribution.length} targets`}
          title={`Traffic split across ${distribution.length} targets`}
        >
          {distribution.map((entry, i) => (
            <div
              key={entry.targetId}
              className={i % 2 === 0 ? "bg-signal" : "bg-signal/45"}
              style={{ width: `${(entry.requests / distributionTotal) * 100}%` }}
            />
          ))}
        </div>
      )}

      {utilization !== undefined && (
        <div
          className="h-1 w-full bg-bg-elevated"
          role="img"
          aria-label={`Utilization ${(utilization * 100).toFixed(0)}%`}
          title={`Utilization ${(utilization * 100).toFixed(0)}%`}
        >
          <div
            className={`h-full ${STATUS_BAR_CLASSES[status]} transition-[width] duration-normal ease-standard`}
            style={{ width: `${Math.min(100, utilization * 100)}%` }}
          />
        </div>
      )}

      <Handle type="source" position={Position.Right} className={HANDLE_CLASSES} />
    </div>
  );
}

export const ComponentNode = memo(ComponentNodeImpl);
