import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { ENTITY_CONFIG_SCHEMA } from "@/lib/entityConfigSchema";
import { useWorkshopStore } from "@/store/workshopStore";
import type { ArchitectureNode, NodeStatus } from "@/store/workshopStore";
import { getScenario } from "@/scenarios";
import { isGivenNode } from "@/lib/scenarioLocking";

const STATUS_DOT_CLASSES: Record<NodeStatus, string> = {
  idle: "bg-text-subtle",
  running: "bg-status-healthy",
  overloaded: "bg-status-degraded",
  unavailable: "bg-status-critical",
  error: "bg-status-critical",
  disabled: "bg-text-subtle",
};

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

// The visible dot stays 10px (!size-2.5) — the `after:` pseudo-element
// expands only the *invisible* clickable area (to ~26px) around it, since
// React Flow starts a connection drag exclusively from a pointerdown that
// lands on this element. Without it, a normal-precision click near the dot
// misses the handle's small hit box and falls through to node-drag instead
// of connect — the "dragging wires up nodes instead" bug.
const HANDLE_CLASSES =
  "!size-2.5 !border-2 !border-bg-panel !bg-text-subtle !transition-colors after:absolute after:-inset-2 after:content-['']";

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

  return (
    <div
      data-node-card
      className={`w-52 rounded-lg border bg-bg-panel px-3 py-2.5 shadow-elevated
        transition-all duration-fast ease-standard
        ${selected ? "border-signal" : "border-border hover:-translate-y-0.5 hover:border-border-hover hover:shadow-dropdown"}
        ${disabled ? "opacity-50" : ""}`}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLASSES} />

      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-text-muted" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">
          {data.label}
        </p>
        {isGiven && (
          <Lock
            className="size-3 shrink-0 text-text-subtle"
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

      {fields.length > 0 && (
        <p className="mt-1 truncate text-[11px] text-text-subtle">
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

      <Handle type="source" position={Position.Right} className={HANDLE_CLASSES} />
    </div>
  );
}

export const ComponentNode = memo(ComponentNodeImpl);
