import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleDashed, Info, Lock, RotateCcw } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useWorkshopStore } from "@/store/workshopStore";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { ENTITY_CONFIG_SCHEMA, formatBenchmarkValue } from "@/lib/entityConfigSchema";
import type { ConfigFieldSchema, NumericFieldSchema } from "@/lib/entityConfigSchema";
import { getEntityEducation } from "@/lib/entityEducation";
import { slugFromEntityType } from "@/lib/entityDeepDive";
import { difficultyColorClass, difficultyMeter } from "@/lib/difficultyDisplay";
import { evaluateScenario, getScenario, resolveReflection } from "@/scenarios";
import type { CapacityEstimate, ConstraintResult, Scenario, ScenarioConstraint } from "@/scenarios";
import type { ArchitectureNode } from "@/store/workshopStore";
import {
  computeEdgeLatencies,
  DEFAULT_ORIGIN_POSITION,
  DEFAULT_USER_POSITION,
} from "@/simulation/entities/CDN";
import { CDNEdgeMap } from "@/components/workshop/CDNEdgeMap";
import { CDNImpactComparison } from "@/components/workshop/CDNImpactComparison";
import { ROUTE_LABELS } from "@/simulation/engine/TrafficGenerator";
import { CATCH_ALL_ROUTE } from "@/simulation/entities/ReverseProxy";
import type {
  CacheAvalancheMetrics,
  CachePenetrationMetrics,
  CacheStampedeMetrics,
  CDNEdgeMetrics,
  CircuitBreakerMetrics,
  EntityType,
  RateLimiterMetrics,
  RoutingTargetMetrics,
  SimulationResult,
} from "@/simulation/types";
import type { SimulationEvent } from "@/simulation/events/types";
import { estimateCost } from "@/lib/costEngine";
import type { CostSeverity } from "@/lib/costEngine";
import { scoreScenario } from "@/lib/scenarioScoring";
import type { ScenarioScore } from "@/lib/scenarioScoring";
import { isFieldLocked } from "@/lib/scenarioLocking";

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

/**
 * A collapsed-by-default accordion header, used to break the Inspector
 * into scannable chunks instead of one long always-expanded wall of text
 * (feedback: the Inspector was "too overwhelming"). `summary` renders
 * next to the title regardless of open state, so the one fact worth
 * seeing at a glance (a cost, a badge) doesn't require expanding.
 */
function CollapsibleSection({
  title,
  defaultOpen = false,
  summary,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium uppercase tracking-wide text-text-subtle">
          <ChevronRight
            className={`size-3 shrink-0 text-text-subtle transition-transform duration-fast ${open ? "rotate-90" : ""}`}
            aria-hidden
          />
          <span className="truncate">{title}</span>
        </span>
        {summary && <span className="shrink-0">{summary}</span>}
      </button>
      {open && <div className="flex flex-col gap-2 pl-4">{children}</div>}
    </section>
  );
}

const FIELD_INFO_POPOVER_WIDTH = 272;
const FIELD_INFO_POPOVER_GAP = 6;

/**
 * The compact "i" trigger + its floating popup — replaces the old
 * always-in-DOM InfoIcon/FieldHint pair (an inline reveal that pushed the
 * rest of Configuration down the page, which was itself a fix for an even
 * longer always-visible paragraph per field — feedback both times was
 * "overwhelming"/"too long"). Click-triggered, not hover — a hover popup
 * that shows real, clickable content (the "Know more" link) is awkward to
 * actually use (feedback: "don't do hover kinda on top of 'i'"), so this
 * behaves like clicking a doc-comment glyph: click to open, click the
 * trigger again / click anywhere outside / Escape to close. What shows up
 * is deliberately small — three industry-benchmark reference points (see
 * entityConfigSchema.ts's `FieldBenchmark`) plus a one-to-two-line "what
 * raising/lowering this does", not the full paragraph. Anyone who wants
 * the long version follows "Know more" to this entity's `/entities/[slug]`
 * writeup instead.
 *
 * Positioned with `position: fixed`, computed from the trigger's own
 * bounding rect — not an absolutely-positioned bubble in normal flow,
 * which is what caused the sidebar's horizontal-scrollbar bug the old
 * FieldHint's doc comment described. `fixed` is relative to the viewport
 * regardless of the Inspector's `overflow-auto`, so it floats freely
 * without pushing or clipping anything. A `useLayoutEffect` flips it
 * above the trigger when the actual rendered popup would run past the
 * bottom of the viewport — measured post-render (so it accounts for real
 * content height, not a guess) but before paint, so there's no visible
 * jump.
 */
