import {
  Brain,
  Copy,
  Database,
  Gauge,
  Globe,
  History,
  Inbox,
  Layers,
  Route,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Split,
  User,
  UserCheck,
  Waypoints,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EntityType } from "@/simulation/types";

export interface EntityCatalogItem {
  type: EntityType;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Core (Phase 1) vs Modules (Phase 2) — which sidebar section this belongs in, for the `hld` domain. Unused (but still required) when `domain` is set — see `domain`'s own comment. */
  phase: 1 | 2;
  /** Whether the simulation engine actually implements this entity yet — drives the sidebar's disabled/"Soon" state, independent of `phase`. */
  implemented: boolean;
  /**
   * Which sandbox this entity belongs to. Undefined means the original
   * HLD/distributed-systems domain, grouped by `phase` (Core/Modules) —
   * every entity before this field existed stays that way, unchanged.
   * `"agentic"` is `docs/Agentic_AI.md`'s new primitive set (`llm_call`,
   * `tool_call`, ...) — a genuinely different sandbox per
   * `docs/Expansion_TODO.md`'s pillar-per-domain plan, so it gets its own
   * Component Library section instead of being folded into "Modules"
   * alongside Cache/CDN/etc., which would blur two unrelated curricula
   * into one list.
   */
  domain?: "agentic";
}

/**
 * Single source of truth for entity metadata — consumed by the Component
 * Library (sidebar) and by the workshop store when labeling new nodes.
 */
export const ENTITY_CATALOG: EntityCatalogItem[] = [
  {
    type: "client",
    name: "Client",
    description: "Where requests originate",
    icon: User,
    phase: 1,
    implemented: true,
  },
  {
    type: "api",
    name: "API Server",
    description: "Processes business logic",
    icon: Server,
    phase: 1,
    implemented: true,
  },
  {
    type: "database",
    name: "Database",
    description: "Persists application state",
    icon: Database,
    phase: 1,
    implemented: true,
  },
  {
    type: "load_balancer",
    name: "Load Balancer",
    description: "Distributes traffic across servers",
    icon: Waypoints,
    phase: 2,
    implemented: true,
  },
  {
    type: "cache",
    name: "Cache",
    description: "Serves hot data without hitting storage",
    icon: Zap,
    phase: 2,
    implemented: true,
  },
  {
    type: "cdn",
    name: "CDN",
    description: "Caches content at the network edge",
    icon: Globe,
    phase: 2,
    implemented: true,
  },
  {
    type: "message_queue",
    name: "Message Queue",
    description: "Decouples producers from consumers",
    icon: Inbox,
    phase: 2,
    implemented: true,
  },
  {
    type: "rate_limiter",
    name: "Rate Limiter",
    description: "Caps request rate, rejecting bursts beyond it",
    icon: Gauge,
    phase: 2,
    implemented: true,
  },
  {
    type: "circuit_breaker",
    name: "Circuit Breaker",
    description: "Fails fast instead of hammering a struggling dependency",
    icon: ShieldAlert,
    phase: 2,
    implemented: true,
  },
  {
    type: "replica_pool",
    name: "Replica Pool",
    description: "Scales reads across replicas, writes go to one leader",
    icon: Copy,
    phase: 2,
    implemented: true,
  },
  {
    type: "reverse_proxy",
    name: "Reverse Proxy",
    description: "Routes different request types to different services",
    icon: Route,
    phase: 2,
    implemented: true,
  },
  {
    type: "kafka",
    name: "Kafka",
    description: "Partitioned log — independent consumer groups replay it",
    icon: Layers,
    phase: 2,
    implemented: true,
  },
  {
    type: "llm_call",
    name: "LLM Call",
    description: "The reasoning/generation step every agent pattern is built from",
    icon: Brain,
    phase: 2,
    implemented: true,
    domain: "agentic",
  },
  {
    type: "tool_call",
    name: "Tool Call",
    description: "An external action — a function, an API, an MCP tool",
    icon: Wrench,
    phase: 2,
    implemented: true,
    domain: "agentic",
  },
  {
    type: "agent_orchestrator",
    name: "Agent Orchestrator",
    description: "Routes, plans, and loops — owns the iteration cap",
    icon: Workflow,
    phase: 2,
    implemented: true,
    domain: "agentic",
  },
  {
    type: "memory_context_store",
    name: "Memory / Context Store",
    description: "The context window — what survives once it fills up",
    icon: History,
    phase: 2,
    implemented: true,
    domain: "agentic",
  },
  {
    type: "retriever",
    name: "Retriever",
    description: "Knowledge lookup — Pipeline, Agentic, GraphRAG, or Adaptive",
    icon: Search,
    phase: 2,
    implemented: true,
    domain: "agentic",
  },
  {
    type: "guardrail_validator",
    name: "Guardrail Validator",
    description: "Inline check or scorer — completes Reflection and Evaluator-Optimizer",
    icon: ShieldCheck,
    phase: 2,
    implemented: true,
    domain: "agentic",
  },
  {
    type: "model_router",
    name: "Model Router",
    description: "The SLM/LLM cascade — routes each request to the cheapest tier that can answer",
    icon: Split,
    phase: 2,
    implemented: true,
    domain: "agentic",
  },
  {
    type: "human_in_loop_gate",
    name: "Human-in-the-Loop Gate",
    description: "Approval branch + latency injection before an irreversible action",
    icon: UserCheck,
    phase: 2,
    implemented: true,
    domain: "agentic",
  },
];

const ENTITY_CATALOG_BY_TYPE = new Map(
  ENTITY_CATALOG.map((item) => [item.type, item])
);

export function getEntityCatalogItem(type: EntityType): EntityCatalogItem {
  const item = ENTITY_CATALOG_BY_TYPE.get(type);
  if (!item) {
    throw new Error(`Unknown entity type: ${type}`);
  }
  return item;
}

/**
 * Identifies which of the Workshop's two Component Library packs an entity
 * belongs to — the two sandboxes `ComponentSidebar.tsx` and `WeaponWheel.tsx`
 * render as separate panels/dials, and that `workshopStore.openComponentPack`
 * tracks as mutually exclusive (same shape as `tracePanelOpen`/
 * `reliabilityPanelOpen`). `"distributed"` covers every item with no
 * `domain` (the original HLD catalog); `"ai-flow"` is `domain: "agentic"`.
 */
export type ComponentPackId = "distributed" | "ai-flow";

export function packIdForItem(item: EntityCatalogItem): ComponentPackId {
  return item.domain === "agentic" ? "ai-flow" : "distributed";
}
