import type { ReactNode } from "react";

/**
 * One small abstract technical diagram per Foundations lesson — the
 * `FoundationsAtlas` view's "visual metaphor" (see that file's doc
 * comment). Deliberately line-art, not icon-set glyphs: plain strokes on
 * `currentColor` so a card's existing text-color classes (`text-text-subtle`
 * at rest, `text-signal` for the current lesson) tint the glyph for free,
 * no separate color prop to keep in sync. Each one is a reduction of the
 * lesson's actual diagram (the request/response arrows a HTTP lesson
 * already draws, the ring a consistent-hashing lesson already draws) to
 * a handful of paths — never a generic "book" or "gear" stock icon, which
 * would carry no information about which lesson it sits on.
 *
 * Keyed by `FoundationLesson.number` (stable across content edits, unlike
 * an array index) rather than slug — a plain `Record` would need every
 * slug kept in sync by hand in two files; number already is the lesson's
 * identity for ordering/prev-next elsewhere in this module. Two closely
 * related lessons (HTTP/REST, Caching/Redis) deliberately get variants of
 * the same base shape rather than unrelated ones — the family
 * resemblance is real, not a coincidence of running low on ideas.
 */

const VIEW_BOX = "0 0 28 28";

function Glyph({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox={VIEW_BOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

// 01 — What is System Design: a small graph, no particular direction —
// the discipline itself, before any one concept (client/server, DNS, ...)
// has been named yet.
function NodesCluster({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx={14} cy={7} r={2.1} />
      <circle cx={6} cy={19} r={2.1} />
      <circle cx={22} cy={19} r={2.1} />
      <circle cx={14} cy={16} r={1.6} />
      <path d="M14 9v5M12.5 17l-5 1.4M15.5 17l5 1.4M8 18l4-1.5M20 18l-4-1.5" />
    </Glyph>
  );
}

// 02 — How the Internet Works: a chain of hops, device to cloud.
function NetworkPaths({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={3} y={12} width={4} height={4} />
      <circle cx={13} cy={14} r={2} />
      <rect x={19} y={6} width={4} height={4} />
      <rect x={19} y={18} width={4} height={4} />
      <path d="M7 14h4M15 14l4-6M15 14l4 6" />
    </Glyph>
  );
}

// 03 — Browser Request Lifecycle: a round trip, out and back.
function RequestFlow({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={3} y={5} width={6} height={5} />
      <rect x={19} y={18} width={6} height={5} />
      <path d="M9 8h13a2 2 0 0 1 2 2v3" />
      <path d="M4 20V10a2 2 0 0 1 2-2" />
      <path d="M22 15l2 3-3 1" />
    </Glyph>
  );
}

// 04 — Client-Server Architecture: two peers, a request line each way.
function ClientServer({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={2.5} y={9.5} width={8} height={9} />
      <rect x={17.5} y={9.5} width={8} height={9} />
      <path d="M10.5 12h7M17.5 16h-7" />
      <path d="M15.5 12l2-2M12.5 16l-2 2" />
    </Glyph>
  );
}

// 05 — DNS Deep Dive: a name resolving to an address.
function AddressResolution({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={2.5} y={9} width={9} height={9} />
      <path d="M6 12.2v3.2M9 12.2v3.2" strokeWidth={1.1} />
      <path d="M12.5 13.5h7" />
      <path d="M17 10.5l3 3-3 3" />
      <path d="M22 20.5v2.3a1 1 0 0 1-1 1h-1" strokeDasharray="0.1 3" strokeWidth={1.1} />
    </Glyph>
  );
}

// 06 — HTTP & HTTPS: request out, response back.
function RequestResponse({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={2.5} y={4} width={6} height={5} />
      <rect x={19.5} y={19} width={6} height={5} />
      <path d="M9 7.5h11a2.5 2.5 0 0 1 2.5 2.5v9" />
      <path d="M22 15l2.5 4" />
      <path d="M19 21.5H8a2.5 2.5 0 0 1-2.5-2.5v-9" />
      <path d="M6 6l-2.5-4" />
    </Glyph>
  );
}

// 07 — REST APIs: two systems agreeing on a shape.
function ApiContract({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={2.5} y={9.5} width={7} height={9} />
      <rect x={18.5} y={9.5} width={7} height={9} />
      <path d="M11 12.5c2-1.4 4-1.4 6 0M11 15.5c2-1.4 4-1.4 6 0" strokeWidth={1.1} />
      <path d="M9.5 14h9" strokeDasharray="0.1 2.4" />
    </Glyph>
  );
}

// 08 — Databases, the Big Picture: rows of state, stacked.
function DataStorage({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <ellipse cx={14} cy={6.5} rx={9} ry={3} />
      <path d="M5 6.5v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
      <path d="M5 12.5v6c0 1.7 4 3 9 3s9-1.3 9-3v-6" />
    </Glyph>
  );
}

// 09 — SQL Deep Dive: rows and columns, joined by a key.
function RelationalGrid({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={3} y={4} width={11} height={8} />
      <path d="M3 8h11M8 4v8" strokeWidth={1.1} />
      <rect x={16} y={16} width={9} height={8} />
      <path d="M16 20h9" strokeWidth={1.1} />
      <path d="M9 12v3a2 2 0 0 0 2 2h5" strokeDasharray="0.1 2.6" />
    </Glyph>
  );
}

// 10 — NoSQL Deep Dive: shapes that don't share a schema.
function DocumentNodes({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M4 6c0-1.4 1.6-2.4 4-2.4S12 4.6 12 6v6c0 1.4-1.6 2.4-4 2.4S4 13.4 4 12z" />
      <rect x={15} y={5} width={8} height={7} />
      <path d="M6 18c3-1.4 6-1.4 9 0s6 1.4 9 0" />
    </Glyph>
  );
}

// 11 — Database Indexing: a tree that skips straight to a leaf.
function IndexTree({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx={14} cy={5} r={2} />
      <circle cx={7} cy={14} r={2} />
      <circle cx={21} cy={14} r={2} />
      <circle cx={3.5} cy={23} r={1.6} />
      <circle cx={10.5} cy={23} r={1.6} />
      <path d="M14 7v3M12.6 12.6l-4 0M15.4 12.6l4 0M7 16v3M5.5 21l-2 0M8.5 21l2 0" />
    </Glyph>
  );
}

// 12 — Vertical vs Horizontal Scaling: one box growing up, or copying sideways.
function ScaleArrows({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={3} y={16} width={7} height={7} />
      <path d="M6.5 16V6M4.5 9l2-3 2 3" />
      <rect x={15} y={19} width={4.5} height={4} />
      <rect x={21} y={19} width={4.5} height={4} />
      <path d="M19.5 21h1.5" strokeDasharray="0.1 1.6" />
    </Glyph>
  );
}

// 13 — Load Balancers: one entry, spread across several.
function DistributeArrows({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx={14} cy={5} r={2.2} />
      <rect x={2.5} y={19} width={5} height={5} />
      <rect x={11.5} y={19} width={5} height={5} />
      <rect x={20.5} y={19} width={5} height={5} />
      <path d="M14 7.2V13M14 13L5 19M14 13v6M14 13l9 6" />
    </Glyph>
  );
}

// 14 — Caching: a thin fast layer sitting in front of the slow one.
function LayeredCache({ className, accent }: { className?: string; accent?: boolean }) {
  return (
    <Glyph className={className}>
      <rect x={3} y={4} width={22} height={5} />
      {accent && <path d="M14 4.5v4" strokeWidth={1.1} />}
      <rect x={3} y={13} width={22} height={10} />
      <path d="M14 9l-2.5 4h5L14 17" />
    </Glyph>
  );
}

// 15 — Redis Deep Dive: the same cache shape, one specific implementation.
function CacheImplementation({ className }: { className?: string }) {
  return <LayeredCache className={className} accent />;
}

// 16 — Message Queues: work waiting in a line.
function QueueLane({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={2.5} y={10} width={20} height={8} />
      <path d="M8.5 10v8M14.5 10v8M20.5 10v8" strokeWidth={1.1} />
      <path d="M22.5 14h4M23.5 12l2.5 2-2.5 2" />
    </Glyph>
  );
}

// 17 — Kafka Deep Dive: several queues in parallel, each its own partition.
function QueueLanesMulti({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={2} y={4} width={17} height={4.6} />
      <rect x={2} y={11.7} width={17} height={4.6} />
      <rect x={2} y={19.4} width={17} height={4.6} />
      <path d="M6 4v4.6M11 4v4.6M6 11.7v4.6M11 11.7v4.6M6 19.4v4.6M11 19.4v4.6" strokeWidth={1} />
      <path d="M21 14h4" />
    </Glyph>
  );
}

// 18 — CDN: one origin, copies pushed out to the edge.
function EdgeNetwork({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx={14} cy={14} r={2.4} />
      <circle cx={14} cy={3.5} r={1.8} />
      <circle cx={24.5} cy={14} r={1.8} />
      <circle cx={14} cy={24.5} r={1.8} />
      <circle cx={3.5} cy={14} r={1.8} />
      <path d="M14 11.6V5.3M16.4 14h6.1M14 16.4v6.1M9.6 14H3.5" strokeDasharray="0.1 2.4" />
    </Glyph>
  );
}

// 19 — Consistent Hashing: nodes placed around a ring.
function HashRing({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <circle cx={14} cy={14} r={10} />
      <circle cx={14} cy={4} r={1.8} />
      <circle cx={23} cy={19} r={1.8} />
      <circle cx={5} cy={19} r={1.8} />
      <path d="M14 14l0-6.5" strokeDasharray="0.1 2" strokeWidth={1} />
    </Glyph>
  );
}

// 20 — Database Sharding: one store, split into partitions.
function ShardSplit({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={2} y={10} width={7} height={8} />
      <rect x={16} y={2.5} width={6} height={6} />
      <rect x={16} y={11} width={6} height={6} />
      <rect x={16} y={19.5} width={6} height={6} />
      <path d="M9 12.5l7-6.9M9 14h7M9 15.5l7 7" />
    </Glyph>
  );
}

// 21 — Database Replication: a node, mirrored.
function ReplicaCopies({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <rect x={2.5} y={10} width={8} height={8} />
      <rect x={17.5} y={4} width={8} height={8} />
      <rect x={17.5} y={16} width={8} height={8} />
      <path d="M10.5 12.5l7-4.5M10.5 15.5l7 4.5" strokeDasharray="0.1 2.4" />
    </Glyph>
  );
}

// 22 — Rate Limiting: a lane that narrows, some requests turned away.
function ThrottleGate({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M2.5 6h9l4 8-4 8h-9" />
      <circle cx={19} cy={14} r={1.6} />
      <circle cx={23} cy={9} r={1.6} />
      <path d="M23 18l3 3M26 18l-3 3" strokeWidth={1.1} />
    </Glyph>
  );
}

// 23 — Circuit Breakers: a trace, deliberately opened.
function CircuitBreak({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M2.5 14h6l2.5-6 3 12 2.5-6h2.5" />
      <path d="M19 14h1.5" strokeDasharray="0.1 2" />
      <circle cx={24} cy={14} r={2.6} />
      <path d="M24 11.5v2M22.5 14.7l1.5-.7 1.5.7" strokeWidth={1.1} />
    </Glyph>
  );
}

// 24 — Estimation & Interview Framework: the steps, converging on an answer.
function FrameworkSteps({ className }: { className?: string }) {
  return (
    <Glyph className={className}>
      <path d="M3 22l5-4 5 2 5-6 5-3" />
      <circle cx={3} cy={22} r={1.4} />
      <circle cx={8} cy={18} r={1.4} />
      <circle cx={13} cy={20} r={1.4} />
      <circle cx={18} cy={14} r={1.4} />
      <path d="M20.5 8.5h4.5v4.5" />
      <path d="M23 11l-5 2.7" />
    </Glyph>
  );
}

const GLYPH_BY_NUMBER: Record<number, (props: { className?: string }) => ReactNode> = {
  1: NodesCluster,
  2: NetworkPaths,
  3: RequestFlow,
  4: ClientServer,
  5: AddressResolution,
  6: RequestResponse,
  7: ApiContract,
  8: DataStorage,
  9: RelationalGrid,
  10: DocumentNodes,
  11: IndexTree,
  12: ScaleArrows,
  13: DistributeArrows,
  14: LayeredCache,
  15: CacheImplementation,
  16: QueueLane,
  17: QueueLanesMulti,
  18: EdgeNetwork,
  19: HashRing,
  20: ShardSplit,
  21: ReplicaCopies,
  22: ThrottleGate,
  23: CircuitBreak,
  24: FrameworkSteps,
};

/** Falls back to the root `NodesCluster` glyph for a lesson number this map hasn't been extended for yet (new lessons added after this file) — never renders nothing. */
export function LessonGlyph({ number, className }: { number: number; className?: string }) {
  const Component = GLYPH_BY_NUMBER[number] ?? NodesCluster;
  return <Component className={className} />;
}
