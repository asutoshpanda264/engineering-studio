/**
 * Turns a finished run's metrics into concrete, actionable suggestions —
 * "Database is rejecting requests, try raising Max Connections" rather
 * than just a red dot. Every suggestion is derived from real
 * entityMetrics (same numbers the Inspector shows), never guessed.
 */

import { getEntityCatalogItem } from "@/lib/entityCatalog";
import type { ArchitectureNode } from "@/store/workshopStore";
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

export function getSuggestions(
  result: SimulationResult,
  nodes: ArchitectureNode[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (result.metrics.totalRequests === 0) {
    return suggestions;
  }

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
