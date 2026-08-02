import { useEffect, useMemo, useRef, useState } from "react";
import { getBezierPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { motion, useReducedMotion } from "framer-motion";
import type { ArchitectureEdge } from "@/store/workshopStore";

/**
 * How many of the requests that actually crossed this edge (in the last
 * run) get an animated dot — capped so a 200-request run doesn't render
 * 200 dots. The success/failed split below is proportional to the real
 * counts, not fabricated (see src/lib/packetSampling.ts).
 */
export interface PacketSample {
  success: number;
  failed: number;
}

export interface AnimatedEdgeData extends Record<string, unknown> {
  packets?: PacketSample;
}

const DOT_DURATION = 1.4;
const LOOP_GAP = 1.2;
/** Failed packets stop just short of the target — they were rejected on arrival, not mid-flight. */
const FAILURE_TRAVEL_FRACTION = 0.92;
/** Points sampled along the curve for packets to travel through — dense enough to look smooth. */
const PATH_SAMPLE_COUNT = 24;

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps<ArchitectureEdge>) {
  const prefersReducedMotion = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Sample the actual rendered curve rather than lerping straight between
  // the two endpoints — a straight line visibly cuts the corner on any
  // edge that isn't perfectly horizontal, which is most real graphs.
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    const sampled = Array.from({ length: PATH_SAMPLE_COUNT + 1 }, (_, i) => {
      const point = path.getPointAtLength((i / PATH_SAMPLE_COUNT) * length);
      return { x: point.x, y: point.y };
    });
    setPoints(sampled);
  }, [edgePath]);

  const packets = (data as AnimatedEdgeData | undefined)?.packets;

  const items = useMemo(() => {
    if (!packets) return [];
    const total = packets.success + packets.failed;
    if (total === 0) return [];
    return Array.from({ length: total }, (_, i) => ({
      key: `${id}-packet-${i}`,
      failed: i < packets.failed,
      delay: (i / total) * (DOT_DURATION + LOOP_GAP),
    }));
  }, [id, packets]);

  return (
    <>
      <path
        ref={pathRef}
        id={id}
        d={edgePath}
        fill="none"
        className="react-flow__edge-path"
        style={style}
      />
      {points.length > 0 &&
        items.map((item) => (
          <Packet
            key={item.key}
            points={points}
            failed={item.failed}
            delay={item.delay}
            reducedMotion={Boolean(prefersReducedMotion)}
          />
        ))}
    </>
  );
}

function Packet({
  points,
  failed,
  delay,
  reducedMotion,
}: {
  points: { x: number; y: number }[];
  failed: boolean;
  delay: number;
  reducedMotion: boolean;
}) {
  const travelFraction = failed ? FAILURE_TRAVEL_FRACTION : 1;
  const usedCount = Math.max(2, Math.round(points.length * travelFraction));
  const path = points.slice(0, usedCount);
  const xs = path.map((p) => p.x);
  const ys = path.map((p) => p.y);
  const end = path[path.length - 1];

  if (reducedMotion) {
    // No looping motion — a single static marker at the resting point
    // still communicates the outcome without continuous movement.
    return failed ? (
      <FailureMark x={end.x} y={end.y} opacity={0.8} />
    ) : (
      <circle cx={end.x} cy={end.y} r={3} className="fill-success" opacity={0.8} />
    );
  }

  const transition = {
    duration: DOT_DURATION,
    delay,
    repeat: Infinity,
    repeatDelay: LOOP_GAP,
    ease: "easeInOut" as const,
  };

  const opacitySteps = xs.map((_, i) => {
    const t = i / (xs.length - 1);
    if (t < 0.1) return t / 0.1;
    if (t > 0.9) return (1 - t) / 0.1;
    return 1;
  });

  if (failed) {
    return (
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ x: xs, y: ys, opacity: opacitySteps }}
        transition={transition}
      >
        <FailureMark x={0} y={0} opacity={1} asMotionChild />
      </motion.g>
    );
  }

  return (
    <motion.circle
      r={3}
      className="fill-success"
      initial={{ opacity: 0 }}
      animate={{ cx: xs, cy: ys, opacity: opacitySteps }}
      transition={transition}
    />
  );
}

function FailureMark({
  x,
  y,
  opacity,
  asMotionChild = false,
}: {
  x: number;
  y: number;
  opacity: number;
  asMotionChild?: boolean;
}) {
  // A motion.g parent already animates x/y as a transform on this whole
  // group — plain SVG lines just need offsets applied directly since
  // they don't support cx/cy.
  const size = 3.5;
  const props = asMotionChild ? {} : { transform: `translate(${x}, ${y})` };

  return (
    <g opacity={opacity} {...props}>
      <line
        x1={-size}
        y1={-size}
        x2={size}
        y2={size}
        className="stroke-error"
        strokeWidth={1.5}
      />
      <line
        x1={-size}
        y1={size}
        x2={size}
        y2={-size}
        className="stroke-error"
        strokeWidth={1.5}
      />
    </g>
  );
}
