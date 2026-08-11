/**
 * Small pure helpers over `Scenario.givenNodeIds`/`lockedFields` — shared
 * between `workshopStore.ts` (which must actually *enforce* the lock: no
 * deleting a given node, no writing a locked config key) and
 * `InspectorPanel.tsx`/`ComponentNode.tsx` (which only need to know whether
 * to render something as locked). Kept out of `src/scenarios/` itself since
 * that module is deliberately framework-independent and these take a raw
 * node id, not a typed domain concept the scenario layer should know about.
 */

import type { EntityId } from "@/simulation/types";
import type { Scenario } from "@/scenarios/types";

export function isGivenNode(
  scenario: Scenario | undefined,
  nodeId: EntityId
): boolean {
  return scenario?.givenNodeIds?.includes(nodeId) ?? false;
}

export function lockedFieldsForNode(
  scenario: Scenario | undefined,
  nodeId: EntityId
): string[] {
  return scenario?.lockedFields?.[nodeId] ?? [];
}

export function isFieldLocked(
  scenario: Scenario | undefined,
  nodeId: EntityId,
  fieldKey: string
): boolean {
  return lockedFieldsForNode(scenario, nodeId).includes(fieldKey);
}
