"use client";

import { motion } from "framer-motion";
import { ArrowMarker, DiagramArrow, DiagramBox, svgResponsiveProps } from "../primitives";
import { useSteppedAnimation } from "../useSteppedAnimation";
import { DiagramCaptionBar } from "../DiagramCaptionBar";
import { getEntityCatalogItem } from "@/lib/entityCatalog";

const ClientIcon = getEntityCatalogItem("client").icon;
const ApiIcon = getEntityCatalogItem("api").icon;
const LoadBalancerIcon = getEntityCatalogItem("load_balancer").icon;

/**
 * Why a Load Balancer exists at all, animated as the before/after it's
 * actually for — not a tour of its five routing algorithms (those are
 * already selectable and comparable in the Inspector; see
 * `LoadBalancer.ts`'s own doc comment and the entity-algorithm-diversity
 * feedback that put them there). This diagram dramatizes the entity's own
 * framing instead: "Putting one in front of a single overloaded server
 * changes nothing; the servers behind it are what actually need to scale"
 * (`entityDeepDive.ts`'s `load_balancer.summary`).
 *
 * One fixed topology throughout — the Load Balancer box and Servers B/C
 * exist in the SVG the whole time, just toggled dashed/dim ("not yet
 * added") before the story adds them, then solid after, the same
 * before/after convention `DnsFailoverDiagram` established with
 * `DiagramBox`'s `tone`/`dashed` props. Phase 1: every request goes
 * straight to one server, which fills a small 2-slot capacity indicator
 * and then starts rejecting — the same capacity-fills-then-rejects visual
 * language `RateLimiterTokenBucketDiagram`'s token count and
 * `CircuitBreakerStateMachineDiagram`'s failure streak already use. Phase
 * 2: the Load Balancer and two more servers appear, and Round Robin
 * spreads the identical traffic across three targets instead of one.
 */

const CLIENT = { x: 12, y: 74, w: 110, h: 40 };
const LB = { x: 170, y: 6, w: 180, h: 176 };

const TARGETS_X = 430;
const TARGET_W = 140;
const TARGET_H = 40;
const TARGET_A = { x: TARGETS_X, y: 6, w: TARGET_W, h: TARGET_H };
const TARGET_B = { x: TARGETS_X, y: 74, w: TARGET_W, h: TARGET_H };
const TARGET_C = { x: TARGETS_X, y: 142, w: TARGET_W, h: TARGET_H };

const CAPACITY = 2;
const SLOT_SIZE = 14;
const SLOT_GAP = 8;
const SLOTS_Y = TARGET_A.y + TARGET_A.h + 10;
const SLOTS_START_X = TARGET_A.x;

const CAPTION_Y = 216;
const VIEWBOX_HEIGHT = 250;

type Target = "A" | "B" | "C";
interface Step {
  /** null marks the transition step where the Load Balancer + two servers are added — no request travels this beat. */
  target: Target | null;
  admitted: boolean;
  caption: string;
}

// Scripted story: one server takes every request alone until it's full and
// starts dropping them, then a Load Balancer and two more servers appear
// and Round Robin spreads the same traffic across all three.
const STEPS: Step[] = [
  { target: "A", admitted: true, caption: "No Load Balancer yet — every request goes straight to the one API Server." },
  { target: "A", admitted: true, caption: "More requests arrive. There's nothing behind this server to share the load." },
  { target: "A", admitted: false, caption: "The server is overloaded and starts dropping requests — a Load Balancer wouldn't even help yet; there's only one target to route to." },
  { target: null, admitted: true, caption: "A Load Balancer goes in front, with two more API Servers added behind it." },
  { target: "A", admitted: true, caption: "Round Robin — request 1 goes to Server A." },
  { target: "B", admitted: true, caption: "Request 2 goes to Server B — capacity that wasn't there before." },
  { target: "C", admitted: true, caption: "Request 3 goes to Server C. The same traffic that overloaded one server now splits three ways." },
  { target: "A", admitted: true, caption: "The cycle repeats — no single target ever carries the full load again." },
];

// Load Balancer + Servers B/C become active from the transition step (index
// 3) onward — derived from the story's own shape rather than a second
// hand-maintained boolean per step.
const LB_ACTIVE_FROM_INDEX = 3;

