"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useFailureDemoStore } from "@/store/failureDemoStore";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { ENTITY_CONFIG_SCHEMA } from "@/lib/entityConfigSchema";
import type { ConfigFieldSchema } from "@/lib/entityConfigSchema";
import type { ArchitectureNode } from "@/store/workshopStore";
import type { CacheStampedeMetrics, EntityType } from "@/simulation/types";

/**
 * A deliberately smaller Inspector than the real Workshop's — this page
 * only ever has 2-3 nodes, none of them need CDN edge maps, per-target
 * weight editors, or cost breakdowns, so those sections are left out
 * rather than dragging the full InspectorPanel.tsx in unmodified.
 *
 * Unlike the real Workshop's Inspector (which only ever shows whichever
 * one node is currently selected), this lists every node in the demo as
 * its own dropdown, all expanded by default — with only 2-3 nodes total,
 * requiring a click on the canvas just to see one component's config
 * added friction for no real benefit. Clicking a node on the canvas still
 * selects it (highlighted here too), it just isn't required to see
 * anything.
 */
export function FailureDemoInspector() {
  const nodes = useFailureDemoStore((s) => s.nodes);
  const selectedNodeId = useFailureDemoStore((s) => s.selectedNodeId);
  const playbackMetrics = useFailureDemoStore((s) => s.playbackMetrics);
  const updateNodeConfig = (id: string, config: Record<string, unknown>) => {
    // Inlined rather than a dedicated store action: only this component
    // needs to write arbitrary config, and it's a one-line map+merge —
    // see workshopStore.updateNodeConfig for the identical shape.
    useFailureDemoStore.setState((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, config: { ...node.data.config, ...config } } }
          : node
      ),
    }));
  };

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-bg-elevated">
      <Panel.Header title="Inspector" />
      <Panel.Body className="flex flex-col gap-2">
        {nodes.length === 0 ? (
          <p className="text-xs text-text-subtle">Loading…</p>
        ) : (
          nodes.map((node) => (
            <NodeSection
              key={node.id}
              node={node}
              selected={node.id === selectedNodeId}
              playbackMetrics={playbackMetrics}
              onConfigChange={(key, value) => updateNodeConfig(node.id, { [key]: value })}
            />
          ))
        )}
      </Panel.Body>
    </aside>
  );
}

