import {
  Copy,
  Database,
  Gauge,
  Globe,
  Inbox,
  Layers,
  Route,
  Server,
  ShieldAlert,
  User,
  Waypoints,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EntityType } from "@/simulation/types";

export interface EntityCatalogItem {
  type: EntityType;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Core (Phase 1) vs Modules (Phase 2) — which sidebar section this belongs in. */
  phase: 1 | 2;
  /** Whether the simulation engine actually implements this entity yet — drives the sidebar's disabled/"Soon" state, independent of `phase`. */
  implemented: boolean;
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