// Server A's capacity fills during the solo phase (steps before the Load
// Balancer exists) and is only ever read while that phase is on screen.
const SLOTS_FILLED: number[] = STEPS.reduce<number[]>((acc, s, i) => {
  const before = acc.length === 0 ? 0 : acc[acc.length - 1];
  const solo = i < LB_ACTIVE_FROM_INDEX;
  const after = solo && s.target === "A" && s.admitted ? Math.min(CAPACITY, before + 1) : before;
  acc.push(after);
  return acc;
}, []);

const STEP_DURATION_S = 2.4;
const REPEAT_PAUSE_S = 1.6;

const clientCenter = { x: CLIENT.x + CLIENT.w / 2, y: CLIENT.y + CLIENT.h / 2 };
const targetCenter = (t: { x: number; y: number; w: number; h: number }) => ({ x: t.x + t.w / 2, y: t.y + t.h / 2 });
const TARGET_CENTERS: Record<Target, { x: number; y: number }> = {
  A: targetCenter(TARGET_A),
  B: targetCenter(TARGET_B),
  C: targetCenter(TARGET_C),
};
// Where a rejected request dissolves — just short of Server A's edge, the
// same "stops before reaching the box" convention as the Rate Limiter's
// and Circuit Breaker's rejection points.
const SERVER_A_EDGE = { x: TARGET_A.x - 6, y: TARGET_CENTERS.A.y };

