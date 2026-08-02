import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { motion, useReducedMotion } from "framer-motion";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { ENTITY_CONFIG_SCHEMA } from "@/lib/entityConfigSchema";
import type { ArchitectureNode, NodeStatus } from "@/store/workshopStore";

const STATUS_DOT_CLASSES: Record<NodeStatus, string> = {
  idle: "bg-text-subtle",
  running: "bg-success",
  overloaded: "bg-warning",
  unavailable: "bg-error",
  error: "bg-error",
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

const HANDLE_CLASSES =
  "!size-2.5 !border-2 !border-bg-panel !bg-text-subtle !transition-colors";

function ComponentNodeImpl({ data, selected }: NodeProps<ArchitectureNode>) {
  const catalogItem = getEntityCatalogItem(data.entityType);
  const Icon = catalogItem.icon;
  const status = data.status ?? "idle";
  const disabled = status === "disabled";
  const fields = ENTITY_CONFIG_SCHEMA[data.entityType] ?? [];
  const prefersReducedMotion = useReducedMotion();
  const shouldPulse = PULSING_STATUSES.has(status) && !prefersReducedMotion;

  return (
    <div
      data-node-card
      className={`w-52 rounded-lg border bg-bg-panel px-3 py-2.5 shadow-elevated
        transition-colors duration-fast ease-standard
        ${selected ? "border-primary" : "border-border hover:border-border-hover"}
        ${disabled ? "opacity-50" : ""}`}
    >
      <Handle type="target" position={Position.Left} className={HANDLE_CLASSES} />

      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-text-muted" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">
          {data.label}
        </p>
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
