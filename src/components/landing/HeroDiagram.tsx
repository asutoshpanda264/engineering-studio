"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { runSimulation } from "@/simulation/engine/Simulator";
import type { MetricsSnapshot, SimulationConfig } from "@/simulation/types";
import { getEntityCatalogItem } from "@/lib/entityCatalog";

/**
 * The hero's centerpiece: a small fixed Client -> API -> Cache -> Database
 * architecture, always laid out the same way, with two illustrative request
 * paths looping across it (a cache hit, and a cache miss that round-trips
 * to the database).
 *
 * The path animation is schematic, not a literal event replay — it always
 * takes the same route regardless of what actually happened. What's real
 * is the stat readout underneath: those three numbers come from an actual
 * `runSimulation()` call against this exact architecture, executed in the
 * browser on mount, same engine the Workshop runs. We only claim what's
 * true (README/docs/CLAUDE.md differentiator #1 — a real engine, not a
 * scripted animation) about the part that's actually real.
 */

const NODE_ORDER = ["client", "api", "cache", "database"] as const;
type NodeId = (typeof NODE_ORDER)[number];

const POSITION: Record<NodeId, number> = {
  client: 5,
  api: 35,
  cache: 65,
  database: 95,
};

const HIT_PATH: NodeId[] = ["client", "api", "cache", "api", "client"];
const MISS_PATH: NodeId[] = ["client", "api", "cache", "database", "cache", "api", "client"];

function buildConfig(seed: number): SimulationConfig {
  return {
    entities: [
      { id: "client", type: "client", position: { x: 0, y: 0 }, config: { requestRate: 10, keyPoolSize: 6 } },
      { id: "api", type: "api", position: { x: 0, y: 0 }, config: { maxConcurrent: 10, maxQueueLength: 20, processingTimeMs: 4 } },
      { id: "cache", type: "cache", position: { x: 0, y: 0 }, config: { capacity: 6, evictionPolicy: "lru", ttlMs: 0 } },
      { id: "database", type: "database", position: { x: 0, y: 0 }, config: { maxConnections: 10, maxQueueLength: 20, processingTimeMs: 30, failureProbability: 0 } },
    ],
    connections: [
      { source: "client", target: "api", latencyMs: 5 },
      { source: "api", target: "cache", latencyMs: 5 },
      { source: "cache", target: "database", latencyMs: 5 },
    ],
    scenario: {
      id: "landing-hero",
      title: "Landing Hero Preview",
      trafficPattern: { type: "constant", rate: 10 },
      durationMs: 3000,
    },
    options: { seed },
  };
}

function Packet({
  path,
  color,
  duration,
  delay,
}: {
  path: NodeId[];
  color: string;
  duration: number;
  delay: number;
}) {
  const positions = path.map((id) => `${POSITION[id]}%`);
  const times = path.map((_, i) => i / (path.length - 1));
  const opacities = positions.map((_, i) => (i === 0 || i === positions.length - 1 ? 0 : 1));

  return (
    <motion.div
      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_8px_currentColor]"
      style={{ backgroundColor: color, color }}
      animate={{ left: positions, opacity: opacities }}
      transition={{
        duration,
        delay,
        times,
        repeat: Infinity,
        repeatDelay: 0.9,
        ease: "easeInOut",
      }}
    />
  );
}

const NODE_LABELS: Record<NodeId, string> = {
  client: "Client",
  api: "API Server",
  cache: "Cache",
  database: "Database",
};

function NodeCard({ id }: { id: NodeId }) {
  const catalogItem = getEntityCatalogItem(id);
  const Icon = catalogItem.icon;
  return (
    <div
      className="absolute top-1/2 flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 rounded-lg border border-border bg-bg-panel px-2 py-3 shadow-elevated sm:w-28"
      style={{ left: `${POSITION[id]}%` }}
    >
      <Icon className="size-4 text-text-muted" aria-hidden />
      <span className="text-[11px] font-medium text-text">{NODE_LABELS[id]}</span>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-lg font-semibold text-text sm:text-xl">{value}</span>
      <span className="text-[11px] text-text-subtle">{label}</span>
    </div>
  );
}

export function HeroDiagram() {
  const prefersReducedMotion = useReducedMotion();
  // A lazy initializer, not an effect: runSimulation is a pure, seeded,
  // sub-100ms computation with no side effects, so it's safe to run once
  // as part of first render (including SSR) rather than after mount —
  // that also means the stat readout below is never a placeholder flash
  // waiting on a client-only effect.
  const [metrics] = useState<MetricsSnapshot>(() => runSimulation(buildConfig(7)).metrics);

  const cacheHitRate = metrics.entityMetrics.cache?.cacheHitRate;

  return (
    <div className="w-full">
      <div className="relative h-40 w-full sm:h-48">
        <div
          className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-border"
          aria-hidden
        />

        {!prefersReducedMotion && (
          <>
            <Packet path={HIT_PATH} color="var(--color-success)" duration={2.2} delay={0.3} />
            <Packet path={MISS_PATH} color="var(--color-primary)" duration={3.6} delay={1.2} />
          </>
        )}

        {NODE_ORDER.map((id) => (
          <NodeCard key={id} id={id} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-8 border-t border-border pt-6 sm:gap-16">
        <StatTile label="success rate" value={`${(metrics.successRate * 100).toFixed(0)}%`} />
        <StatTile label="avg latency" value={`${metrics.averageLatency.toFixed(0)}ms`} />
        <StatTile
          label="cache hit rate"
          value={cacheHitRate !== undefined ? `${(cacheHitRate * 100).toFixed(0)}%` : "—"}
        />
      </div>
      <p className="mt-3 text-center text-[11px] text-text-subtle">
        Live numbers from a real run of this architecture — computed by Engineering Studio&apos;s
        actual discrete-event simulation engine, in your browser, just now.
      </p>
    </div>
  );
}