export function LoadBalancerRoutingDiagram() {
  const { step, paused, togglePaused, playing } = useSteppedAnimation(STEPS.length, STEP_DURATION_S, REPEAT_PAUSE_S);

  const current = STEPS[step];
  const lbActive = step >= LB_ACTIVE_FROM_INDEX;
  const slotsFilled = SLOTS_FILLED[step];
  const serverAOverloaded = !lbActive && slotsFilled >= CAPACITY;

  return (
    <svg
      viewBox={`0 0 660 ${VIEWBOX_HEIGHT}`}
      {...svgResponsiveProps(660, VIEWBOX_HEIGHT)}
      className="text-text-muted"
      role="img"
      aria-label="Why a load balancer exists: a single API Server fills up and starts rejecting requests with nothing behind it, then a Load Balancer and two more servers are added and Round Robin spreads the same traffic across all three so no single target carries the full load."
    >
      <ArrowMarker id="load-balancer-arrow" />
      <DiagramArrow x1={CLIENT.x + CLIENT.w} y1={clientCenter.y} x2={LB.x} y2={clientCenter.y} markerId="load-balancer-arrow" dashed={!lbActive} />
      <DiagramArrow x1={LB.x + LB.w} y1={TARGET_CENTERS.A.y} x2={TARGET_A.x} y2={TARGET_CENTERS.A.y} markerId="load-balancer-arrow" />
      <DiagramArrow x1={LB.x + LB.w} y1={TARGET_CENTERS.B.y} x2={TARGET_B.x} y2={TARGET_CENTERS.B.y} markerId="load-balancer-arrow" dashed={!lbActive} />
      <DiagramArrow x1={LB.x + LB.w} y1={TARGET_CENTERS.C.y} x2={TARGET_C.x} y2={TARGET_CENTERS.C.y} markerId="load-balancer-arrow" dashed={!lbActive} />

      <DiagramBox x={CLIENT.x} y={CLIENT.y} width={CLIENT.w} height={CLIENT.h} lines={["Client"]} icon={ClientIcon} />

      {/* Load Balancer — a plain "not yet added" box until the story adds it, then the same signal-toned mechanism box RateLimiter/CircuitBreaker use. */}
      <rect
        x={LB.x}
        y={LB.y}
        width={LB.w}
        height={LB.h}
        rx={2}
        strokeWidth={1}
        strokeDasharray={lbActive ? undefined : "3 3"}
        className={lbActive ? "fill-bg-elevated stroke-signal" : "fill-bg-elevated stroke-border"}
      />
      <LoadBalancerIcon
        x={LB.x + 16}
        y={LB.y + 12}
        width={11}
        height={11}
        strokeWidth={2}
        className={lbActive ? "text-signal" : "text-text-subtle"}
        aria-hidden
      />
      <text x={LB.x + 33} y={LB.y + 24} className={`text-[11px] font-medium ${lbActive ? "fill-signal" : "fill-text-subtle"}`}>
        Load Balancer
      </text>
      <text x={LB.x + 16} y={LB.y + 40} className="fill-text-subtle text-[9.5px]">
        {lbActive ? "round robin" : "not yet added"}
      </text>

      <DiagramBox
        x={TARGET_A.x}
        y={TARGET_A.y}
        width={TARGET_A.w}
        height={TARGET_A.h}
        lines={["Server A"]}
        tone={serverAOverloaded ? "critical" : "neutral"}
        icon={ApiIcon}
      />
      <DiagramBox
        x={TARGET_B.x}
        y={TARGET_B.y}
        width={TARGET_B.w}
        height={TARGET_B.h}
        lines={lbActive ? ["Server B"] : ["Server B", "not yet added"]}
        dashed={!lbActive}
        icon={ApiIcon}
      />
      <DiagramBox
        x={TARGET_C.x}
        y={TARGET_C.y}
        width={TARGET_C.w}
        height={TARGET_C.h}
        lines={lbActive ? ["Server C"] : ["Server C", "not yet added"]}
        dashed={!lbActive}
        icon={ApiIcon}
      />

      {/* Server A's capacity — only meaningful (and only shown) during the solo phase, same fill-then-reject slot language as the token bucket and failure streak. */}
      {!lbActive &&
        Array.from({ length: CAPACITY }).map((_, i) => {
          const x = SLOTS_START_X + i * (SLOT_SIZE + SLOT_GAP);
          const filled = i < slotsFilled;
          return (
            <motion.rect
              key={i}
              x={x}
              y={SLOTS_Y}
              width={SLOT_SIZE}
              height={SLOT_SIZE}
              rx={3}
              strokeWidth={1}
              className="stroke-status-critical"
              initial={false}
              animate={{ opacity: filled ? 1 : 0.15 }}
              style={{ fill: "var(--color-status-critical)" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          );
        })}

      {playing && current.target !== null && <RequestDot key={step} target={current.target} admitted={current.admitted} />}

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
 * One request's journey for a single step, following the actual drawn
 * arrows instead of cutting a diagonal straight line across the Load
 * Balancer box — Client → the Load Balancer's left edge (where the first
 * arrow lands) → the Load Balancer's right edge at the target row's height
 * (where that target's arrow starts) → the target itself. With three
 * targets stacked at different heights, a straight two-point tween from
 * Client to Server B or C used to visibly cut through the box at an angle
 * unrelated to any drawn line, reading as a jump rather than a routed
 * path. Admitted requests continue all the way to the target's center;
 * rejected (only ever Server A, only ever in the solo phase) stops at that
 * server's edge and dissolves there. Remounted every step (`key={step}` on
 * the caller) so it always starts fresh at the Client, same as
 * `RateLimiterTokenBucketDiagram`'s `RequestDot`.
 */
function RequestDot({ target, admitted }: { target: Target; admitted: boolean }) {
  const destination = admitted ? TARGET_CENTERS[target] : SERVER_A_EDGE;
  const color = admitted ? "var(--color-status-healthy)" : "var(--color-status-critical)";
  const rowY = TARGET_CENTERS[target].y;
  const lbEntry = { x: LB.x, y: clientCenter.y };
  const lbExit = { x: LB.x + LB.w, y: rowY };

  return (
    <motion.circle
      r={5}
      style={{ filter: "drop-shadow(0 0 4px currentColor)", color }}
      initial={{ cx: clientCenter.x, cy: clientCenter.y, opacity: 0, scale: 1 }}
      animate={{
        cx: [clientCenter.x, lbEntry.x, lbExit.x, destination.x, destination.x],
        cy: [clientCenter.y, lbEntry.y, lbExit.y, destination.y, destination.y],
        opacity: [0, 1, 1, 1, admitted ? 1 : 0],
        scale: [1, 1, 1, 1, admitted ? 1 : 0.3],
        fill: color,
      }}
      transition={{ duration: STEP_DURATION_S, times: [0, 0.2, 0.5, 0.8, 1], ease: "easeInOut" }}
    />
  );
}
