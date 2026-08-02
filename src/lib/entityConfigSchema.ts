/**
 * Declarative config fields per entity type, for the Inspector panel.
 * Adding a new tunable knob to an entity is a new row here, not new JSX —
 * the Inspector renders whatever this table says an entity type has.
 *
 * Field keys match the config properties the entities themselves read
 * (see APIServerConfig / DatabaseConfig) — keep them in sync. The one
 * exception is Client's requestRate: the Client entity itself doesn't
 * generate its own traffic (see Client.ts), so workshopBridge reads this
 * field and feeds it into the scenario's traffic pattern instead.
 */

import type { EntityType } from "@/simulation/types";

interface BaseFieldSchema {
  key: string;
  label: string;
  /** Abbreviated label for the compact summary shown directly on the node card. */
  shortLabel: string;
  description: string;
}

export interface NumericFieldSchema extends BaseFieldSchema {
  /** "percent" fields are stored as 0-1 but edited as 0-100. */
  type: "number" | "percent";
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface SelectFieldSchema extends BaseFieldSchema {
  type: "select";
  options: { value: string; label: string }[];
  default: string;
}

export type ConfigFieldSchema = NumericFieldSchema | SelectFieldSchema;

export const ENTITY_CONFIG_SCHEMA: Partial<Record<EntityType, ConfigFieldSchema[]>> = {
  client: [
    {
      key: "requestRate",
      label: "Request Rate",
      shortLabel: "rate",
      type: "number",
      min: 0,
      max: 1000,
      step: 1,
      default: 20,
      unit: "req/s",
      description: "How many requests per second this client generates.",
    },
    {
      key: "keyPoolSize",
      label: "Key Pool Size",
      shortLabel: "keys",
      type: "number",
      min: 1,
      max: 100_000,
      step: 1,
      default: 50,
      description:
        "How many distinct resources exist. Small pool = requests repeat a lot (a Cache can help). Large pool = requests are mostly unique (a Cache can't).",
    },
  ],
  api: [
    {
      key: "maxConcurrent",
      label: "Max Concurrent",
      shortLabel: "max",
      type: "number",
      min: 1,
      max: 50,
      step: 1,
      default: 10,
      description: "Requests this server can process at the same time.",
    },
    {
      key: "maxQueueLength",
      label: "Max Queue Length",
      shortLabel: "queue",
      type: "number",
      min: 0,
      max: 200,
      step: 1,
      default: 50,
      description: "Requests allowed to wait once at capacity, before being rejected.",
    },
    {
      key: "processingTimeMs",
      label: "Processing Time",
      shortLabel: "proc",
      type: "number",
      min: 1,
      max: 200,
      step: 1,
      default: 5,
      unit: "ms",
      description: "Time spent handling business logic per request.",
    },
  ],
  database: [
    {
      key: "maxConnections",
      label: "Max Connections",
      shortLabel: "conn",
      type: "number",
      min: 1,
      max: 50,
      step: 1,
      default: 5,
      description: "Queries the connection pool can run at the same time.",
    },
    {
      key: "maxQueueLength",
      label: "Max Queue Length",
      shortLabel: "queue",
      type: "number",
      min: 0,
      max: 500,
      step: 1,
      default: 100,
      description: "Queries allowed to wait once at capacity, before being rejected.",
    },
    {
      key: "processingTimeMs",
      label: "Processing Time",
      shortLabel: "query",
      type: "number",
      min: 1,
      max: 300,
      step: 1,
      default: 15,
      unit: "ms",
      description: "Time spent executing a single query.",
    },
    {
      key: "failureProbability",
      label: "Failure Probability",
      shortLabel: "fail",
      type: "percent",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0,
      unit: "%",
      description: "Chance a query fails independently of load.",
    },
  ],
  cache: [
    {
      key: "capacity",
      label: "Capacity",
      shortLabel: "cap",
      type: "number",
      min: 1,
      max: 500,
      step: 1,
      default: 20,
      unit: "keys",
      description:
        "How many distinct keys the cache can hold before it must evict one to make room.",
    },
    {
      key: "evictionPolicy",
      label: "Eviction Policy",
      shortLabel: "evict",
      type: "select",
      default: "lru",
      options: [
        { value: "lru", label: "LRU — Least Recently Used" },
        { value: "lfu", label: "LFU — Least Frequently Used" },
        { value: "fifo", label: "FIFO — First In, First Out" },
        { value: "mru", label: "MRU — Most Recently Used" },
      ],
      description: "Which entry to remove when a new key arrives at capacity.",
    },
    {
      key: "ttlMs",
      label: "TTL",
      shortLabel: "ttl",
      type: "number",
      min: 0,
      max: 60_000,
      step: 100,
      default: 0,
      unit: "ms",
      description:
        "How long an entry stays valid after being stored. 0 = never expires on its own (only eviction removes it).",
    },
  ],
  cdn: [
    {
      key: "edgeCount",
      label: "Edge Count",
      shortLabel: "edges",
      type: "number",
      min: 1,
      max: 20,
      step: 1,
      default: 5,
      description:
        "How many geographically distributed edges the CDN operates. More edges spread traffic thinner across independent caches.",
    },
    {
      key: "minEdgeLatencyMs",
      label: "Min Edge Latency",
      shortLabel: "near",
      type: "number",
      min: 0,
      max: 500,
      step: 1,
      default: 1,
      unit: "ms",
      description: "One-way latency to the nearest edge.",
    },
    {
      key: "maxEdgeLatencyMs",
      label: "Max Edge Latency",
      shortLabel: "far",
      type: "number",
      min: 0,
      max: 500,
      step: 1,
      default: 6,
      unit: "ms",
      description: "One-way latency to the farthest edge.",
    },
    {
      key: "capacity",
      label: "Capacity (per edge)",
      shortLabel: "cap",
      type: "number",
      min: 1,
      max: 500,
      step: 1,
      default: 20,
      unit: "keys",
      description: "How many distinct keys each edge can hold before it must evict one.",
    },
    {
      key: "evictionPolicy",
      label: "Eviction Policy",
      shortLabel: "evict",
      type: "select",
      default: "lru",
      options: [
        { value: "lru", label: "LRU — Least Recently Used" },
        { value: "lfu", label: "LFU — Least Frequently Used" },
        { value: "fifo", label: "FIFO — First In, First Out" },
        { value: "mru", label: "MRU — Most Recently Used" },
      ],
      description: "Which entry an edge removes when a new key arrives at its capacity.",
    },
    {
      key: "ttlMs",
      label: "TTL",
      shortLabel: "ttl",
      type: "number",
      min: 0,
      max: 60_000,
      step: 100,
      default: 0,
      unit: "ms",
      description: "How long an entry stays valid at an edge. 0 = never expires on its own.",
    },
  ],
};
