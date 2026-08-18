"use client";

import { motion } from "framer-motion";
import { ArrowMarker, DiagramArrow, DiagramBox, svgResponsiveProps } from "../primitives";
import { useSteppedAnimation } from "../useSteppedAnimation";
import { DiagramCaptionBar } from "../DiagramCaptionBar";
import { getEntityCatalogItem } from "@/lib/entityCatalog";

const ClientIcon = getEntityCatalogItem("client").icon;
const CdnIcon = getEntityCatalogItem("cdn").icon;

/**
 * What actually makes a CDN different from a plain Cache: not just
 * hit/miss, but that each edge's cache is *independent* — "content warmed
 * at one edge isn't visible at another, exactly like real CDN edges"
 * (`entityDeepDive.ts`'s `cdn.summary`; the same fact is CDN.ts's own
 * class-doc learning goal). The classic "first request slow, every
 * subsequent one fast" story (this file's plan row) is told twice, once
 * per edge, specifically so the second telling can land the differentiator:
 * Edge B is still cold even after Edge A has already answered the exact
 * same content, because the two caches never talk to each other.
 *
 * Two edges, not the real entity's default five — enough to show
 * independence without turning the diagram into the app's own Edge Map
 * (a separate, already-existing draggable feature; this is the flagship
 * "how it works" mechanism diagram, not a rebuild of that UI). Every
 * request is a single one-way dot along the same lines the arrows draw
 * (Client → Edge, and on a miss, Edge → Origin) — no synthetic waypoint
 * through a hub box is needed here the way `LoadBalancerRoutingDiagram`
 * needed one, since Client/Edge/Origin are direct point-to-point arrows,
 * not requests funneling through one central box.
 */

const CLIENT = { x: 12, y: 65, w: 110, h: 40 };
const ORIGIN = { x: 520, y: 65, w: 120, h: 40 };
const EDGE_A = { x: 230, y: 25, w: 140, h: 50 };
const EDGE_B = { x: 230, y: 95, w: 140, h: 50 };
const CDN_GROUP = { x: 216, y: 11, w: 168, h: 148 };

const CAPTION_Y = 176;
const VIEWBOX_HEIGHT = 216;

type Edge = "A" | "B";
type StepKind = "intro" | "miss" | "hit";
interface Step {
  kind: StepKind;
  /** Only meaningful for "miss"/"hit". */
  edge?: Edge;
  caption: string;
}

// Scripted story: the classic "first request slow, then fast" told once
// per edge — Edge A warms up first, then a request lands on Edge B and
// finds it just as cold as Edge A started, because the two caches never
// share what either one has learned.
const STEPS: Step[] = [
  { kind: "intro", caption: "The CDN runs two independent edge caches — content warmed at one isn't visible at the other." },
  { kind: "miss", edge: "A", caption: "Request 1 → Edge A (nearest). Nothing cached yet — the miss falls all the way through to the Origin, which caches the response at Edge A on the way back." },
  { kind: "hit", edge: "A", caption: "Request 2, same content — Edge A is warm now. Instant hit, no trip to the Origin at all." },
  { kind: "miss", edge: "B", caption: "Request 3 lands on Edge B instead. Its cache is completely independent — what's warm at Edge A doesn't exist here. Miss again, same round trip to the Origin." },
  { kind: "hit", edge: "B", caption: "Edge B is warm now too. Proximity decided which edge answered — hit rate is something each edge had to earn on its own." },
];

// A "miss" step is exactly the request that warms that edge's cache — the
// resulting state is derived from the script's own shape rather than a
// second hand-maintained flag per step, same discipline as every other
// diagram's derived state.
const CACHE_WARM: Record<Edge, boolean>[] = STEPS.reduce<Record<Edge, boolean>[]>((acc, s) => {
  const before = acc.length === 0 ? { A: false, B: false } : acc[acc.length - 1];
  const after = s.kind === "miss" && s.edge ? { ...before, [s.edge]: true } : before;
  acc.push(after);
  return acc;
}, []);

const STEP_DURATION_S = 2.4;
const REPEAT_PAUSE_S = 1.6;

const clientCenter = { x: CLIENT.x + CLIENT.w / 2, y: CLIENT.y + CLIENT.h / 2 };
const originCenter = { x: ORIGIN.x + ORIGIN.w / 2, y: ORIGIN.y + ORIGIN.h / 2 };
const edgeCenter = (e: { x: number; y: number; w: number; h: number }) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
const EDGE_CENTERS: Record<Edge, { x: number; y: number }> = {
  A: edgeCenter(EDGE_A),
  B: edgeCenter(EDGE_B),
};

