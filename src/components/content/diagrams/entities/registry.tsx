import type { ComponentType } from "react";
import type { EntityType } from "@/simulation/types";
import { RateLimiterTokenBucketDiagram } from "./RateLimiterTokenBucketDiagram";
import { CircuitBreakerStateMachineDiagram } from "./CircuitBreakerStateMachineDiagram";

/**
 * Animated "how it works" mechanism diagrams for `/entities/[slug]` — one
 * flagship diagram per entity, added only where the entity actually has a
 * causal chain worth animating (a real algorithm/state machine acting over
 * time), not decorative motion on every entity for its own sake. An entity
 * absent from this map simply gets no "How it works" section at all —
 * `EntityDeepDivePage` renders that section (and its ToC entry) only when
 * a component exists here, rather than showing a placeholder.
 *
 * Grows one entry at a time — see the conversation this shipped from for
 * the shortlist (Circuit Breaker, Load Balancer, Cache, CDN, Message
 * Queue/Kafka, Replica Pool) and why entities like Client/API
 * Server/Database/Reverse Proxy were left off it.
 */
export const ENTITY_MECHANISM_REGISTRY: Partial<Record<EntityType, ComponentType>> = {
  rate_limiter: RateLimiterTokenBucketDiagram,
  circuit_breaker: CircuitBreakerStateMachineDiagram,
};