/** Same collapsed-by-default-elsewhere pattern InspectorPanel.tsx uses for its own sections — defaults open here since there are only ever 2-3 of these total. */
function CollapsibleSection({
  title,
  icon,
  highlighted,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: ReactNode;
  highlighted: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-md border transition-colors duration-fast ease-standard ${
        highlighted ? "border-primary/40 bg-primary/5" : "border-border bg-bg-panel"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronRight
          className={`size-3.5 shrink-0 text-text-subtle transition-transform duration-fast ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
        {icon}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{title}</span>
      </button>
      {open && <div className="flex flex-col gap-5 px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

function NodeSection({
  node,
  selected,
  playbackMetrics,
  onConfigChange,
}: {
  node: ArchitectureNode;
  selected: boolean;
  playbackMetrics: ReturnType<typeof useFailureDemoStore.getState>["playbackMetrics"];
  onConfigChange: (key: string, value: number | string) => void;
}) {
  const catalogItem = getEntityCatalogItem(node.data.entityType);
  const Icon = catalogItem.icon;

  return (
    <CollapsibleSection
      title={node.data.label}
      icon={<Icon className="size-4 shrink-0 text-text-muted" aria-hidden />}
      highlighted={selected}
    >
      <ConfigurationSection
        fields={ENTITY_CONFIG_SCHEMA[node.data.entityType] ?? []}
        config={node.data.config}
        onChange={onConfigChange}
      />
      <LiveMetricsSection
        entityType={node.data.entityType}
        nodeId={node.id}
        playbackMetrics={playbackMetrics}
      />
    </CollapsibleSection>
  );
}

function ConfigurationSection({
  fields,
  config,
  onChange,
}: {
  fields: ConfigFieldSchema[];
  config: Record<string, unknown>;
  onChange: (key: string, value: number | string) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
        Configuration
      </h3>
      <div className="flex flex-col gap-3">
        {fields.map((field) => (
          <ConfigField
            key={field.key}
            field={field}
            value={config[field.key]}
            onChange={(value) => onChange(field.key, value)}
          />
        ))}
      </div>
    </section>
  );
}

function ConfigField({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldSchema;
  value: unknown;
  onChange: (value: number | string) => void;
}) {
  const labelText = `${field.label}${"unit" in field && field.unit ? ` (${field.unit})` : ""}`;

  if (field.type === "select") {
    const currentValue = typeof value === "string" ? value : field.default;
    return (
      <Select
        label={labelText}
        options={field.options}
        value={currentValue}
        title={field.description}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const rawValue = typeof value === "number" ? value : field.default;
  const displayValue = field.type === "percent" ? rawValue * 100 : rawValue;
  const displayMax = field.type === "percent" ? field.max * 100 : field.max;
  const displayMin = field.type === "percent" ? field.min * 100 : field.min;
  const displayStep = field.type === "percent" ? field.step * 100 : field.step;

  return (
    <Input
      label={labelText}
      type="number"
      min={displayMin}
      max={displayMax}
      step={displayStep}
      value={displayValue}
      title={field.description}
      onChange={(e) => {
        const parsed = Number(e.target.value);
        onChange(field.type === "percent" ? parsed / 100 : parsed);
      }}
    />
  );
}

function LiveMetricsSection({
  entityType,
  nodeId,
  playbackMetrics,
}: {
  entityType: EntityType;
  nodeId: string;
  playbackMetrics: ReturnType<typeof useFailureDemoStore.getState>["playbackMetrics"];
}) {
  const isClient = entityType === "client";
  const entityMetrics = playbackMetrics?.entityMetrics[nodeId];

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
        Live Metrics
      </h3>
      {!playbackMetrics ? (
        <p className="text-xs text-text-subtle">Run the simulation to see live metrics.</p>
      ) : isClient ? (
        <div className="grid grid-cols-2 gap-2">
          <MetricStat label="Requests" value={String(playbackMetrics.totalRequests)} />
          <MetricStat
            label="Success rate"
            value={`${(playbackMetrics.successRate * 100).toFixed(1)}%`}
          />
        </div>
      ) : entityMetrics ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {entityMetrics.cacheHitRate !== undefined && (
              <MetricStat
                label="Hit rate"
                value={`${(entityMetrics.cacheHitRate * 100).toFixed(1)}%`}
              />
            )}
            <MetricStat
              label="Utilization"
              value={`${(entityMetrics.utilization * 100).toFixed(1)}%`}
            />
            <MetricStat label="Requests" value={String(entityMetrics.requestCount)} />
            <MetricStat label="Errors" value={String(entityMetrics.errorCount)} />
          </div>
          {entityMetrics.cacheStampede && <StampedeSection stampede={entityMetrics.cacheStampede} />}
        </>
      ) : (
        <p className="text-xs text-text-subtle">
          This component wasn&apos;t reached by any request in the last run.
        </p>
      )}
    </section>
  );
}

/** Same evidence InspectorPanel.tsx's CacheStampedeSection shows in the real Workshop — kept local here rather than imported since that component isn't exported on its own. */
function StampedeSection({ stampede }: { stampede: CacheStampedeMetrics }) {
  const total = stampede.coalescedMisses + stampede.independentMisses;
  if (total === 0) return null;
  const bars = [
    { label: "Independent fetches", value: stampede.independentMisses, color: "bg-primary" },
    { label: "Coalesced (avoided)", value: stampede.coalescedMisses, color: "bg-success" },
  ];

  return (
    <div className="rounded-md bg-bg-elevated p-2.5">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
        Stampede — {stampede.coalescedMisses} avoided
      </p>
      <div className="flex flex-col gap-1.5">
        {bars.map((bar) => {
          const fraction = total > 0 ? bar.value / total : 0;
          return (
            <div key={bar.label} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span className="truncate">{bar.label}</span>
                <span className="shrink-0 tabular-nums">
                  {bar.value} ({(fraction * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-panel">
                <div
                  className={`h-full rounded-full ${bar.color}`}
                  style={{ width: `${fraction * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bg-elevated px-2 py-1.5">
      <p className="text-[11px] text-text-subtle">{label}</p>
      <p className="text-sm font-medium text-text">{value}</p>
    </div>
  );
}
