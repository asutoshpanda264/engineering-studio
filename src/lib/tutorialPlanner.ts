import type { EntityType } from "@/simulation/types";
import type { ArchitectureEdge, ArchitectureNode } from "@/store/workshopStore";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import type { TourStep } from "@/components/tour/types";

/**
 * Where each entity typically sits, expressed as the ordered chain from
 * Client to that entity — encodes both "what needs to exist before I make
 * sense" and, for anything that inserts into an existing link rather than
 * extending the chain, "which link I sit inside of." Drawn from each
 * entity's own description in `docs/Entities.md` (Load Balancer "sits in
 * front of multiple downstream servers," Cache "sits in front of...
 * typically a Database," Circuit Breaker guards a struggling dependency,
 * and so on). Deliberately a single canonical path per entity, not a
 * general graph solver — this is a teaching scaffold for "how do I add
 * and wire this one thing," not a scored architecture (that's what
 * `src/scenarios/` is for).
 *
 * Every entity here except Client/API/Database ends in a real simulated
 * `REQUEST_FAILED("no_downstream_connection")` if it has nothing wired
 * downstream of it (`ctx.downstream.length === 0` — see LoadBalancer.ts,
 * Cache.ts, MessageQueue.ts, Kafka.ts, ReplicaPool.ts, RateLimiter.ts,
 * CircuitBreaker.ts, ReverseProxy.ts, CDN.ts). A recipe that ends *on*
 * one of those entities — an earlier version of this table did, for
 * Message Queue, Replica Pool, and Kafka — teaches a walkthrough that
 * finishes with that entity genuinely failing every request it dispatches
 * by construction, not a bug in the tutorial engine. Every entity in this
 * table that has that requirement is placed with something real
 * downstream of it in its own recipe: Load Balancer/CDN/Rate
 * Limiter/Reverse Proxy end in `api`; Cache/Circuit Breaker/Message
 * Queue/Kafka/Replica Pool end in `database` (a queue/log's consumer, or
 * a replica pool's leader, persisting somewhere is exactly the pattern
 * each of those entities models — see each one's own header comment).
 */
export const TUTORIAL_RECIPES: Record<EntityType, EntityType[]> = {
  client: ["client"],
  api: ["client", "api"],
  database: ["client", "api", "database"],
  load_balancer: ["client", "load_balancer", "api"],
  cache: ["client", "api", "cache", "database"],
  cdn: ["client", "cdn", "api"],
  message_queue: ["client", "api", "message_queue", "database"],
  rate_limiter: ["client", "rate_limiter", "api"],
  circuit_breaker: ["client", "api", "circuit_breaker", "database"],
  replica_pool: ["client", "api", "replica_pool", "database"],
  reverse_proxy: ["client", "reverse_proxy", "api"],
  kafka: ["client", "api", "kafka", "database"],
};

/**
 * For targets whose entire teaching point is a *choice* between multiple
 * downstream peers, how many instances of the recipe's very next step to
 * insist on instead of just one. A Load Balancer in front of a single API
 * Server is a real architecture that real teams run — but it can't teach
 * anything: round robin, least connections, weighted round robin, IP hash,
 * and least response time are all indistinguishable with nothing to
 * actually choose between (see LoadBalancer.ts's own header comment, and
 * entityEducation.ts's `load_balancer.learningGoal`: "I don't create
 * capacity ... putting me in front of one overloaded server changes
 * nothing"). Two is the minimum that makes "which server gets this
 * request" a real, observable decision. Replica Pool has the identical
 * shape one link later in its own recipe — `ctx.downstream[0]` is the
 * leader by convention and everything after it is a read replica
 * (ReplicaPool.ts's own header comment), so a single downstream Database
 * makes it a leader with no replicas at all, unable to demonstrate the
 * read/write split that's its entire reason to exist. Absent for every
 * other entity — for a plain chain, a second node of the same type is
 * clutter to remove (see the "extras" pass below), not part of the lesson.
 */
export const TUTORIAL_FAN_OUT: Partial<Record<EntityType, number>> = {
  load_balancer: 2,
  replica_pool: 2,
};

