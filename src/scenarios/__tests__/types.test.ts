/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { resolveReflection } from "../types";
import type { MetricsSnapshot } from "@/simulation/types";

function baseMetrics(overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot {
  return {
    totalRequests: 100,
    successfulRequests: 68,
    failedRequests: 32,
    successRate: 0.686,
    averageLatency: 12.4,
    p50Latency: 10,
    p95Latency: 45.2,
    p99Latency: 60,
    throughput: 99.7,
    entityMetrics: {},
    ...overrides,
  };
}

describe("resolveReflection", () => {
  it("formats successRate as a percentage", () => {
    const result = resolveReflection(
      { template: "success: {{successRate}}" },
      baseMetrics({ successRate: 0.686 })
    );
    expect(result).toBe("success: 68.6%");
  });

  it("formats throughput with req/s", () => {
    const result = resolveReflection(
      { template: "throughput: {{throughput}}" },
      baseMetrics({ throughput: 99.7 })
    );
    expect(result).toBe("throughput: 99.7 req/s");
  });

  it("formats latency metrics rounded, with ms", () => {
    const result = resolveReflection(
      { template: "{{p95Latency}} / {{averageLatency}}" },
      baseMetrics({ p95Latency: 45.6, averageLatency: 12.4 })
    );
    expect(result).toBe("46ms / 12ms");
  });

  it("leaves an unrecognized placeholder untouched rather than throwing", () => {
    const result = resolveReflection(
      { template: "value: {{notARealMetric}}" },
      baseMetrics()
    );
    expect(result).toBe("value: {{notARealMetric}}");
  });

  it("resolves multiple placeholders in one template", () => {
    const result = resolveReflection(
      { template: "{{successRate}} at {{throughput}}, p95 {{p95Latency}}" },
      baseMetrics({ successRate: 0.686, throughput: 99.7, p95Latency: 45.2 })
    );
    expect(result).toBe("68.6% at 99.7 req/s, p95 45ms");
  });
});
