"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCw } from "lucide-react";
import { runSimulation } from "@/simulation/engine/Simulator";
import type { MetricsSnapshot, SimulationConfig } from "@/simulation/types";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getTrackAccent, TRACK_ACCENTS, TRACK_ACCENTS_DARK, type TrackAccentClasses } from "@/components/foundations/trackAccent";

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
 *
 * "Run it again" re-seeds and recomputes that same real simulation on
 * click — the one piece of this hero a static screenshot could never fake,
 * and landing-page feedback specifically wanted the live demo to *read* as
 * alive rather than sit at the same visual weight as everything else on
 * the page. Each `StatTile` gets its own `trackAccent` color (the same
 * five-hue palette `/learn` and `/problems` use) so the three numbers are
 * visually distinct at a glance, and its value cross-fades in when the
 * seed changes rather than jumping instantly.
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
      className="absolute top-1/2 flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 border border-border bg-bg-panel px-2 py-3 shadow-elevated sm:w-28"
      style={{ left: `${POSITION[id]}%` }}
    >
      <Icon className="size-4 text-text-muted" aria-hidden />
      <span className="text-[11px] font-medium text-text">{NODE_LABELS[id]}</span>
    </div>
  );
}

/**
 * One colored readout — `accent` is a `trackAccent` entry rather than a
 * plain gray, so the three metrics are distinguishable at a glance instead
 * of reading as one undifferentiated gray block (this hero used to be the
 * only spot on the page with three numbers all in the exact same color).
 * The value cross-fades on change (keyed by its own text, so identical
 * consecutive re-runs don't replay the transition) rather than snapping
 * instantly — the one visible cue, alongside the "Run it again" button
 * itself, that this number is live rather than a static label.
 */
function StatTile({ label, value, accent, prefersReducedMotion }: { label: string; value: string; accent: TrackAccentClasses; prefersReducedMotion: boolean | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-lg font-semibold text-text sm:text-xl">
        {prefersReducedMotion ? (
          value
        ) : (
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="inline-block"
          >
            {value}
          </motion.span>
        )}
      </span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] ${accent.soft} ${accent.text}`}>{label}</span>
    </div>
  );
}

export function HeroDiagram() {
  const prefersReducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const accentTable = theme === "light" ? TRACK_ACCENTS : TRACK_ACCENTS_DARK;

  // The simulation seed is state (not a one-time lazy initializer) so
  // "Run it again" can recompute it — still a pure, seeded, sub-100ms
  // computation with no side effects, so deriving `metrics` from it via
  // `useMemo` (rather than an effect) keeps the first paint's numbers
  // real rather than a placeholder waiting on a client-only effect,
  // exactly like the lazy-`useState` version this replaces.
  const [seed, setSeed] = useState(7);
  const metrics = useMemo<MetricsSnapshot>(() => runSimulation(buildConfig(seed)).metrics, [seed]);

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
            <Packet path={HIT_PATH} color="var(--color-status-healthy)" duration={2.2} delay={0.3} />
            <Packet path={MISS_PATH} color="var(--color-signal)" duration={3.6} delay={1.2} />
          </>
        )}

        {NODE_ORDER.map((id) => (
          <NodeCard key={id} id={id} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center gap-8 border-t border-border pt-6 sm:gap-16">
        <StatTile
          label="success rate"
          value={`${(metrics.successRate * 100).toFixed(0)}%`}
          accent={accentTable[getTrackAccent(0)]}
          prefersReducedMotion={prefersReducedMotion}
        />
        <StatTile
          label="avg latency"
          value={`${metrics.averageLatency.toFixed(0)}ms`}
          accent={accentTable[getTrackAccent(1)]}
          prefersReducedMotion={prefersReducedMotion}
        />
        <StatTile
          label="cache hit rate"
          value={cacheHitRate !== undefined ? `${(cacheHitRate * 100).toFixed(0)}%` : "—"}
          accent={accentTable[getTrackAccent(2)]}
          prefersReducedMotion={prefersReducedMotion}
        />
      </div>
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-center text-[11px] text-text-subtle">
          Live numbers from a real run of this architecture — computed by Engineering Studio&apos;s
          actual discrete-event simulation engine, in your browser, just now.
        </p>
        <button
          type="button"
          onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
          className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
        >
          <RotateCw className="size-3.5 transition-transform duration-slow ease-standard group-active:-rotate-180" aria-hidden />
          Run it again
        </button>
      </div>
    </div>
  );
}
