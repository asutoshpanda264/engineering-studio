import { useState } from "react";
import { CheckCircle2, CircleDashed, RotateCcw } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useWorkshopStore } from "@/store/workshopStore";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { ENTITY_CONFIG_SCHEMA } from "@/lib/entityConfigSchema";
import type { ConfigFieldSchema } from "@/lib/entityConfigSchema";
import { getEntityEducation } from "@/lib/entityEducation";
import { evaluateScenario, getScenario } from "@/scenarios";
import type { ConstraintResult, Scenario, ScenarioConstraint } from "@/scenarios";
import type { ArchitectureNode } from "@/store/workshopStore";
import { computeEdgeLatencies } from "@/simulation/entities/CDN";
import { CDNEdgeMap } from "@/components/workshop/CDNEdgeMap";
import { CDNImpactComparison } from "@/components/workshop/CDNImpactComparison";
import type { CDNEdgeMetrics, RoutingTargetMetrics } from "@/simulation/types";

/**
 * The Inspector explains whatever's selected. With nothing selected,
 * there's no per-node config to show — so the empty state doubles as the
 * active scenario's briefing (story, constraints, hints) plus the global
 * Duration/Connection Latency knobs, instead of a blank "select a node"
 * message.
 */
export function InspectorPanel() {
  const selectedNodeId = useWorkshopStore((s) => s.selectedNodeId);
  const nodes = useWorkshopStore((s) => s.nodes);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-bg-elevated">
      {selectedNode ? (
        <NodeInspector node={selectedNode} />
      ) : (
        <ScenarioInspector />
      )}
    </aside>
  );
}

function ScenarioInspector() {
  const scenarioDurationMs = useWorkshopStore((s) => s.scenarioDurationMs);
  const connectionLatencyMs = useWorkshopStore((s) => s.connectionLatencyMs);
  const setScenarioDurationMs = useWorkshopStore((s) => s.setScenarioDurationMs);
  const setConnectionLatencyMs = useWorkshopStore((s) => s.setConnectionLatencyMs);
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const scenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;

  return (
    <>
      <Panel.Header title="Scenario" />
      <Panel.Body className="flex flex-col gap-5">
        {scenario ? (
          <ScenarioBriefing scenario={scenario} />
        ) : (
          <p className="text-xs text-text-subtle">
            Select a component to configure it — including the Client,
            which controls traffic rate. These settings apply to the whole
            run.
          </p>
        )}

        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <Input
            label="Duration (ms)"
            type="number"
            min={1000}
            step={1000}
            value={scenarioDurationMs}
            onChange={(e) => setScenarioDurationMs(Number(e.target.value))}
          />
          <Input
            label="Connection Latency (ms)"
            type="number"
            min={0}
            step={1}
            value={connectionLatencyMs}
            onChange={(e) => setConnectionLatencyMs(Number(e.target.value))}
          />
        </section>
      </Panel.Body>
    </>
  );
}

function ScenarioBriefing({ scenario }: { scenario: Scenario }) {
  const loadScenario = useWorkshopStore((s) => s.loadScenario);
  // playbackMetrics reflects wherever the playback cursor currently is —
  // pass/fail should judge the complete run, so this reads the final
  // tally from the immutable result instead (SIMULATION-ENGINE.md §11:
  // simulation is history, judged once it's finished).
  const simulationResult = useWorkshopStore((s) => s.simulationResult);
  const evaluation = simulationResult
    ? evaluateScenario(scenario, simulationResult.metrics)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-text">{scenario.title}</h3>
          <p className="text-[11px] text-text-subtle">
            {"★".repeat(scenario.difficulty)}
            {"☆".repeat(5 - scenario.difficulty)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="size-3.5" aria-hidden />}
          onClick={() => loadScenario(scenario.id)}
          aria-label="Restart scenario"
        >
          Restart
        </Button>
      </div>

      <p className="text-xs text-text-muted">{scenario.story}</p>

      <section className="flex flex-col gap-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
          Success Criteria
        </h4>
        {scenario.constraints.map((constraint) => (
          <ConstraintRow
            key={constraint.id}
            constraint={constraint}
            result={evaluation?.results.find((r) => r.constraint.id === constraint.id) ?? null}
          />
        ))}
      </section>

      {evaluation?.passed && (
        <section className="flex flex-col gap-2 rounded-md border border-success/30 bg-success/10 p-3">
          <p className="text-xs font-medium text-success">
            All success criteria met. Here&apos;s what made the difference:
          </p>
          <ul className="flex flex-col gap-1">
            {scenario.learningGoals.map((goal) => (
              <li key={goal} className="text-xs text-text-muted">
                • {goal}
              </li>
            ))}
          </ul>
        </section>
      )}

      <HintList hints={scenario.hints} />
    </div>
  );
}