function byTourId(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour-id="${id}"]`);
}

function canvasNodeElement(nodeId: string | undefined): HTMLElement | null {
  if (!nodeId) return null;
  return document.querySelector<HTMLElement>(`.react-flow__node[data-id="${nodeId}"]`);
}

const label = (type: EntityType) => getEntityCatalogItem(type).name;

/** ENTITY_CATALOG descriptions ("Distributes traffic across servers") read as sentence fragments on their own but need a lowercase start once folded into "it {description}". */
function lowercaseFirst(text: string): string {
  return text.length === 0 ? text : text[0].toLowerCase() + text.slice(1);
}

/**
 * True when `type`'s own recipe continues on from `recipe` — i.e. `type`
 * represents further, legitimate progress past this target, not clutter.
 * Picking "API Server" with a Client → API → Database already built
 * shouldn't demand deleting the Database just because the API recipe
 * alone doesn't mention it — that Database is exactly where API's own
 * story goes next (`database`'s recipe is `api`'s recipe plus one more
 * step), not something in the way of it. Only things that *don't* extend
 * this target's chain at all (an unrelated, unconnected Load Balancer
 * while learning API, say) still count as genuinely extraneous.
 */
function extendsRecipe(candidateType: EntityType, recipe: EntityType[]): boolean {
  const candidateRecipe = TUTORIAL_RECIPES[candidateType];
  if (candidateRecipe.length <= recipe.length) return false;
  return recipe.every((type, i) => candidateRecipe[i] === type);
}

export interface PlannerInput {
  target: EntityType;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  selectedNodeId: string | null;
  simulationHasRun: boolean;
  /** Step ids the user has already clicked past on the manual-ack steps (config, results). */
  acknowledgedIds: ReadonlySet<string>;
}

/**
 * The single next thing to do to get from wherever the canvas is right
 * now to a built, wired, run, and read `target`. Recomputed from scratch
 * on every call (cheap — a handful of scans over a small graph), so
 * there's no stored "step index" to desync: pausing and resuming, or a
 * user manually editing the canvas mid-tutorial, just changes what this
 * function returns on the next call. Ends on a terminal `"complete"` step
 * that stays current until its own button is clicked (see TutorialRunner).
 */
export function computeCurrentStep({
  target,
  nodes,
  edges,
  selectedNodeId,
  simulationHasRun,
  acknowledgedIds,
}: PlannerInput): TourStep {
  const recipe = TUTORIAL_RECIPES[target];
  const targetLabel = label(target);
  const chainLabel = recipe.map(label).join(" → ");
  const targetIndex = recipe.indexOf(target);
  const fanOutCount = TUTORIAL_FAN_OUT[target];
  // The type this target fans out into, e.g. load_balancer -> api. Only
  // set when this target actually has a next step to fan out and a
  // configured fan-out count.
  const fanOutType =
    fanOutCount && targetIndex < recipe.length - 1 ? recipe[targetIndex + 1] : null;

  const findByType = (type: EntityType) => nodes.find((n) => n.data.entityType === type);
  const hasEdge = (sourceId: string, targetId: string) =>
    edges.some((e) => e.source === sourceId && e.target === targetId);

  // 1. Clear anything that isn't part of this recipe first — asking
  // someone to both delete extras and wire in new nodes in the same
  // breath is confusing, so this always wins over the build phase below.
  // "Extra" includes a second node of a type the recipe only needs one of
  // — except `fanOutType`, which needs `fanOutCount` of them on purpose.
  const neededTypes = new Set(recipe);
  const seenCount = new Map<EntityType, number>();
  for (const node of nodes) {
    const type = node.data.entityType;
    const allowedCount = type === fanOutType ? fanOutCount! : 1;
    const countSoFar = seenCount.get(type) ?? 0;
    const isExtra =
      (!neededTypes.has(type) && !extendsRecipe(type, recipe)) || countSoFar >= allowedCount;
    if (isExtra) {
      return {
        id: `remove:${node.id}`,
        title: `Remove ${node.data.label}`,
        body: `This walkthrough builds ${chainLabel}. Select ${node.data.label} on the canvas and press Delete to clear it out of the way.`,
        getTarget: () => canvasNodeElement(node.id),
        placement: "right",
      };
    }
    seenCount.set(type, countSoFar + 1);
  }

  // 2. Build the chain, one missing node or missing link at a time. Only
  // the *first* instance of any type — including `fanOutType` — is built
  // here; step 2.5 below tops a fan-out type up to `fanOutCount`.
  let prevType: EntityType | null = null;
  for (const type of recipe) {
    const node = findByType(type);
    if (!node) {
      const catalogItem = getEntityCatalogItem(type);
      return {
        id: `add:${type}`,
        title: `Add ${label(type)}`,
        body:
          type === "client"
            ? "Drag the Client card onto the canvas, or click it — either one places it."
            : `Drag or click ${label(type)} to add it — it ${lowercaseFirst(catalogItem.description)}.`,
        getTarget: () => byTourId(`sidebar-component-${type}`),
        placement: "right",
        requiresComponentsPanel: true,
      };
    }
    if (prevType) {
      const prevNode = findByType(prevType)!;
      if (!hasEdge(prevNode.id, node.id)) {
        return {
          id: `connect:${prevType}->${type}`,
          title: `Connect ${label(prevType)} → ${label(type)}`,
          body: `Drag from the small dot on the right edge of ${label(prevType)} to ${label(type)}.`,
          getTarget: () => canvasNodeElement(prevNode.id),
          placement: "bottom",
        };
      }
    }
    prevType = type;
  }

  // 2.5. Fan out: a target like Load Balancer only teaches anything once
  // there's more than one downstream peer to route between — top up to
  // `fanOutCount` real, directly-connected instances of `fanOutType`
  // before moving on to config/run/results.
  if (fanOutType && fanOutCount) {
    const targetNodeForFanOut = findByType(target)!;
    const fanNodes = nodes.filter((n) => n.data.entityType === fanOutType);
    const connectedFanNodes = fanNodes.filter((n) => hasEdge(targetNodeForFanOut.id, n.id));
    if (connectedFanNodes.length < fanOutCount) {
      const unconnected = fanNodes.find((n) => !hasEdge(targetNodeForFanOut.id, n.id));
      const followLabel = label(fanOutType);
      if (unconnected) {
        return {
          id: `connect-fanout:${target}->${unconnected.id}`,
          title: `Connect ${targetLabel} → ${unconnected.data.label}`,
          body: `Drag from the small dot on the right edge of ${targetLabel} to ${unconnected.data.label} too — every ${followLabel} needs to be reachable from ${targetLabel} for its behavior to actually be visible.`,
          getTarget: () => canvasNodeElement(targetNodeForFanOut.id),
          placement: "bottom",
        };
      }
      return {
        id: `add-fanout:${target}:${connectedFanNodes.length}`,
        title: `Add another ${followLabel}`,
        body: `In production, ${targetLabel} always sits in front of more than one ${followLabel} — with only one, there's nothing behind it to actually spread work across. Drag or click ${followLabel} again to add a second one.`,
        getTarget: () => byTourId(`sidebar-component-${fanOutType}`),
        placement: "right",
        requiresComponentsPanel: true,
      };
    }
  }

  // 3. If the target sits in the middle of its own recipe, a leftover
  // direct link between its neighbors bypasses it entirely — the exact
  // opposite of what this recipe is teaching.
  if (targetIndex > 0 && targetIndex < recipe.length - 1) {
    const beforeType = recipe[targetIndex - 1];
    const afterType = recipe[targetIndex + 1];
    const before = findByType(beforeType)!;
    const after = findByType(afterType)!;
    if (hasEdge(before.id, after.id)) {
      return {
        id: `remove-shortcut:${beforeType}->${afterType}`,
        title: "Remove the old direct link",
        body: `${label(beforeType)} still connects straight to ${label(afterType)}, bypassing ${targetLabel}. Click that connecting line and press Delete — traffic should route through ${targetLabel} now.`,
        getTarget: () => canvasNodeElement(before.id),
        placement: "right",
      };
    }
  }

  const targetNode = findByType(target)!;

  // A single-entity recipe (currently only Client — recipe.length === 1)
  // has nothing downstream to actually simulate: it never appended
  // anything past itself in the build phase above, so "running" it here
  // would just mean every generated request immediately fails with
  // REQUEST_FAILED("no_downstream_connection") — a 0%-success results
  // panel on literally the first tutorial step a student can take,
  // reading as "this is broken" rather than "you haven't built anything
  // yet." Skip run/results for that case and go straight to complete
  // once its config has been read — every multi-entity recipe still gets
  // the full select → config → run → results loop below.
  const hasSomethingToRun = recipe.length > 1;

  // 4. Select → read its config → run → read results → done. Gated on
  // whether a simulation has actually run yet, so idly clicking off the
  // node afterward never re-demands reselecting it.
  if (!simulationHasRun) {
    if (selectedNodeId !== targetNode.id) {
      return {
        id: `select:${target}`,
        title: "Open its settings",
        body: `Click ${targetLabel} to select it and open the Inspector.`,
        getTarget: () => canvasNodeElement(targetNode.id),
        placement: "right",
      };
    }
    if (!acknowledgedIds.has(`config:${target}`)) {
      return {
        id: `config:${target}`,
        title: "Read what each field does",
        body: "Hover the ⓘ next to any field to see exactly what it controls and what raising or lowering it changes.",
        getTarget: () => byTourId("inspector-config"),
        placement: "left",
        primaryLabel: "Got it",
        requiresAck: true,
      };
    }
    if (hasSomethingToRun) {
      return {
        id: "run",
        title: "Run it",
        body: "The architecture is wired up. Run the simulation to see requests actually flow through it.",
        getTarget: () => byTourId("run-simulation"),
        placement: "bottom",
      };
    }
  } else if (hasSomethingToRun && !acknowledgedIds.has("results")) {
    return {
      id: "results",
      title: "Read the results",
      body: "This is a real discrete-event simulation, not a canned animation — latency, throughput, and per-request outcomes computed from your actual architecture. Scrub the timeline or change playback speed to explore it.",
      getTarget: () => byTourId("results-bar"),
      placement: "top",
      primaryLabel: "Continue",
      requiresAck: true,
    };
  }

  return hasSomethingToRun
    ? {
        id: "complete",
        title: `You've built ${targetLabel}`,
        body: "Place a component, connect it, read what its fields do, run the simulation, read what happened — that's the loop for every entity in the sidebar.",
        getTarget: () => null,
        placement: "bottom",
        primaryLabel: "Choose another tutorial",
        requiresAck: true,
      }
    : {
        id: "complete",
        title: `You've built ${targetLabel}`,
        body: `${targetLabel} has nothing downstream yet, so there's nothing to actually run — it would just generate requests with nowhere to go. Add something after it (an API Server, a Load Balancer, ...) and the same loop continues from here: connect, read what it does, run, read what happened.`,
        getTarget: () => null,
        placement: "bottom",
        primaryLabel: "Choose another tutorial",
        requiresAck: true,
      };
}
