"use client";

import { motion } from "framer-motion";
import { ArrowMarker, DiagramArrow, DiagramBox, svgResponsiveProps } from "../primitives";
import { useSteppedAnimation } from "../useSteppedAnimation";
import { DiagramCaptionBar } from "../DiagramCaptionBar";
import { getEntityCatalogItem } from "@/lib/entityCatalog";

const ClientIcon = getEntityCatalogItem("client").icon;
const DatabaseIcon = getEntityCatalogItem("database").icon;
const ReplicaPoolIcon = getEntityCatalogItem("replica_pool").icon;

/**
 * Replica Pool's actual routing split — per `ReplicaPool.ts`'s own class
 * doc: `downstream[0]` is always the leader (every write goes there, never
 * a replica), everything after it is a read replica (round-robin, reads
 * only). Deliberately *not* the same shape as Load Balancer's diagram —
 * that one spreads homogeneous traffic across a homogeneous pool; this
 * pool is heterogeneous on both axes (leader vs. replica, write vs. read),
 * which is exactly `entityDeepDive.ts`'s own pitch for why this is "a
 * genuinely distinct scaling lever from Load Balancer's."
 *
 * Two beats: (1) mixed read/write traffic at a realistic write ratio —
 * reads round-robin across the two replicas, writes always land on the
 * leader, and a write in between doesn't consume a turn in the read
 * rotation; (2) Write Ratio pushed to 100%, the entity's own documented
 * failure mode ("Leader Overload Under High Write Ratio") — every request
 * becomes a write, the leader alone determines the ceiling, and the
 * replicas that were supposed to add capacity sit completely idle.
 *
 * Deliberately does **not** show replication lag — `entityDeepDive.ts`'s
 * own cons list is explicit that it's "named but not simulated. Every
 * replica here returns data as current as the leader's," and §3's
 * "match the entity's own claims" rule means not dramatizing behavior the
 * entity doesn't actually have, however tempting a lag visual might look.
 *
 * Reuses `LoadBalancerRoutingDiagram`'s stacked-target layout and its
 * edge-following `RequestDot` bend (Client → pool's left edge → pool's
 * right edge at the target row's height → target) rather than a straight
 * diagonal cutting through the pool box — the exact bug that diagram's
 * own doc comment describes fixing.
 */

const CLIENT = { x: 12, y: 74, w: 110, h: 40 };
const POOL = { x: 170, y: 6, w: 180, h: 176 };

const TARGETS_X = 430;
const TARGET_W = 140;
const TARGET_H = 40;
const LEADER = { x: TARGETS_X, y: 6, w: TARGET_W, h: TARGET_H };
const REPLICA_A = { x: TARGETS_X, y: 74, w: TARGET_W, h: TARGET_H };
const REPLICA_B = { x: TARGETS_X, y: 142, w: TARGET_W, h: TARGET_H };

const CAPTION_Y = 216;
const VIEWBOX_HEIGHT = 250;

type Target = "leader" | "replicaA" | "replicaB";
type Kind = "read" | "write" | "transition";
interface Step {
  kind: Kind;
  caption: string;
}

// Deterministic traffic: 3 reads and 2 writes interleaved (a realistic
// read-heavy ratio), then Write Ratio pushed to 100% for the closing beat.
const STEPS: Step[] = [
  { kind: "read", caption: "A read goes round-robin to Replica A." },
  { kind: "read", caption: "Next read cycles to Replica B — round-robin across every replica in turn." },
  { kind: "write", caption: "A write always goes to the one leader — never a replica." },
  { kind: "read", caption: "Reads keep round-robining — the write in between didn't consume a turn in the rotation." },
  { kind: "write", caption: "Another write, same leader. Two traffic types, two completely different routing rules." },
  { kind: "transition", caption: "Now push Write Ratio to 100% — every request becomes a write." },
  { kind: "write", caption: "Every request hits the leader alone now — the replicas sit completely idle." },
  { kind: "write", caption: "Replicating data never helps a write-heavy workload — the leader's own ceiling is the ceiling, same as a single unreplicated Database." },
];

const REPLICAS_IDLE_FROM_INDEX = 6;

// The target each step's dot travels to — reads round-robin across the 2
// replicas (mirroring ReplicaPool.ts's own `nextReplicaIndex % replicas.length`,
// incremented only on reads, exactly as the real entity does), writes
// always go to the leader, transition steps have no dot.
const STEP_TARGET: (Target | null)[] = (() => {
  const replicaOrder: Target[] = ["replicaA", "replicaB"];
  let readIndex = 0;
  return STEPS.map((s) => {
    if (s.kind === "write") return "leader";
    if (s.kind === "transition") return null;
    const target = replicaOrder[readIndex % replicaOrder.length];
    readIndex++;
    return target;
  });
})();

const STEP_DURATION_S = 2.4;
const REPEAT_PAUSE_S = 1.6;

const clientCenter = { x: CLIENT.x + CLIENT.w / 2, y: CLIENT.y + CLIENT.h / 2 };
const targetCenter = (t: { x: number; y: number; w: number; h: number }) => ({ x: t.x + t.w / 2, y: t.y + t.h / 2 });
const TARGET_CENTERS: Record<Target, { x: number; y: number }> = {
  leader: targetCenter(LEADER),
  replicaA: targetCenter(REPLICA_A),
  replicaB: targetCenter(REPLICA_B),
};

