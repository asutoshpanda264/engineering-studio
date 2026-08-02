/**
 * Shared type definitions for the scenario system.
 * Zero React/Zustand imports — a Scenario should be evaluable in a unit
 * test the same way the simulation engine is (ADR-001's reasoning applies
 * here too: testability, reuse, a clean boundary). It depends only on the
 * simulation engine's own stable contract (EntityConfig, ConnectionConfig,
 * TrafficPattern, MetricsSnapshot).
 *
 * Per SCENARIOS.md, a scenario is "a business problem, not a technology" —
 * this shape captures the Story, the Starting Point, and the Constraints
 * (its Success Criteria) parts of that document's six-part anatomy.
 * Reflection and mid-run Challenges (traffic spikes, injected failures)
 * are deferred until a scenario actually needs them.
 */

import type {
  ConnectionConfig,
  EntityId,
  EntityType,
  MetricsSnapshot,
  TrafficPattern,
} from "@/simulation/types";

/**
 * One node in a scenario's starting architecture. Same shape the engine
 * already consumes (EntityConfig) plus a display label, since the
 * Workshop needs a name to put on the node — the engine itself doesn't
 * care about labels.
 */
export interface ScenarioEntity {
  id: EntityId;
  type: EntityType;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

/**
 * Metrics a constraint can be checked against. Deliberately a subset of
 * MetricsSnapshot's keys — only the scalar, top-level numbers a success
 * criterion would reasonably threshold against (not entityMetrics, which
 * is per-node and needs a different shape of constraint entirely).
 */
export type ScenarioMetric =
  | "successRate"
  | "averageLatency"
  | "p95Latency"
  | "p99Latency"
  | "throughput"
  | "failedRequests";

export type Comparator = "lt" | "lte" | "gt" | "gte";

/**
 * A single success criterion. Kept as declarative data (metric +
 * comparator + threshold) rather than a predicate closure — per
 * TECHNICAL-SPECIFICATION.md, "configuration should remain declarative,
 * never executable." That also means the Inspector can render every
 * constraint generically ("p95 latency < 300ms: 214ms — pass") without a
 * switch statement per scenario.
 */
export interface ScenarioConstraint {
  id: string;
  metric: ScenarioMetric;
  comparator: Comparator;
  threshold: number;
  label: string;
  unit?: string;
}

export interface Scenario {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** The business problem (SCENARIOS.md §1 — "Story"). Technology-free. */
  story: string;
  /** Intentionally imperfect — users inherit this, they don't design it (SCENARIOS.md §3). */
  startingEntities: ScenarioEntity[];
  startingConnections: ConnectionConfig[];
  trafficPattern: TrafficPattern;
  durationMs: number;
  seed: number;
  /** Success criteria (SCENARIOS.md §2 — "Constraints"). */
  constraints: ScenarioConstraint[];
  /** Socratic questions, never answers (SCENARIOS.md — "Hints"). */
  hints: string[];
  /** What a student should leave understanding (SCENARIOS.md §6). */
  learningGoals: string[];
}

export function readScenarioMetric(
  metrics: MetricsSnapshot,
  metric: ScenarioMetric
): number {
  return metrics[metric];
}
