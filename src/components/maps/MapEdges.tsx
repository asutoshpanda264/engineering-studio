import type { FoundationLessonStatus } from "@/lib/foundationsProgress";

/** A node's position in a map's 0–100 percent coordinate space — the shape every domain's own `mapLayout.ts`/`getXMapNodePosition` returns. */
export interface MapEdgeNode {
  slug: string;
  x: number;
  y: number;
}

export interface MapEdge {
  from: MapEdgeNode;
  to: MapEdgeNode;
  /** The *target* (`to`) lesson's status — an edge reads as "healthy" once
      its target is done, "signal" while its target is the next thing to
      do, and dim/dashed while its target is still locked. */
  targetStatus: FoundationLessonStatus;
  /** Whether the target just became reachable *this visit* (`FoundationsMap`'s
      reveal diff) — the one case that gets the draw-in animation. An edge
      whose target was already `available` on a prior visit renders the
      same signal styling but statically, no replay. */
  justUnlocked: boolean;
}

const TONE_STROKE: Record<FoundationLessonStatus, string> = {
  completed: "stroke-status-healthy",
  available: "stroke-signal",
  locked: "stroke-border/70",
};

// Traveled/next-up trails read as more "lit" than a deep-locked one —
// thicker and (for a completed edge) a soft glow, rather than every
// segment carrying the same weight regardless of how real it is yet.
const TONE_WIDTH: Record<FoundationLessonStatus, number> = {
  completed: 2,
  available: 1.5,
  locked: 1,
};

// Which side each curve bows toward — keyed by `"from-slug|to-slug"` (a
// straight lookup, not a formula, so it can encode a real per-edge answer
// rather than a guess). Used to be `i % 2 === 0 ? 1 : -1`, alternating
// by array order for no reason connected to the actual geometry — reliably
// produced curves that bowed straight into an unrelated card as often as
// away from one, which is what read as "paths running under other nodes."
// Every entry here is the side a throwaway script (line-vs-card-rect
// intersection test, every prerequisite edge against every unrelated
// node's box, same discipline `movieTicketBooking.ts`'s own header
// documents for tuning against the real engine — deleted after use) found
// keeps that specific edge's curve clear, given `mapLayout.ts`'s current
// positions. An edge not listed (there shouldn't be one — every
// `prerequisites` pair in the content is covered) falls back to `1`, same
// as the old default direction.
const EDGE_BOW_SIGN: Record<string, 1 | -1> = {
  "what-is-system-design|how-the-internet-works": 1,
  "what-is-system-design|databases-the-big-picture": 1,
  "how-the-internet-works|browser-request-lifecycle": 1,
  "browser-request-lifecycle|client-server-architecture": 1,
  "client-server-architecture|dns-deep-dive": 1,
  "client-server-architecture|http-and-https": 1,
  "http-and-https|rest-apis": 1,
  "databases-the-big-picture|sql-deep-dive": 1,
  "databases-the-big-picture|nosql-deep-dive": 1,
  "sql-deep-dive|database-indexing-deep-dive": 1,
  "nosql-deep-dive|database-indexing-deep-dive": 1,
  "rest-apis|vertical-vs-horizontal-scaling": 1,
  "dns-deep-dive|vertical-vs-horizontal-scaling": -1,
  "database-indexing-deep-dive|vertical-vs-horizontal-scaling": 1,
  "vertical-vs-horizontal-scaling|load-balancers": 1,
  "vertical-vs-horizontal-scaling|caching": 1,
  "vertical-vs-horizontal-scaling|message-queues": 1,
  "caching|redis-deep-dive": -1,
  "message-queues|kafka-deep-dive": 1,
  "load-balancers|cdn": 1,
  "caching|cdn": 1,
  "load-balancers|consistent-hashing": 1,
  "caching|consistent-hashing": 1,
  "consistent-hashing|database-sharding": 1,
  "database-indexing-deep-dive|database-sharding": 1,
  "database-sharding|database-replication": 1,
  "load-balancers|rate-limiting": 1,
  "rate-limiting|circuit-breakers": 1,
  "redis-deep-dive|estimation-and-interview-framework": -1,
  "kafka-deep-dive|estimation-and-interview-framework": -1,
  "cdn|estimation-and-interview-framework": 1,
  "database-replication|estimation-and-interview-framework": 1,
  "circuit-breakers|estimation-and-interview-framework": 1,
};