export function ReplicaPoolRoutingDiagram() {
  const { step, paused, togglePaused, playing } = useSteppedAnimation(STEPS.length, STEP_DURATION_S, REPEAT_PAUSE_S);

  const current = STEPS[step];
  const target = STEP_TARGET[step];
  const replicasIdle = step >= REPLICAS_IDLE_FROM_INDEX;

  return (
    <svg
      viewBox={`0 0 660 ${VIEWBOX_HEIGHT}`}
      {...svgResponsiveProps(660, VIEWBOX_HEIGHT)}
      className="text-text-muted"
      role="img"
      aria-label="Replica Pool routing: writes always go to the one leader, reads spread round-robin across the replicas. Pushing Write Ratio to 100% sends every request to the leader alone, leaving the replicas completely idle — replicating data doesn't help a write-heavy workload."
    >
      <ArrowMarker id="replica-pool-arrow" />
      <DiagramArrow x1={CLIENT.x + CLIENT.w} y1={clientCenter.y} x2={POOL.x} y2={clientCenter.y} markerId="replica-pool-arrow" />
      <DiagramArrow x1={POOL.x + POOL.w} y1={TARGET_CENTERS.leader.y} x2={LEADER.x} y2={TARGET_CENTERS.leader.y} markerId="replica-pool-arrow" />
      <DiagramArrow x1={POOL.x + POOL.w} y1={TARGET_CENTERS.replicaA.y} x2={REPLICA_A.x} y2={TARGET_CENTERS.replicaA.y} markerId="replica-pool-arrow" dashed={replicasIdle} />
      <DiagramArrow x1={POOL.x + POOL.w} y1={TARGET_CENTERS.replicaB.y} x2={REPLICA_B.x} y2={TARGET_CENTERS.replicaB.y} markerId="replica-pool-arrow" dashed={replicasIdle} />

      <DiagramBox x={CLIENT.x} y={CLIENT.y} width={CLIENT.w} height={CLIENT.h} lines={["Client"]} icon={ClientIcon} />

      <rect x={POOL.x} y={POOL.y} width={POOL.w} height={POOL.h} rx={2} strokeWidth={1} className="fill-bg-elevated stroke-signal" />
      <ReplicaPoolIcon x={POOL.x + 16} y={POOL.y + 12} width={11} height={11} strokeWidth={2} className="text-signal" aria-hidden />
      <text x={POOL.x + 33} y={POOL.y + 24} className="fill-signal text-[11px] font-medium">
        Replica Pool
      </text>
      <text x={POOL.x + 16} y={POOL.y + 40} className="fill-text-subtle text-[9.5px]">
        {replicasIdle ? "write ratio: 100%" : "write ratio: ~30%"}
      </text>

      <DiagramBox x={LEADER.x} y={LEADER.y} width={LEADER.w} height={LEADER.h} lines={["Database", "(leader)"]} icon={DatabaseIcon} />
      <DiagramBox
        x={REPLICA_A.x}
        y={REPLICA_A.y}
        width={REPLICA_A.w}
        height={REPLICA_A.h}
        lines={replicasIdle ? ["Database", "(replica) — idle"] : ["Database", "(replica)"]}
        dashed={replicasIdle}
        icon={DatabaseIcon}
      />
      <DiagramBox
        x={REPLICA_B.x}
        y={REPLICA_B.y}
        width={REPLICA_B.w}
        height={REPLICA_B.h}
        lines={replicasIdle ? ["Database", "(replica) — idle"] : ["Database", "(replica)"]}
        dashed={replicasIdle}
        icon={DatabaseIcon}
      />

      {playing && target !== null && <RequestDot key={step} target={target} kind={current.kind as "read" | "write"} />}

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
 * One request's journey — writes render signal-toned (the one distinct
 * destination), reads render healthy-toned (the routine, spread-out case).
 * Follows the pool's drawn edges (Client → pool's left edge → pool's right
 * edge at the target row's height → target) rather than a straight
 * diagonal, same fix `LoadBalancerRoutingDiagram`'s `RequestDot` made.
 * Remounted every step (`key={step}` on the caller) so it always starts
 * fresh at the Client.
 */
function RequestDot({ target, kind }: { target: Target; kind: "read" | "write" }) {
  const destination = TARGET_CENTERS[target];
  const color = kind === "write" ? "var(--color-signal)" : "var(--color-status-healthy)";
  const rowY = destination.y;
  const poolEntry = { x: POOL.x, y: clientCenter.y };
  const poolExit = { x: POOL.x + POOL.w, y: rowY };

  return (
    <motion.circle
      r={5}
      style={{ filter: "drop-shadow(0 0 4px currentColor)", color }}
      initial={{ cx: clientCenter.x, cy: clientCenter.y, opacity: 0, scale: 1 }}
      animate={{
        cx: [clientCenter.x, poolEntry.x, poolExit.x, destination.x],
        cy: [clientCenter.y, poolEntry.y, poolExit.y, destination.y],
        opacity: [0, 1, 1, 1],
        fill: color,
      }}
      transition={{ duration: STEP_DURATION_S, times: [0, 0.2, 0.5, 1], ease: "easeInOut" }}
    />
  );
}