function FieldInfoPopover({
  field,
  entityType,
}: {
  field: ConfigFieldSchema;
  entityType: EntityType;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(rect.left, 8),
      window.innerWidth - FIELD_INFO_POPOVER_WIDTH - 8
    );
    setCoords({ top: rect.bottom + FIELD_INFO_POPOVER_GAP, left });
    setOpen(true);
  };

  // Click-outside and Escape both close it — the two standard ways to
  // dismiss a click-triggered popover, neither of which a hover-only
  // version needed.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Flip above the trigger if the popup (now that it's actually rendered
  // and measurable) would run past the bottom of the viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popoverRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    if (popoverRect.bottom > window.innerHeight - 8) {
      const flippedTop = Math.max(8, triggerRect.top - popoverRect.height - FIELD_INFO_POPOVER_GAP);
      setCoords((prev) => (prev && prev.top !== flippedTop ? { ...prev, top: flippedTop } : prev));
    }
  }, [open]);

  const benchmark = field.type !== "select" ? field.benchmark : undefined;

  return (
    <span className="inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={`What does ${field.label} do?`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-subtle transition-colors hover:text-signal focus-visible:text-signal focus-visible:outline-none"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      {open && coords && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={field.label}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: FIELD_INFO_POPOVER_WIDTH }}
          className="z-50 flex flex-col gap-2 rounded-md border border-border bg-bg-elevated p-3 text-left shadow-elevated"
        >
          <p className="text-xs font-medium text-text">{field.label}</p>
          {benchmark && (
            <div className="flex flex-col gap-1 rounded-sm bg-bg-panel p-2">
              <BenchmarkRow label="Low" value={formatBenchmarkValue(field as NumericFieldSchema, benchmark.low)} note={benchmark.lowNote} />
              <BenchmarkRow label="Avg" value={formatBenchmarkValue(field as NumericFieldSchema, benchmark.avg)} note={benchmark.avgNote} />
              <BenchmarkRow label="High" value={formatBenchmarkValue(field as NumericFieldSchema, benchmark.high)} note={benchmark.highNote} />
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-text-subtle">{field.impact}</p>
          <Link
            href={`/entities/${slugFromEntityType(entityType)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start text-[11px] font-medium text-signal hover:underline"
          >
            Know more →
          </Link>
        </div>
      )}
    </span>
  );
}

function BenchmarkRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-baseline gap-1.5 text-[11px] leading-snug">
      <span className="w-6 shrink-0 font-medium uppercase tracking-wide text-text-subtle">{label}</span>
      <span className="shrink-0 font-medium tabular-nums text-text">{value}</span>
      <span className="text-text-subtle">— {note}</span>
    </div>
  );
}

function ScenarioInspector() {
  const scenarioDurationMs = useWorkshopStore((s) => s.scenarioDurationMs);
  const connectionLatencyMs = useWorkshopStore((s) => s.connectionLatencyMs);
  const setScenarioDurationMs = useWorkshopStore((s) => s.setScenarioDurationMs);
  const setConnectionLatencyMs = useWorkshopStore((s) => s.setConnectionLatencyMs);
  const budgetCheckingEnabled = useWorkshopStore((s) => s.budgetCheckingEnabled);
  const setBudgetCheckingEnabled = useWorkshopStore((s) => s.setBudgetCheckingEnabled);
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const scenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;

  return (
    <>
      <Panel.Header title="Scenario" accent />
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
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Budget Checking
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={budgetCheckingEnabled}
              onClick={() => setBudgetCheckingEnabled(!budgetCheckingEnabled)}
              className={`flex h-9 items-center justify-between rounded-md border px-3 text-xs transition-colors duration-fast ease-standard ${
                budgetCheckingEnabled
                  ? "border-border text-text hover:border-border-hover"
                  : "border-signal/50 bg-signal/10 text-signal"
              }`}
            >
              <span>{budgetCheckingEnabled ? "On — cost counts toward scoring" : "Off — build freely, no cost pressure"}</span>
              <span className="font-mono text-[10px] uppercase tracking-wide">
                {budgetCheckingEnabled ? "On" : "Off"}
              </span>
            </button>
          </div>
        </section>
      </Panel.Body>
    </>
  );
}

function ScenarioBriefing({ scenario }: { scenario: Scenario }) {
  const loadScenario = useWorkshopStore((s) => s.loadScenario);
  const startTimedChallenge = useWorkshopStore((s) => s.startTimedChallenge);
  const wasTimedChallenge = useWorkshopStore((s) => s.timedModeStartedAt !== null);
  const nodes = useWorkshopStore((s) => s.nodes);
  const edges = useWorkshopStore((s) => s.edges);
  // playbackMetrics reflects wherever the playback cursor currently is —
  // pass/fail should judge the complete run, so this reads the final
  // tally from the immutable result instead (SIMULATION-ENGINE.md §11:
  // simulation is history, judged once it's finished).
  const simulationResult = useWorkshopStore((s) => s.simulationResult);
  const budgetCheckingEnabled = useWorkshopStore((s) => s.budgetCheckingEnabled);
  const evaluation = simulationResult
    ? evaluateScenario(scenario, simulationResult.metrics)
    : null;
  const score: ScenarioScore | null = simulationResult
    ? scoreScenario(scenario, simulationResult, nodes, edges, !budgetCheckingEnabled)
    : null;
  const projectedCost = estimateCost(simulationResult, nodes).totalMonthlyCost;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-text">{scenario.title}</h3>
          <p className={`text-[11px] tracking-wide ${difficultyColorClass(scenario.difficulty)}`}>
            {difficultyMeter(scenario.difficulty)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="size-3.5" aria-hidden />}
          onClick={() => {
            loadScenario(scenario.id);
            // loadScenario() always clears timed mode (see its own
            // comment) — re-enter it immediately, with a fresh full
            // countdown, if this restart happened mid-challenge. Restart
            // reads as "fresh clock," never as a silent way to exit timed
            // mode.
            if (wasTimedChallenge) startTimedChallenge();
          }}
          aria-label="Restart scenario"
        >
          Restart
        </Button>
      </div>

      <p className="text-xs text-text-muted">{scenario.story}</p>

      {scenario.capacityEstimate && !simulationResult && (
        <CapacityEstimatePrompt estimate={scenario.capacityEstimate} />
      )}

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
        {scenario.budgetUsd !== undefined && budgetCheckingEnabled && (
          <BudgetRow budgetUsd={scenario.budgetUsd} actualUsd={projectedCost} hasRun={simulationResult !== null} />
        )}
        {/* Architecture validity (a real service layer between Client and
            backend) is a structural check, not a cost one — it's still
            enforced in `gatesPassed` regardless of budgetCheckingEnabled,
            so its visibility shouldn't hinge on that toggle. Kept behind
            `scenario.budgetUsd !== undefined` only because that's how
            every budget-gated scenario happens to be authored today, not
            because the two are conceptually coupled. */}
        {scenario.budgetUsd !== undefined && score && (
          <ArchitectureGateRow architectureValid={score.architectureValid} />
        )}
      </section>

      {score?.gatesPassed && <ScoreCard score={score} />}

      {evaluation && scenario.reflection && simulationResult && (
        <section className="flex flex-col gap-2 rounded-md border border-border bg-bg-elevated p-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            What Happened
          </h4>
          <p className="text-xs text-text-muted">
            {resolveReflection(scenario.reflection, simulationResult.metrics)}
          </p>
        </section>
      )}

      {evaluation?.passed && (
        <section className="flex flex-col gap-2 rounded-md border border-status-healthy/30 bg-status-healthy/10 p-3">
          <p className="text-xs font-medium text-status-healthy">
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

      {scenario.optimalSolution && <ReferenceSolutionSection scenario={scenario} />}
    </div>
  );
}

/**
 * The end of the progressive-disclosure line hints already start (SCENARIOS.md
 * — "Hints should encourage thinking, not provide solutions") — this goes
 * one step further than that philosophy normally allows, by explicit
 * request: a full, revealable reference build. `summary` alone (always
 * visible) is the soft nudge; clicking through loads the exact
 * architecture onto the canvas via `loadOptimalSolution`, since a graph is
 * the thing worth inspecting directly here, not a paragraph describing one.
 */
function ReferenceSolutionSection({ scenario }: { scenario: Scenario }) {
  const loadOptimalSolution = useWorkshopStore((s) => s.loadOptimalSolution);
  const viewingOptimalSolution = useWorkshopStore((s) => s.viewingOptimalSolution);
  const solution = scenario.optimalSolution;
  if (!solution) return null;

  return (
    <section className="flex flex-col gap-2 rounded-md border border-border bg-bg-elevated p-3">
      <h4 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
        Stuck?
      </h4>
      <p className="text-xs text-text-muted">{solution.summary}</p>
      {viewingOptimalSolution ? (
        <p className="text-[11px] text-signal">
          You&apos;re viewing the reference solution — Restart to build your own.
        </p>
      ) : (
        <button
          type="button"
          onClick={loadOptimalSolution}
          className="self-start text-xs font-medium text-signal hover:underline"
        >
          See a reference solution
        </button>
      )}
      <Link
        href={`/problems/${scenario.id}/solution`}
        target="_blank"
        rel="noreferrer"
        className="self-start text-[11px] text-text-subtle hover:text-signal hover:underline"
      >
        Read the full walkthrough →
      </Link>
    </section>
  );
}

/**
 * Mirrors ConstraintRow's shape so the budget reads as one more gate in
 * the same list, not a separate afterthought — same "not knowing how you
 * got there" fix as the star score below: cost is enforced, not merely
 * displayed. Pre-run this shows the architecture's current base cost
 * (config alone, same "+" convention CostPanel/EstimatedCostSection use)
 * against the limit; post-run it's the definitive base+usage figure.
 */
function BudgetRow({
  budgetUsd,
  actualUsd,
  hasRun,
}: {
  budgetUsd: number;
  actualUsd: number;
  hasRun: boolean;
}) {
  const passed = actualUsd <= budgetUsd;
  const Icon = hasRun ? (passed ? CheckCircle2 : CircleDashed) : CircleDashed;
  const color = hasRun ? (passed ? "text-status-healthy" : "text-status-critical") : "text-text-subtle";

  return (
    <div className="flex items-start gap-2">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${color}`} aria-hidden />
      <div className="flex-1">
        <p className="text-xs text-text-muted">Stay within budget</p>
        <p className={`text-[11px] ${color}`}>
          Currently ${actualUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          {!hasRun && "+"} of ${budgetUsd.toLocaleString()}/mo
        </p>
      </div>
    </div>
  );
}

/**
 * A structural gate, not a metric — the given Client's traffic must pass
 * through an actual API Server before it can reach a Database/Cache/
 * Message Queue/Kafka/Replica Pool. Skipping the service layer entirely
 * (wiring the Client straight to storage) is cheaper than any real design
 * under this app's cost model, which would make it the "best" answer to
 * every budget-gated scenario for the wrong reason — see
 * architectureValidation.ts's own header comment. Purely structural (nodes
 * + edges), so it's computable without a run, but only shown once one
 * exists, same rhythm as the constraint rows above it.
 */
function ArchitectureGateRow({ architectureValid }: { architectureValid: boolean }) {
  const Icon = architectureValid ? CheckCircle2 : CircleDashed;
  const color = architectureValid ? "text-status-healthy" : "text-status-critical";

  return (
    <div className="flex items-start gap-2">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${color}`} aria-hidden />
      <div className="flex-1">
        <p className="text-xs text-text-muted">Route traffic through a real service layer</p>
        {!architectureValid && (
          <p className={`text-[11px] ${color}`}>
            A Database, Cache, Message Queue, Kafka, or Replica Pool is reachable from the
            Client without passing through an API Server first.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Only ever rendered once every hard gate has already passed (see
 * `score?.gatesPassed` above) — this is strictly "how well," never "did it
 * work," which the Success Criteria section above already answers on its
 * own. Composite math lives in scenarioScoring.ts; this just renders it.
 *
 * `legendary` (5 stars) means a student's own build beat the revealable
 * reference solution's own composite score — a real, verified number
 * (scoreScenario.ts computes it from `scenario.optimalSolution` with the
 * exact same function), not a hardcoded "you did amazing" — so it's
 * visually its own tier, not just "3 stars but shinier."
 */
function ScoreCard({ score }: { score: ScenarioScore }) {
  if (score.legendary) {
    return (
      <section className="flex flex-col gap-1 rounded-md border border-signal bg-signal/15 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text">Solution quality</p>
          <p className="text-sm text-signal" aria-label="Legendary — beat the reference solution">
            ★★★★★ LEGENDARY
          </p>
        </div>
        <p className="text-[11px] text-text-subtle">
          Your build outscored the reference solution — a real number, not a guess: your
          composite beat its {(score.optimalComposite! * 100).toFixed(0)}%. That&apos;s a
          genuinely better idea, not just tighter numbers on the same one.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-1 rounded-md border border-signal/30 bg-signal/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text">Solution quality</p>
        <p className="text-sm" aria-label={`${score.stars} out of 3 stars`}>
          {"★".repeat(score.stars)}
          {"☆".repeat(3 - score.stars)}
        </p>
      </div>
      <p className="text-[11px] text-text-subtle">
        {score.stars === 3
          ? "Meaningfully better than the bare minimum on cost, latency, and reliability all at once."
          : score.stars === 2
            ? "Solid — some real headroom left on cost, latency, or reliability."
            : "It works, but there's real headroom left on cost, latency, or reliability. Try optimizing further, not just passing."}
      </p>
    </section>
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
  const color = result ? (result.passed ? "text-status-healthy" : "text-status-critical") : "text-text-subtle";

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

/**
 * A prediction exercise, shown only before the first run of a scenario
 * (PRIMER-GAP.md Part A) — once `simulationResult` exists, `ScenarioBriefing`
 * stops rendering this entirely rather than leaving a stale prompt sitting
 * above the real numbers. The worked answer reveals on request, same
 * pattern as HintList: a guess is more useful made than skipped.
 */
function CapacityEstimatePrompt({ estimate }: { estimate: CapacityEstimate }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="flex flex-col gap-2 rounded-md border border-border bg-bg-elevated p-3">
      <h4 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
        Before You Run
      </h4>
      <p className="text-xs text-text-muted">{estimate.prompt}</p>
      {revealed ? (
        <p className="text-xs text-text-muted">{estimate.worked}</p>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="self-start text-xs font-medium text-signal hover:underline"
        >
          Show the worked answer
        </button>
      )}
    </section>
  );
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
          className="self-start text-xs font-medium text-signal hover:underline"
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
  // Only the CDN Edge Map's live pulse needs to know exactly where the
  // playback cursor is right now (as opposed to playbackMetrics, which is
  // already a cumulative-to-cursor snapshot) — everything else here is
  // happy reading playbackMetrics alone.
  const playbackState = useWorkshopStore((s) => s.playbackState);
  // Estimated Cost deliberately reads the final simulationResult, not
  // playbackMetrics — same reasoning ScenarioBriefing documents above: a
  // monthly cost projection shouldn't jitter as the user scrubs playback.
  const simulationResult = useWorkshopStore((s) => s.simulationResult);
  const cdnComparisons = useWorkshopStore((s) => s.cdnComparisons);
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const activeScenario = activeScenarioId ? getScenario(activeScenarioId) : undefined;
  const catalogItem = getEntityCatalogItem(node.data.entityType);
  const Icon = catalogItem.icon;
  const fields = ENTITY_CONFIG_SCHEMA[node.data.entityType] ?? [];

  const entityMetrics = playbackMetrics?.entityMetrics[node.id];
  const isClient = node.data.entityType === "client";

  return (
    <>
      <Panel.Header title="Inspector" accent />
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

        <div data-tour-id="inspector-config">
          <CollapsibleSection title="Configuration" defaultOpen>
            {fields.length === 0 ? (
              <p className="text-xs text-text-subtle">
                This component has no configurable settings yet.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {fields.map((field) => (
                  <ConfigField
                    key={field.key}
                    field={field}
                    entityType={node.data.entityType}
                    value={node.data.config[field.key]}
                    onChange={(value) => updateNodeConfig(node.id, { [field.key]: value })}
                    locked={isFieldLocked(activeScenario, node.id, field.key)}
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>
        </div>

        <CollapsibleSection title="Live Metrics" defaultOpen>
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
        </CollapsibleSection>

        {!isClient && <EstimatedCostSection node={node} simulationResult={simulationResult} />}

        {node.data.entityType === "cdn" && (
          <CDNEdgeSection
            node={node}
            edgeMetrics={entityMetrics?.cdnEdges}
            events={simulationResult?.events}
            currentTimeMs={playbackState?.currentTime}
          />
        )}

        {node.data.entityType === "load_balancer" &&
          node.data.config.algorithm === "weighted_round_robin" && (
            <LoadBalancerWeightsSection node={node} />
          )}

        {node.data.entityType === "reverse_proxy" && (
          <ReverseProxyRoutesSection node={node} />
        )}

        {node.data.entityType === "kafka" && entityMetrics?.kafkaPartitions && (
          <LoadBalancerDistributionSection
            distribution={entityMetrics.kafkaPartitions}
            title="Partition Distribution"
          />
        )}

        {(node.data.entityType === "load_balancer" ||
          node.data.entityType === "replica_pool" ||
          node.data.entityType === "reverse_proxy" ||
          node.data.entityType === "kafka" ||
          (node.data.entityType === "message_queue" && node.data.config.deliveryMode === "topic")) &&
          entityMetrics?.routingDistribution && (
            <LoadBalancerDistributionSection
              distribution={entityMetrics.routingDistribution}
              title={
                node.data.entityType === "kafka" ? "Consumer Group Distribution" : undefined
              }
            />
          )}

        {node.data.entityType === "rate_limiter" && entityMetrics?.rateLimiter && (
          <RateLimiterSection rateLimiter={entityMetrics.rateLimiter} />
        )}

        {node.data.entityType === "cache" && entityMetrics?.cacheStampede && (
          <CacheStampedeSection stampede={entityMetrics.cacheStampede} />
        )}

        {node.data.entityType === "cache" && entityMetrics?.cachePenetration && (
          <CachePenetrationSection penetration={entityMetrics.cachePenetration} />
        )}

        {node.data.entityType === "cache" && entityMetrics?.cacheAvalanche && (
          <CacheAvalancheSection avalanche={entityMetrics.cacheAvalanche} />
        )}

        {node.data.entityType === "circuit_breaker" && entityMetrics?.circuitBreaker && (
          <CircuitBreakerStateSection circuitBreaker={entityMetrics.circuitBreaker} />
        )}

        {node.data.entityType === "cdn" && cdnComparisons?.[node.id] && (
          <CollapsibleSection title="Why This Helps">
            <CDNImpactComparison comparison={cdnComparisons[node.id]} />
          </CollapsibleSection>
        )}

        <EngineeringExplanation node={node} />
      </Panel.Body>
    </>
  );
}

function CDNEdgeSection({
  node,
  edgeMetrics,
  events,
  currentTimeMs,
}: {
  node: ArchitectureNode;
  edgeMetrics: CDNEdgeMetrics[] | undefined;
  events: SimulationEvent[] | undefined;
  currentTimeMs: number | undefined;
}) {
  const updateNodeConfig = useWorkshopStore((s) => s.updateNodeConfig);
  const config = node.data.config;
  const edgeCount = typeof config.edgeCount === "number" ? config.edgeCount : 5;
  const minLatency = typeof config.minEdgeLatencyMs === "number" ? config.minEdgeLatencyMs : 1;
  const maxLatency = typeof config.maxEdgeLatencyMs === "number" ? config.maxEdgeLatencyMs : 6;
  const userX = typeof config.userX === "number" ? config.userX : DEFAULT_USER_POSITION.x;
  const userY = typeof config.userY === "number" ? config.userY : DEFAULT_USER_POSITION.y;
  const originX = typeof config.originX === "number" ? config.originX : DEFAULT_ORIGIN_POSITION.x;
  const originY = typeof config.originY === "number" ? config.originY : DEFAULT_ORIGIN_POSITION.y;
  const edgeLatencyMs = computeEdgeLatencies(edgeCount, minLatency, maxLatency, userX, userY);
  const activeEdge = useCDNActivePulse(events, node.id, currentTimeMs);

  return (
    <CollapsibleSection title="Edge Map" defaultOpen>
      <CDNEdgeMap
        edgeCount={edgeCount}
        edgeLatencyMs={edgeLatencyMs}
        edgeMetrics={edgeMetrics}
        activeEdge={activeEdge}
        userX={userX}
        userY={userY}
        originX={originX}
        originY={originY}
        onMoveUser={(x, y) => updateNodeConfig(node.id, { userX: x, userY: y })}
        onMoveOrigin={(x, y) => updateNodeConfig(node.id, { originX: x, originY: y })}
        onReset={() =>
          updateNodeConfig(node.id, {
            userX: DEFAULT_USER_POSITION.x,
            userY: DEFAULT_USER_POSITION.y,
            originX: DEFAULT_ORIGIN_POSITION.x,
            originY: DEFAULT_ORIGIN_POSITION.y,
          })
        }
      />
    </CollapsibleSection>
  );
}

/** How far back (in simulated ms) to look, each time the playback cursor
 * moves, for the CDN's own most recent CACHE_HIT/CACHE_MISS — a small
 * window so a scrub or seek doesn't replay a burst of stale history, just
 * "whatever the CDN is doing right now." Independent of playback speed:
 * the pulse itself is timed in real wall-clock ms below, not simulated
 * ms, so it reads the same whether playback is at 0.5x or 4x. */
const CDN_PULSE_LOOKBACK_MS = 120;
const CDN_PULSE_DURATION_MS = 450;

/**
 * Turns the CDN's own request-arrival events into a transient "this just
 * happened" signal the Edge Map can flash — the one place in the app
 * that otherwise only showed a slowly-drifting aggregate (see
 * CDNEdgeMap.tsx's doc comment). Deliberately reads simulationResult's
 * full event log rather than playbackMetrics: metrics are a cumulative
 * snapshot, but a pulse needs "the single most recent matching event,"
 * which a snapshot can't answer.
 */
function useCDNActivePulse(
  events: SimulationEvent[] | undefined,
  entityId: string,
  currentTimeMs: number | undefined
): { edgeIndex: number; hit: boolean } | null {
  const [pulse, setPulse] = useState<
    { edgeIndex: number; hit: boolean; key: number } | null
  >(null);
  const pulseKeyRef = useRef(0);

  useEffect(() => {
    if (!events || events.length === 0 || currentTimeMs === undefined) return;

    // Binary search for the cutoff, same approach as PlaybackController's
    // eventsUpTo — this runs on every playback frame, so a linear scan
    // over the whole log isn't worth it.
    let lo = 0;
    let hi = events.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (events[mid].timestamp <= currentTimeMs) lo = mid + 1;
      else hi = mid;
    }

    const windowStart = currentTimeMs - CDN_PULSE_LOOKBACK_MS;
    for (let i = lo - 1; i >= 0 && events[i].timestamp >= windowStart; i--) {
      const event = events[i];
      if (event.source !== entityId) continue;
      if (event.type !== "CACHE_HIT" && event.type !== "CACHE_MISS") continue;
      const edgeIndex = (event.metadata as { edgeIndex?: number }).edgeIndex;
      if (edgeIndex === undefined) continue;
      pulseKeyRef.current += 1;
      setPulse({ edgeIndex, hit: event.type === "CACHE_HIT", key: pulseKeyRef.current });
      break;
    }
  }, [events, entityId, currentTimeMs]);

  useEffect(() => {
    if (!pulse) return;
    const timeout = setTimeout(() => setPulse(null), CDN_PULSE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [pulse]);

  return pulse;
}

/**
 * Weighted Round Robin's per-target weight editor. Not expressed through
 * ENTITY_CONFIG_SCHEMA's generic field renderer — that schema has no
 * notion of "one field per graph edge" — so this reads the load
 * balancer's actual downstream connections straight from the canvas and
 * renders one input per target, keyed by that target's own entity id.
 * Every target defaults to weight 1 until an operator says otherwise
 * (LoadBalancer.ts: a target with no entry is never silently dropped).
 */
function LoadBalancerWeightsSection({ node }: { node: ArchitectureNode }) {
  const edges = useWorkshopStore((s) => s.edges);
  const nodes = useWorkshopStore((s) => s.nodes);
  const updateNodeConfig = useWorkshopStore((s) => s.updateNodeConfig);

  const targetIds = edges
    .filter((edge) => edge.source === node.id)
    .map((edge) => edge.target);
  const weights = (node.data.config.weights as Record<string, number> | undefined) ?? {};

  return (
    <CollapsibleSection title="Target Weights" defaultOpen>
      {targetIds.length === 0 ? (
        <p className="text-xs text-text-subtle">
          Connect at least one downstream target to assign weights.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {targetIds.map((targetId) => {
            const label = nodes.find((n) => n.id === targetId)?.data.label ?? targetId;
            const value = weights[targetId] ?? 1;
            return (
              <div key={targetId} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-text-muted">{label}</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={value}
                  onChange={(e) => {
                    const next = Math.max(1, Math.min(50, Math.round(Number(e.target.value)) || 1));
                    updateNodeConfig(node.id, { weights: { ...weights, [targetId]: next } });
                  }}
                  className="h-7 w-16 rounded-md border border-border bg-bg-elevated px-2 text-right text-xs text-text
                    transition-colors duration-fast ease-standard
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg
                    hover:border-border-hover"
                />
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
}

/**
 * Reverse Proxy's per-target route editor — same "one field per graph
 * edge" reasoning as LoadBalancerWeightsSection, a dropdown here instead
 * of a number since a route is one of a fixed, closed label pool
 * (ROUTE_LABELS) rather than an arbitrary value. "Unassigned" is a real,
 * distinct option from any route: an unassigned target intentionally
 * receives nothing (ReverseProxy.ts — never silently dropped, never
 * silently included either).
 */
function ReverseProxyRoutesSection({ node }: { node: ArchitectureNode }) {
  const edges = useWorkshopStore((s) => s.edges);
  const nodes = useWorkshopStore((s) => s.nodes);
  const updateNodeConfig = useWorkshopStore((s) => s.updateNodeConfig);

  const targetIds = edges
    .filter((edge) => edge.source === node.id)
    .map((edge) => edge.target);
  const routes = (node.data.config.routes as Record<string, string> | undefined) ?? {};

  return (
    <CollapsibleSection title="Routes" defaultOpen>
      {targetIds.length === 0 ? (
        <p className="text-xs text-text-subtle">
          Connect at least one downstream target to assign it a route.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {targetIds.map((targetId) => {
            const label = nodes.find((n) => n.id === targetId)?.data.label ?? targetId;
            const value = routes[targetId] ?? "";
            return (
              <div key={targetId} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-text-muted">{label}</span>
                <select
                  value={value}
                  onChange={(e) => {
                    const next = { ...routes };
                    if (e.target.value) next[targetId] = e.target.value;
                    else delete next[targetId];
                    updateNodeConfig(node.id, { routes: next });
                  }}
                  className="h-7 w-32 rounded-md border border-border bg-bg-elevated px-1.5 text-xs text-text
                    transition-colors duration-fast ease-standard
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg
                    hover:border-border-hover"
                >
                  <option value="">Unassigned</option>
                  <option value={CATCH_ALL_ROUTE}>* — Catch-all</option>
                  {ROUTE_LABELS.map((route) => (
                    <option key={route} value={route}>
                      {route}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
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
 *
 * `title` defaults to "Request Distribution" (Load Balancer, Replica
 * Pool, Reverse Proxy, Message Queue Topic mode, Kafka consumer groups —
 * all real downstream entity ids). Kafka's Partition Distribution reuses
 * this same component with a synthetic "Partition N" targetId instead —
 * gracefully falls back to printing that string directly since no real
 * node matches it, which reads fine unstyled.
 */
function LoadBalancerDistributionSection({
  distribution,
  title = "Request Distribution",
}: {
  distribution: RoutingTargetMetrics[];
  title?: string;
}) {
  const nodes = useWorkshopStore((s) => s.nodes);
  const total = distribution.reduce((sum, d) => sum + d.requests, 0);

  return (
    <CollapsibleSection title={title}>
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
                  className="h-full rounded-full bg-signal"
                  style={{ width: `${fraction * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

/**
 * Admitted vs. rejected as two comparable bars, same shape as
 * LoadBalancerDistributionSection — the point is the same: an algorithm
 * choice (Token Bucket vs. Sliding Window) needs to be something a
 * student can actually see the effect of, not just a setting they toggled.
 */
function RateLimiterSection({ rateLimiter }: { rateLimiter: RateLimiterMetrics }) {
  const total = rateLimiter.admitted + rateLimiter.rejected;
  const bars: { label: string; value: number }[] = [
    { label: "Admitted", value: rateLimiter.admitted },
    { label: "Rejected", value: rateLimiter.rejected },
  ];

  return (
    <CollapsibleSection
      title="Admission"
      summary={
        <span className="text-[11px] tabular-nums text-text-subtle">
          {rateLimiter.rejected > 0 ? (
            <span className="text-status-critical">{rateLimiter.rejected} rejected</span>
          ) : (
            "all admitted"
          )}
        </span>
      }
    >
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
                  className={`h-full rounded-full ${bar.label === "Rejected" ? "bg-status-critical" : "bg-signal"}`}
                  style={{ width: `${fraction * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

/**
 * Independent vs. coalesced misses — the visible evidence a stampede
 * happened, and (under Coalesced mode) got absorbed instead of hammering
 * downstream. Same two-bar shape as RateLimiterSection: a mode toggle
 * needs proof of its effect, not just a description of it. Shown under
 * both modes — "everything was independent" is the naive baseline a
 * student needs to see before Coalesced's difference means anything.
 */
function CacheStampedeSection({ stampede }: { stampede: CacheStampedeMetrics }) {
  const total = stampede.coalescedMisses + stampede.independentMisses;
  if (total === 0) return null;
  const bars: { label: string; value: number }[] = [
    { label: "Independent fetches", value: stampede.independentMisses },
    { label: "Coalesced (avoided)", value: stampede.coalescedMisses },
  ];

  return (
    <CollapsibleSection
      title="Stampede"
      summary={
        <span className="text-[11px] tabular-nums text-text-subtle">
          {stampede.coalescedMisses} avoided
        </span>
      }
    >
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
                  className={`h-full rounded-full ${bar.label.startsWith("Coalesced") ? "bg-status-healthy" : "bg-signal"}`}
                  style={{ width: `${fraction * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

/**
 * Downstream (not found) vs. negative-cache (avoided) — the visible
 * evidence a Cache is actually being penetrated, and (under Negative
 * Caching) getting protected against it instead of repeating the same
 * wasted round trip forever. Same two-bar shape as CacheStampedeSection —
 * a mode toggle needs proof of its effect, not just a description of it.
 */
function CachePenetrationSection({ penetration }: { penetration: CachePenetrationMetrics }) {
  const total = penetration.negativeHits + penetration.downstreamMisses;
  if (total === 0) return null;
  const bars: { label: string; value: number }[] = [
    { label: "Downstream (not found)", value: penetration.downstreamMisses },
    { label: "Negative cache (avoided)", value: penetration.negativeHits },
  ];

  return (
    <CollapsibleSection
      title="Penetration"
      summary={
        <span className="text-[11px] tabular-nums text-text-subtle">
          {penetration.negativeHits} avoided
        </span>
      }
    >
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
                  className={`h-full rounded-full ${bar.label.startsWith("Negative") ? "bg-status-healthy" : "bg-signal"}`}
                  style={{ width: `${fraction * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

/**
 * How many TTL-expiry misses landed, and how tightly the worst of them
 * clustered — a cache avalanche is a *wave*, not just a count, so the
 * peak-burst number is what actually shows one happened (or didn't).
 */
function CacheAvalancheSection({ avalanche }: { avalanche: CacheAvalancheMetrics }) {
  const isAvalanche = avalanche.peakExpiryBurst > 3;

  return (
    <CollapsibleSection
      title="Avalanche"
      summary={
        <span className="text-[11px] tabular-nums text-text-subtle">
          peak burst {avalanche.peakExpiryBurst}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <MetricStat label="Expired misses" value={String(avalanche.expiredMisses)} />
        <MetricStat label="Peak burst (100ms)" value={String(avalanche.peakExpiryBurst)} />
      </div>
      <p className="text-[10px] leading-relaxed text-text-subtle">
        {isAvalanche
          ? `${avalanche.peakExpiryBurst} entries expired within the same 100ms window — a synchronized wave of downstream re-fetches. Raising TTL Jitter spreads expirations out instead.`
          : "Expirations are spread out here — no synchronized wave detected."}
      </p>
    </CollapsibleSection>
  );
}

const CIRCUIT_STATE_VARIANT: Record<
  CircuitBreakerMetrics["state"],
  "success" | "warning" | "error"
> = {
  closed: "success",
  half_open: "warning",
  open: "error",
};

const CIRCUIT_STATE_LABEL: Record<CircuitBreakerMetrics["state"], string> = {
  closed: "Closed — passing traffic",
  half_open: "Half-open — probing",
  open: "Open — failing fast",
};

/**
 * A state badge, not a bar chart — unlike the algorithm-comparison
 * entities (Load Balancer, Rate Limiter), a circuit breaker's state is a
 * single discrete value at any instant, not a distribution to compare.
 * Trip count is the one thing worth accumulating over the whole run.
 */
function CircuitBreakerStateSection({
  circuitBreaker,
}: {
  circuitBreaker: CircuitBreakerMetrics;
}) {
  return (
    <CollapsibleSection
      title="Circuit State"
      defaultOpen
      summary={
        <Badge variant={CIRCUIT_STATE_VARIANT[circuitBreaker.state]} dot>
          {circuitBreaker.state === "closed" ? "Closed" : circuitBreaker.state === "open" ? "Open" : "Half-open"}
        </Badge>
      }
    >
      <div className="flex items-center justify-between">
        <Badge variant={CIRCUIT_STATE_VARIANT[circuitBreaker.state]} dot>
          {CIRCUIT_STATE_LABEL[circuitBreaker.state]}
        </Badge>
        <span className="text-[11px] text-text-muted tabular-nums">
          {circuitBreaker.tripCount} trip{circuitBreaker.tripCount === 1 ? "" : "s"}
        </span>
      </div>
    </CollapsibleSection>
  );
}

const COST_SEVERITY_VARIANT: Record<CostSeverity, "success" | "warning" | "error"> = {
  normal: "success",
  elevated: "warning",
  high: "error",
};

const COST_SEVERITY_LABEL: Record<CostSeverity, string> = {
  normal: "Normal",
  elevated: "Elevated",
  high: "Over budget",
};

function formatMonthly(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`;
}

/**
 * Reuses estimateCost with a single-node array — pricing only ever
 * depends on that one node's config + its own entityMetrics, never on
 * anything cross-node, so this is exactly the same computation
 * CostPanel.tsx does for every entity at once, just scoped to whichever
 * one is selected.
 */
/**
 * Base (provisioned) cost only ever depends on this node's own config —
 * maxConcurrent, capacity, and so on — so it's real and shown the moment
 * a component exists, the same way a real cloud bill starts accruing
 * before the first request ever arrives. `estimateCost` accepts a null
 * simulationResult specifically so this doesn't have to gate on having
 * run anything; only the Usage line depends on a completed run, and
 * that's called out inline instead of hiding the whole section.
 */
function EstimatedCostSection({
  node,
  simulationResult,
}: {
  node: ArchitectureNode;
  simulationResult: SimulationResult | null;
}) {
  const entity = estimateCost(simulationResult, [node]).entities[0];
  if (!entity) {
    return (
      <CollapsibleSection title="Estimated Cost">
        <p className="text-xs text-text-subtle">Not a priced component.</p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Estimated Cost"
      summary={
        <span className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium tabular-nums text-text-muted">
            {formatMonthly(entity.monthlyTotalCost)}
            {!entity.hasUsageData && "+"}
          </span>
          <Badge variant={COST_SEVERITY_VARIANT[entity.severity]} dot>
            {COST_SEVERITY_LABEL[entity.severity]}
          </Badge>
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <MetricStat label="Base (provisioned)" value={formatMonthly(entity.monthlyBaseCost)} />
        <MetricStat
          label="Usage"
          value={entity.hasUsageData ? formatMonthly(entity.monthlyUsageCost) : "—"}
        />
      </div>
      <p className="text-[10px] leading-relaxed text-text-subtle">
        {entity.hasUsageData
          ? "Illustrative, based on typical public cloud on-demand pricing — not a quote."
          : "Base cost from this component's own config, priced against typical public cloud on-demand rates — not a quote. Run a simulation to add usage-based cost from actual traffic."}
      </p>
    </CollapsibleSection>
  );
}

/**
 * "What This Is" and "Learning Goal" deliberately reuse MetricStat's card
 * look (rounded-md bg-bg-panel, small uppercase label above the value) —
 * the same visual language as Live Metrics / Estimated Cost elsewhere in
 * this panel, instead of each Inspector section inventing its own text
 * treatment (feedback: the mix of plain paragraphs and a lone blockquote
 * read as inconsistent).
 */
function EducationCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md bg-bg-panel p-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">
        {label}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-text-muted">{text}</p>
    </div>
  );
}

function EngineeringExplanation({ node }: { node: ArchitectureNode }) {
  const catalogItem = getEntityCatalogItem(node.data.entityType);
  const education = getEntityEducation(node.data.entityType);

  return (
    <CollapsibleSection
      title="How It Works"
      summary={
        !catalogItem.implemented && (
          <Badge variant="warning" dot>
            Not simulated
          </Badge>
        )
      }
    >
      {!catalogItem.implemented && (
        <Badge variant="warning" dot>
          Not simulated yet — won&apos;t affect results
        </Badge>
      )}

      <p className="border-l-2 border-signal/40 pl-3 text-sm italic text-text">
        &ldquo;{education.truth}&rdquo;
      </p>

      <EducationCard label="What This Is" text={education.whatAmI} />
      <EducationCard label="Learning Goal" text={education.learningGoal} />

      <div className="flex flex-wrap gap-1.5">
        {education.relatedConcepts.map((concept) => (
          <Badge key={concept} variant="neutral">
            {concept}
          </Badge>
        ))}
      </div>
    </CollapsibleSection>
  );
}

function ConfigField({
  field,
  entityType,
  value,
  onChange,
  locked = false,
}: {
  field: ConfigFieldSchema;
  entityType: EntityType;
  value: unknown;
  onChange: (value: number | string) => void;
  /** Fixed by the active scenario (Scenario.lockedFields) — rendered read-only with an explanation instead of the usual popover. */
  locked?: boolean;
}) {
  // The label carries a small "i" trigger rather than a permanent
  // paragraph under the field — what the knob does, real-world low/avg/high
  // reference points, and a link to the full writeup are one hover/focus
  // away, not printed by default for every field (feedback: that made
  // Configuration overwhelming). See FieldInfoPopover's own doc comment
  // for why it's a floating popup rather than another in-flow reveal.
  const labelText = `${field.label}${"unit" in field && field.unit ? ` (${field.unit})` : ""}`;
  const labelContent = (
    <span className="inline-flex items-center gap-1.5">
      <span>{labelText}</span>
      {locked ? (
        <span
          title="Fixed by this scenario — this is the problem you're designing for, not a lever to solve it with."
          className="inline-flex"
        >
          <Lock
            className="size-3 shrink-0 text-text-subtle"
            aria-label="Fixed by this scenario"
            role="img"
          />
        </span>
      ) : (
        <FieldInfoPopover field={field} entityType={entityType} />
      )}
    </span>
  );

  if (field.type === "select") {
    const currentValue = typeof value === "string" ? value : field.default;
    return (
      <Select
        label={labelContent}
        options={field.options}
        value={currentValue}
        disabled={locked}
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
      label={labelContent}
      type="number"
      min={displayMin}
      max={displayMax}
      step={displayStep}
      value={displayValue}
      disabled={locked}
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