/**
 * A map's connecting trails — one gently curved segment per edge its
 * caller hands in, drawn behind the node cards in the same 0–100 percent
 * coordinate space every map's own layout positions nodes in. Originally
 * `/foundations`' own (`FoundationsMap`, one segment per
 * `FoundationLesson.prerequisites` edge); now shared with `LLDMap`/
 * `AgenticMap` too, whose edges are purely decorative (one segment per
 * consecutive lesson in course order — see each map's own doc comment,
 * there's no prerequisite DAG on either). A quadratic curve (not
 * `MapPath`/`GraphDiagram`'s straight lines) reads closer to the "winding
 * path across a world map" reference the user pointed at — the control
 * point is offset perpendicular to the segment, scaled to the segment's
 * own length and bowed toward whichever side `EDGE_BOW_SIGN` says clears
 * the map's other cards. `EDGE_BOW_SIGN` itself is tuned against
 * `/foundations`' specific layout only (see its own comment) — an edge
 * not listed there (every edge on the other two maps) falls back to a
 * fixed bow direction, which is fine at their much lower node density.
 * `viewBox="0 0 100 100"` + `preserveAspectRatio="none"` lines this up
 * exactly with each node's own percent-based CSS positioning, same known
 * tradeoff `MapPath` accepts (a non-square container stretches the curve
 * unevenly — not worth a runtime-measured path for a map this size).
 *
 * This component has no status logic of its own — it only ever receives
 * edges its caller has already decided to show, styled by whatever
 * `targetStatus` each one carries. On `/foundations`, a locked lesson's
 * incoming trail is never drawn as an always-visible dim/dashed skeleton
 * of the whole curriculum (reported back as needing to "just show the
 * modules" until they're actually reachable) — in cave mode `FoundationsMap`
 * instead renders a locked edge's `<MapEdges>` call *inside* `CaveShroud`,
 * right alongside its target node, so the same torch mask that reveals the
 * node also reveals a bit of trail leading up to it, and both go dark
 * together the instant the beam moves on. `LLDMap`/`AgenticMap` never
 * produce a `"locked"` edge at all — nothing is gated on either.
 */
export function MapEdges({ edges, cave }: { edges: MapEdge[]; cave?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {edges.map((edge, i) => {
        const { from, to } = edge;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        // Perpendicular unit vector, scaled to the segment's own length —
        // capped higher (18, up from an earlier 6) and scaled more
        // aggressively (0.32, up from 0.18) than a "modest hand-drawn
        // trail" needs on its own, because the map's longest edges skip
        // several tiers at once (e.g. Database Indexing straight through
        // to Database Sharding) and need real room to arc around whatever
        // sits in between, not just a light wobble. Direction comes from
        // `EDGE_BOW_SIGN`, not array order.
        const sign = EDGE_BOW_SIGN[`${from.slug}|${to.slug}`] ?? 1;
        const bow = Math.min(18, len * 0.32) * sign;
        const midX = (from.x + to.x) / 2 + (-dy / len) * bow;
        const midY = (from.y + to.y) / 2 + (dx / len) * bow;
        // Only a trail whose target just became reachable *this visit*
        // fades in (`animate-edge-draw-in`, `globals.css`, delayed to run
        // after `MapNode`'s own "just completed" color transition — see
        // that file). An edge into a lesson that was already `available`
        // last time renders the same signal styling but statically; a
        // `completed` edge (old history) or a `locked`/revealed one
        // (a fast, secondary interaction) never gets this ceremony either.
        return (
          <path
            key={i}
            d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
            fill="none"
            strokeWidth={TONE_WIDTH[edge.targetStatus]}
            strokeLinecap="round"
            strokeDasharray={edge.targetStatus === "locked" ? "3 2.5" : undefined}
            vectorEffect="non-scaling-stroke"
            className={`${TONE_STROKE[edge.targetStatus]} ${edge.justUnlocked ? "animate-edge-draw-in" : ""}`}
            style={
              edge.targetStatus === "completed"
                ? { filter: "drop-shadow(0 0 3px var(--color-status-healthy))" }
                : // In the cave, the "next up" trail glows too, not just travelled
                  // ones — every lit segment reads as light in the dark, same
                  // reasoning as MapNode's own cave-only glow classes.
                  cave && edge.targetStatus === "available"
                  ? { filter: "drop-shadow(0 0 3px var(--color-signal))" }
                  : undefined
            }
          />
        );
      })}
    </svg>
  );
}
