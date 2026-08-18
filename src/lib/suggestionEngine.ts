/**
 * Turns a finished run's metrics into concrete, actionable suggestions —
 * "Database is rejecting requests, try raising Max Connections" rather
 * than just a red dot. Every suggestion is derived from real
 * entityMetrics (same numbers the Inspector shows), never guessed.
 *
 * Root-cause rules (database type / missing cache / missing queue /
 * diagnose-the-bottleneck) reason purely from the live architecture's
 * own shape and config — never from `Scenario` — so they read as real
 * diagnosis in free-play too, not "the game telling you the scenario
 * answer." Each names the underlying concept explicitly (Cache, NoSQL,
 * Message Queue, "check downstream first") rather than only offering a
 * numeric dial to turn, so solving a scenario reads as applying a
 * concept, not just tuning sliders — see docs/wiggly-brewing-lamport's
 * plan for the fuller reasoning.
 */

import { getEntityCatalogItem } from "@/lib/entityCatalog";
import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import type { SimulationResult } from "@/simulation/types";

export type SuggestionSeverity = "critical" | "warning" | "info";

export interface Suggestion {
  severity: SuggestionSeverity;
  entityId?: string;
  title: string;
  description: string;
}

const CAPACITY_FIELD_BY_TYPE: Partial<Record<string, string>> = {
  api: "Max Concurrent",
  database: "Max Connections",
  message_queue: "Consumer Count",
  rate_limiter: "Requests / Second",
};

/** A struggling node: either dropping requests outright, or with little headroom left. Shared threshold for the root-cause rules below, matching the existing "close to capacity"/"dropping requests" branches' own bars. */
function isStruggling(metrics: { errorCount: number; utilization: number }): boolean {
  return metrics.errorCount > 0 || metrics.utilization > 0.85;
}

function directPredecessors(nodeId: string, edges: ArchitectureEdge[], nodes: ArchitectureNode[]): ArchitectureNode[] {
  const predecessorIds = edges.filter((e) => e.target === nodeId).map((e) => e.source);
  return nodes.filter((n) => predecessorIds.includes(n.id));
}