export function CDNEdgeCacheDiagram() {
  const { step, paused, togglePaused, playing } = useSteppedAnimation(STEPS.length, STEP_DURATION_S, REPEAT_PAUSE_S);

  const current = STEPS[step];
  const cacheWarm = CACHE_WARM[step];

  return (
    <svg
      viewBox={`0 0 660 ${VIEWBOX_HEIGHT}`}
      {...svgResponsiveProps(660, VIEWBOX_HEIGHT)}
      className="text-text-muted"
      role="img"
      aria-label="How a CDN's edges cache independently: a request that misses at one edge falls through to the Origin and warms only that edge, so the exact same content still misses the first time it's asked for at a different edge."
    >
      <ArrowMarker id="cdn-arrow" />
      <DiagramArrow x1={CLIENT.x + CLIENT.w} y1={clientCenter.y} x2={EDGE_A.x} y2={EDGE_CENTERS.A.y} markerId="cdn-arrow" />
      <DiagramArrow x1={CLIENT.x + CLIENT.w} y1={clientCenter.y} x2={EDGE_B.x} y2={EDGE_CENTERS.B.y} markerId="cdn-arrow" />
      <DiagramArrow x1={EDGE_A.x + EDGE_A.w} y1={EDGE_CENTERS.A.y} x2={ORIGIN.x} y2={originCenter.y} markerId="cdn-arrow" />
      <DiagramArrow x1={EDGE_B.x + EDGE_B.w} y1={EDGE_CENTERS.B.y} x2={ORIGIN.x} y2={originCenter.y} markerId="cdn-arrow" />

      <DiagramBox x={CLIENT.x} y={CLIENT.y} width={CLIENT.w} height={CLIENT.h} lines={["Client"]} icon={ClientIcon} />
      <DiagramBox x={ORIGIN.x} y={ORIGIN.y} width={ORIGIN.w} height={ORIGIN.h} lines={["Origin"]} />

      {/* A dashed group box just to label the two edges as "the CDN" — not a mechanism box itself, so it stays unstyled/neutral like DnsHierarchyDiagram's grouping rather than the signal-toned boxes RateLimiter/CircuitBreaker use. */}
      <rect
        x={CDN_GROUP.x}
        y={CDN_GROUP.y}
        width={CDN_GROUP.w}
        height={CDN_GROUP.h}
        rx={4}
        strokeWidth={1}
        strokeDasharray="3 3"
        className="fill-none stroke-border"
      />
      <text x={CDN_GROUP.x + 8} y={CDN_GROUP.y - 4} className="fill-text-subtle text-[9.5px] font-medium uppercase tracking-wide">
        CDN
      </text>

      <DiagramBox
        x={EDGE_A.x}
        y={EDGE_A.y}
        width={EDGE_A.w}
        height={EDGE_A.h}
        lines={["Edge A (near)", cacheWarm.A ? "cache: warm" : "cache: empty"]}
        tone={cacheWarm.A ? "healthy" : "neutral"}
        icon={CdnIcon}
      />
      <DiagramBox
        x={EDGE_B.x}
        y={EDGE_B.y}
        width={EDGE_B.w}
        height={EDGE_B.h}
        lines={["Edge B (far)", cacheWarm.B ? "cache: warm" : "cache: empty"]}
        tone={cacheWarm.B ? "healthy" : "neutral"}
        icon={CdnIcon}
      />

      {playing && current.kind !== "intro" && current.edge && (
        <RequestDot key={step} edge={current.edge} miss={current.kind === "miss"} />
      )}

      {playing && (
        <DiagramCaptionBar
          y={CAPTION_Y - 18}
          caption={current.caption}
          captionKey={step}
          paused={paused}
          onTogglePause={togglePaused}
        />
      )}
    </svg>
  );
}

/**
 * One request's journey for a single step, following the exact lines the
 * arrows draw. A hit stops at its edge (Client → Edge); a miss continues
 * on to the Origin (Client → Edge → Origin) — the same one-way,
 * arrives-and-stays convention every other diagram in this folder uses,
 * just with one extra waypoint on a miss. Remounted every step
 * (`key={step}` on the caller) so it always starts fresh at the Client.
 */
function RequestDot({ edge, miss }: { edge: Edge; miss: boolean }) {
  const edgePoint = EDGE_CENTERS[edge];
  const color = miss ? "var(--color-signal)" : "var(--color-status-healthy)";
  const cx = miss ? [clientCenter.x, edgePoint.x, originCenter.x, originCenter.x] : [clientCenter.x, edgePoint.x, edgePoint.x];
  const cy = miss ? [clientCenter.y, edgePoint.y, originCenter.y, originCenter.y] : [clientCenter.y, edgePoint.y, edgePoint.y];
  const times = miss ? [0, 0.4, 0.75, 1] : [0, 0.55, 1];

  return (
    <motion.circle
      r={5}
      style={{ filter: "drop-shadow(0 0 4px currentColor)", color }}
      initial={{ cx: clientCenter.x, cy: clientCenter.y, opacity: 0 }}
      animate={{ cx, cy, opacity: 1, fill: color }}
      transition={{ duration: STEP_DURATION_S, times, ease: "easeInOut" }}
    />
  );
}
