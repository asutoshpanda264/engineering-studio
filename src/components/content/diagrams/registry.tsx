import type { ComponentType } from "react";
import { DnsHierarchyDiagram } from "./DnsHierarchyDiagram";
import { DnsResolutionFlowDiagram } from "./DnsResolutionFlowDiagram";
import { DnsRecursiveLookupDiagram } from "./DnsRecursiveLookupDiagram";
import { DnsFailoverDiagram } from "./DnsFailoverDiagram";
import { MqDeadLetterQueueDiagram } from "./MqDeadLetterQueueDiagram";

/**
 * Every real SVG figure a `LessonBlock` of kind `"figure"` can point to,
 * keyed by id. Lesson content (`src/content/**\/lessons/*.ts`) stays plain
 * data — it references a diagram by this id string rather than importing
 * JSX — and `DiagramId` (derived from these keys) gives content authors
 * autocomplete plus a compile error on a typo'd id, no separate runtime
 * check needed.
 *
 * One file per diagram under this directory, added here as it's built.
 * Grows alongside the content it illustrates — nothing here is generic
 * across modules, unlike `primitives.tsx`.
 */
export const DIAGRAM_REGISTRY = {
  "dns-hierarchy": DnsHierarchyDiagram,
  "dns-resolution-flow": DnsResolutionFlowDiagram,
  "dns-recursive-lookup": DnsRecursiveLookupDiagram,
  "dns-failover": DnsFailoverDiagram,
  "mq-dead-letter-queue": MqDeadLetterQueueDiagram,
} satisfies Record<string, ComponentType>;

export type DiagramId = keyof typeof DIAGRAM_REGISTRY;
