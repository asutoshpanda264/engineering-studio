/**
 * Runs the simplest possible architecture — Client -> API -> Database —
 * through the simulation engine and prints the result.
 *
 * This is the "does the engine actually work" check: no UI, no React,
 * just the pure simulation pipeline (SimulationConfig -> SimulationResult).
 *
 * Run with: npm run sim:example
 */

import { runSimulation } from "../engine/Simulator";
import type { SimulationConfig } from "../types";

const config: SimulationConfig = {
  entities: [
    { id: "client1", type: "client", position: { x: 0, y: 0 }, config: {} },
    { id: "api1", type: "api", position: { x: 0, y: 0 }, config: {} },
    { id: "db1", type: "database", position: { x: 0, y: 0 }, config: {} },
  ],
  connections: [
    { source: "client1", target: "api1", latencyMs: 5 },
    { source: "api1", target: "db1", latencyMs: 2 },
  ],
  scenario: {
    id: "movie-booking-basic",
    title: "Movie Booking — Basic",
    trafficPattern: { type: "constant", rate: 50 },
    durationMs: 5000,
  },
  options: { seed: 42 },
};

const result = runSimulation(config);

console.log("=== Engineering Studio — Simulation Result ===\n");

console.log("Metrics");
console.log("-------");
console.log(`Total requests:      ${result.metrics.totalRequests}`);
console.log(`Successful:          ${result.metrics.successfulRequests}`);
console.log(`Failed:              ${result.metrics.failedRequests}`);
console.log(
  `Success rate:        ${(result.metrics.successRate * 100).toFixed(1)}%`
);
console.log(
  `Average latency:     ${result.metrics.averageLatency.toFixed(1)} ms`
);
console.log(`p50 latency:         ${result.metrics.p50Latency} ms`);
console.log(`p95 latency:         ${result.metrics.p95Latency} ms`);
console.log(`p99 latency:         ${result.metrics.p99Latency} ms`);
console.log(`Throughput:          ${result.metrics.throughput.toFixed(1)} req/s`);
console.log(`Simulated duration:  ${result.duration} ms\n`);

console.log("Entity utilization");
console.log("------------------");
for (const [id, m] of Object.entries(result.metrics.entityMetrics)) {
  console.log(
    `${id.padEnd(10)} utilization=${(m.utilization * 100).toFixed(1)}%  requests=${m.requestCount}  errors=${m.errorCount}`
  );
}

if (result.warnings.length > 0) {
  console.log("\nWarnings");
  console.log("--------");
  result.warnings.forEach((w) => console.log(`- ${w}`));
}

console.log(`\nFirst 20 events of ${result.events.length} total:`);
console.log("---------------------------------------------");
for (const event of result.events.slice(0, 20)) {
  const from = event.source ?? "-";
  const to = event.destination ?? "-";
  console.log(
    `${String(event.timestamp).padStart(6)}ms  ${event.type.padEnd(20)} ${from} -> ${to}  (${event.requestId ?? "-"})`
  );
}