export function getSuggestions(
  result: SimulationResult,
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[] = []
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (result.metrics.totalRequests === 0) {
    return suggestions;
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    if (node.data.entityType === "client") continue;

    const metrics = result.metrics.entityMetrics[node.id];
    if (!metrics) continue;

    // Circuit breaker state is discrete (closed/open/half-open), not a
    // threshold on a percentage — the generic failureRate/utilization
    // branches below don't apply (and would misfire: like rate_limiter,
    // a breaker never emits PROCESSING_STARTED, so requestCount stays 0
    // even while mostly closed and healthy).
    if (node.data.entityType === "circuit_breaker" && metrics.circuitBreaker) {
      if (metrics.circuitBreaker.state === "open") {
        suggestions.push({
          severity: "warning",
          entityId: node.id,
          title: `${node.data.label} is open`,
          description: `${node.data.label} has tripped (${metrics.circuitBreaker.tripCount} time${metrics.circuitBreaker.tripCount === 1 ? "" : "s"} this run) and is failing every request instantly instead of forwarding to its target. That target is likely overwhelmed or failing on its own — look at what's behind ${node.data.label}, not at ${node.data.label} itself.`,
        });
      }
      continue;
    }

    // Rate limiters (and anything else that's an instant gate rather than
    // a queue) never emit PROCESSING_STARTED, so requestCount/utilization
    // stay 0 even while happily admitting most traffic — rejecting some
    // requests is rate_limiter's normal operating behavior, not a crash.
    // Its own admitted/rejected counts are the real "attempts" here.
    const attempts = metrics.rateLimiter
      ? metrics.rateLimiter.admitted + metrics.rateLimiter.rejected
      : metrics.requestCount + metrics.errorCount;
    const failed = metrics.rateLimiter ? metrics.rateLimiter.rejected : metrics.errorCount;
    const failureRate = attempts > 0 ? failed / attempts : 0;
    const capacityField = CAPACITY_FIELD_BY_TYPE[node.data.entityType];
    const name = getEntityCatalogItem(node.data.entityType).name;

    if (failureRate >= 0.9) {
      const raiseHint =
        node.data.entityType === "rate_limiter"
          ? `Raise its ${capacityField}, or reduce the Client's Request Rate.`
          : `Raise its ${capacityField} and Max Queue Length, or reduce the Client's Request Rate.`;
      suggestions.push({
        severity: "critical",
        entityId: node.id,
        title: `${node.data.label} has crashed`,
        description: capacityField
          ? `Almost every request reaching ${name} (${node.data.label}) is being rejected — it's completely overwhelmed. ${raiseHint}`
          : `Almost every request reaching ${node.data.label} is being rejected.`,
      });
    } else if (metrics.errorCount > 0) {
      suggestions.push({
        severity: "warning",
        entityId: node.id,
        title: `${node.data.label} is dropping requests`,
        description: capacityField
          ? `${Math.round(failureRate * 100)}% of requests at ${node.data.label} are failing. Try increasing its ${capacityField}, or add capacity upstream so it receives less traffic.`
          : `${Math.round(failureRate * 100)}% of requests at ${node.data.label} are failing.`,
      });
    } else if (metrics.utilization > 0.85) {
      suggestions.push({
        severity: "info",
        entityId: node.id,
        title: `${node.data.label} is close to capacity`,
        description: capacityField
          ? `${node.data.label} is running at ${Math.round(metrics.utilization * 100)}% utilization. It's keeping up for now, but has little headroom — consider raising its ${capacityField} before traffic grows.`
          : `${node.data.label} is running at ${Math.round(metrics.utilization * 100)}% utilization.`,
      });
    }

    // ---- Root-cause rules: reason about the architecture's own shape/config, not just raw numbers ----

    if (node.data.entityType === "database" && isStruggling(metrics)) {
      const dbType = typeof node.data.config.type === "string" ? node.data.config.type : "sql";
      if (dbType !== "nosql") {
        suggestions.push({
          severity: "info",
          entityId: node.id,
          title: `${node.data.label} is a SQL database under real load`,
          description: `${node.data.label}'s connection ceiling and per-query time are what's limiting it here — not something more Max Connections alone fully buys down. Switching its Database Type to NoSQL applies a real connection-ceiling and query-time multiplier at the same configured settings, often at no extra cost, which may be worth comparing before spending more on raw connections.`,
        });
      }

      const predecessors = directPredecessors(node.id, edges, nodes);
      if (!predecessors.some((p) => p.data.entityType === "cache")) {
        suggestions.push({
          severity: "info",
          entityId: node.id,
          title: `Nothing is caching lookups before they reach ${node.data.label}`,
          description: `If the traffic hitting ${node.data.label} tends to repeat (the same handful of keys asked for over and over), a Cache placed in front of it can absorb those repeat lookups so they never reach the database at all — worth trying if this traffic is skewed toward a small set of hot keys.`,
        });
      }

      if (metrics.errorCount > 0 && !predecessors.some((p) => p.data.entityType === "message_queue")) {
        suggestions.push({
          severity: "info",
          entityId: node.id,
          title: `${node.data.label} is dropping requests it can't immediately admit`,
          description: `A Message Queue placed in front of ${node.data.label} would durably admit each request the instant it arrives — acknowledging the caller right away — and let ${node.data.label} drain the backlog at its own sustained pace instead of rejecting whatever it can't handle the moment it arrives. Worth trying if this traffic comes in bursts rather than a steady rate.`,
        });
      }
    }

    // Deliberately does NOT try to guess which of the two is the "real"
    // bottleneck — a downstream Database's own failures necessarily
    // propagate back through the API in front of it (the API "touched"
    // every request that ultimately failed downstream), so the API's own
    // errorCount/utilization can look elevated for that reason alone,
    // with no capacity problem of its own. Neither `utilization` (this
    // engine measures it as "was ≥1 request in flight," not "how much
    // headroom is left" — see MetricsCollector.ts's `computeUtilization`)
    // nor `errorCount` alone can reliably tell "genuinely constrained"
    // apart from "just inherited a downstream failure" from a single
    // run's aggregate numbers. What IS always safe and useful: naming
    // the diagnostic method itself — isolate one tier at a time — rather
    // than asserting an answer the metrics can't actually prove.
    if (node.data.entityType === "api" && isStruggling(metrics)) {
      const successors = edges.filter((e) => e.source === node.id).map((e) => nodesById.get(e.target));
      const strugglingDownstreamDb = successors.find((s) => {
        if (!s || s.data.entityType !== "database") return false;
        const dbMetrics = result.metrics.entityMetrics[s.id];
        return dbMetrics && isStruggling(dbMetrics);
      });
      if (strugglingDownstreamDb) {
        suggestions.push({
          severity: "info",
          entityId: node.id,
          title: `${node.data.label} and ${strugglingDownstreamDb.data.label} are both showing trouble at once`,
          description: `${node.data.label}'s own numbers can look bad simply because ${strugglingDownstreamDb.data.label} is failing behind it, not because ${node.data.label} itself is short on capacity. Before raising ${node.data.label}, try sizing ${strugglingDownstreamDb.data.label} alone first and see whether that already fixes both — utilization and error counts tell you something is busy, not which tier is the actual ceiling.`,
        });
      }
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      severity: "info",
      title: "This architecture is handling the load well",
      description: `${Math.round(result.metrics.successRate * 100)}% success rate with no component near capacity. Try raising the Client's Request Rate to see where it breaks next.`,
    });
  }

  const severityRank: Record<SuggestionSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return suggestions.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