function ConstraintRow({
  constraint,
  result,
}: {
  constraint: ScenarioConstraint;
  result: ConstraintResult | null;
}) {
  const Icon = result ? (result.passed ? CheckCircle2 : CircleDashed) : CircleDashed;
  const color = result ? (result.passed ? "text-success" : "text-error") : "text-text-subtle";

  return (
    <div className="flex items-start gap-2">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${color}`} aria-hidden />
      <div className="flex-1">
        <p className="text-xs text-text-muted">{constraint.label}</p>
        {result && (
          <p className={`text-[11px] ${color}`}>{formatConstraintActual(constraint, result.actual)}</p>
        )}
      </div>
    </div>
  );
}

function formatConstraintActual(constraint: ScenarioConstraint, actual: number): string {
  if (constraint.metric === "successRate") {
    return `Currently ${(actual * 100).toFixed(1)}%`;
  }
  const rounded = constraint.unit === "ms" ? Math.round(actual) : actual.toFixed(1);
  return `Currently ${rounded}${constraint.unit ? ` ${constraint.unit}` : ""}`;
}

/** Hints reveal one at a time on request (SCENARIOS.md — "Hints should encourage thinking, not provide solutions"). */
function HintList({ hints }: { hints: string[] }) {
  const [shown, setShown] = useState(0);

  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
        Hints
      </h4>
      {hints.slice(0, shown).map((hint) => (
        <p key={hint} className="text-xs text-text-muted">
          {hint}
        </p>
      ))}
      {shown < hints.length && (
        <button
          type="button"
          onClick={() => setShown(shown + 1)}
          className="self-start text-xs font-medium text-primary hover:underline"
        >
          {shown === 0 ? "Need a hint?" : "Show another hint"}
        </button>
      )}
    </section>
  );
}

function NodeInspector({ node }: { node: ArchitectureNode }) {
  const updateNodeConfig = useWorkshopStore((s) => s.updateNodeConfig);
  // Live Metrics tracks the current point in playback, not the final
  // tally — a component that backed up mid-run and drained by the end
  // should still show that backlog while scrubbing through it.
  const playbackMetrics = useWorkshopStore((s) => s.playbackMetrics);
  const cdnComparisons = useWorkshopStore((s) => s.cdnComparisons);
  const catalogItem = getEntityCatalogItem(node.data.entityType);
  const Icon = catalogItem.icon;
  const fields = ENTITY_CONFIG_SCHEMA[node.data.entityType] ?? [];

  const entityMetrics = playbackMetrics?.entityMetrics[node.id];
  const isClient = node.data.entityType === "client";

  return (
    <>
      <Panel.Header title="Inspector" />
      <Panel.Body className="flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <Icon className="size-4 shrink-0 text-text-muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">
              {node.data.label}
            </p>
            <p className="truncate text-xs text-text-subtle">
              {catalogItem.description}
            </p>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Configuration
          </h3>
          {fields.length === 0 ? (
            <p className="text-xs text-text-subtle">
              This component has no configurable settings yet.
            </p>
          ) : (
            fields.map((field) => (
              <ConfigField
                key={field.key}
                field={field}
                value={node.data.config[field.key]}
                onChange={(value) => updateNodeConfig(node.id, { [field.key]: value })}
              />
            ))
          )}
        </section>

        {node.data.entityType === "cdn" && (
          <CDNEdgeSection node={node} edgeMetrics={entityMetrics?.cdnEdges} />
        )}

        {node.data.entityType === "load_balancer" && entityMetrics?.routingDistribution && (
          <LoadBalancerDistributionSection distribution={entityMetrics.routingDistribution} />
        )}

        {node.data.entityType === "cdn" && cdnComparisons?.[node.id] && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Why This Helps
            </h3>
            <CDNImpactComparison comparison={cdnComparisons[node.id]} />
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Live Metrics
          </h3>
          {!playbackMetrics ? (
            <p className="text-xs text-text-subtle">
              Run a simulation to see live metrics.
            </p>
          ) : isClient ? (
            <div className="grid grid-cols-2 gap-2">
              <MetricStat
                label="Requests"
                value={String(playbackMetrics.totalRequests)}
              />
              <MetricStat
                label="Success rate"
                value={`${(playbackMetrics.successRate * 100).toFixed(1)}%`}
              />
            </div>
          ) : entityMetrics ? (
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
              <MetricStat label="Queue length" value={String(entityMetrics.queueLength)} />
            </div>
          ) : (
            <p className="text-xs text-text-subtle">
              This component wasn&apos;t reached by any request in the last run.
            </p>
          )}
        </section>

        <EngineeringExplanation node={node} />
      </Panel.Body>
    </>
  );
}

function CDNEdgeSection({
  node,
  edgeMetrics,
}: {
  node: ArchitectureNode;
  edgeMetrics: CDNEdgeMetrics[] | undefined;
}) {
  const config = node.data.config;
  const edgeCount = typeof config.edgeCount === "number" ? config.edgeCount : 5;
  const minLatency = typeof config.minEdgeLatencyMs === "number" ? config.minEdgeLatencyMs : 1;
  const maxLatency = typeof config.maxEdgeLatencyMs === "number" ? config.maxEdgeLatencyMs : 6;
  const edgeLatencyMs = computeEdgeLatencies(edgeCount, minLatency, maxLatency);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
        Edge Map
      </h3>
      <CDNEdgeMap edgeLatencyMs={edgeLatencyMs} edgeMetrics={edgeMetrics} />
    </section>
  );
}

/**
 * The visible evidence the algorithm choice needs (see feedback that
 * shipped this: a load balancer with one hardcoded algorithm teaches
 * nothing a student can observe). Round robin and least-connections
 * behave identically here when every target is equally fast — the
 * point is to make that sameness, and any later divergence once a
 * target is slower, visible as a comparable bar per target rather than
 * a single aggregate number.
 */
function LoadBalancerDistributionSection({
  distribution,
}: {
  distribution: RoutingTargetMetrics[];
}) {
  const nodes = useWorkshopStore((s) => s.nodes);
  const total = distribution.reduce((sum, d) => sum + d.requests, 0);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
        Request Distribution
      </h3>
      <div className="flex flex-col gap-1.5">
        {distribution.map((entry) => {
          const label = nodes.find((n) => n.id === entry.targetId)?.data.label ?? entry.targetId;
          const fraction = total > 0 ? entry.requests / total : 0;
          return (
            <div key={entry.targetId} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span className="truncate">{label}</span>
                <span className="shrink-0 tabular-nums">
                  {entry.requests} ({(fraction * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-panel">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${fraction * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EngineeringExplanation({ node }: { node: ArchitectureNode }) {
  const catalogItem = getEntityCatalogItem(node.data.entityType);
  const education = getEntityEducation(node.data.entityType);

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
        How It Works
      </h3>

      {!catalogItem.implemented && (
        <Badge variant="warning" dot>
          Not simulated yet — won&apos;t affect results
        </Badge>
      )}

      <p className="border-l-2 border-primary/40 pl-3 text-sm italic text-text">
        &ldquo;{education.truth}&rdquo;
      </p>

      <p className="text-xs text-text-muted">{education.whatAmI}</p>

      <div className="flex flex-col gap-1">
        <h4 className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">
          Learning Goal
        </h4>
        <p className="text-xs text-text-muted">{education.learningGoal}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {education.relatedConcepts.map((concept) => (
          <Badge key={concept} variant="neutral">
            {concept}
          </Badge>
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
  if (field.type === "select") {
    const currentValue = typeof value === "string" ? value : field.default;
    return (
      <Select
        label={field.label}
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
      label={`${field.label}${field.unit ? ` (${field.unit})` : ""}`}
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

function MetricStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bg-panel px-2 py-1.5">
      <p className="text-[11px] text-text-subtle">{label}</p>
      <p className="text-sm font-medium text-text">{value}</p>
    </div>
  );
}
