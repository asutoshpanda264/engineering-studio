"use client";

import { motion } from "framer-motion";
import { ArrowMarker, DiagramArrow, DiagramBox } from "../primitives";
import { useSteppedAnimation } from "../useSteppedAnimation";
import { DiagramCaptionBar } from "../DiagramCaptionBar";

/**
 * The Token Bucket algorithm, animated as what actually happens: a bucket
 * holding up to 5 saved-up tokens, a burst of 7 requests arriving back to
 * back, and a slow refill afterward. This is the one mechanism the
 * entity's own copy (`entityDeepDive.ts`) keeps coming back to — "allows
 * short bursts by spending saved-up capacity" — so the animation is that
 * exact scripted story, not a live simulation: the bucket starts full,
 * the first 5 requests in the burst spend it down and are admitted, the
 * next 2 find it empty and are rejected immediately (no queueing — they
 * just bounce off the limiter), then it refills at the steady rate while
 * traffic is calm.
 *
 * Same stepped-animation engine (`useSteppedAnimation`) and caption bar
 * (`DiagramCaptionBar`, with its own play/pause button) as
 * `DnsRecursiveLookupDiagram` — factored out once this became the second
 * diagram built on that pattern.
 */

const CLIENT = { x: 12, y: 96, w: 120, h: 40 };
const LIMITER = { x: 200, y: 40, w: 260, h: 120 };
const SERVER = { x: 528, y: 96, w: 120, h: 40 };

const CAPACITY = 5;
const TOKEN_SIZE = 20;
const TOKEN_GAP = 12;
const TOKENS_Y = LIMITER.y + 78;
const TOKENS_START_X = LIMITER.x + 24;

const CAPTION_Y = 210;
const VIEWBOX_HEIGHT = 236;

type StepKind = "admit" | "reject" | "refill";
interface Step {
  kind: StepKind;
  caption: string;
}

// Scripted story: bucket starts full (5/5), a burst spends it down and then
// overflows into rejections, then it recovers during a quiet stretch.
const STEPS: Step[] = [
  { kind: "admit", caption: "Bucket starts full — 5 tokens saved up from being idle. Burst request 1 spends one." },
  { kind: "admit", caption: "Burst request 2 — still has saved capacity to spend." },
  { kind: "admit", caption: "Burst request 3 — spending down the bucket." },
  { kind: "admit", caption: "Burst request 4 — one token left after this." },
  { kind: "admit", caption: "Burst request 5 — bucket now empty. The whole burst so far was forgiven." },
  { kind: "reject", caption: "Burst request 6 — no tokens left. Rejected immediately, never queued." },
  { kind: "reject", caption: "Burst request 7 — still empty, still rejected on the spot." },
  { kind: "refill", caption: "Traffic goes quiet. Tokens refill at the configured steady rate." },
  { kind: "admit", caption: "A request arrives — there's exactly one token to spend." },
  { kind: "refill", caption: "Bucket keeps refilling while idle…" },
  { kind: "refill", caption: "…back up to 2 tokens, ready to forgive the next burst." },
];

// Derive the token count after each step from the script above, rather than
// hand-maintaining a parallel number — a reject step is only ever valid
// with 0 tokens on hand, which this also makes easy to sanity-check.
const TOKENS_AFTER: number[] = STEPS.reduce<number[]>((acc, s) => {
  const before = acc.length === 0 ? CAPACITY : acc[acc.length - 1];
  const after = s.kind === "admit" ? before - 1 : s.kind === "refill" ? Math.min(CAPACITY, before + 1) : before;
  acc.push(after);
  return acc;
}, []);

const STEP_DURATION_S = 2.4;
const REPEAT_PAUSE_S = 1.6;

const clientCenter = { x: CLIENT.x + CLIENT.w / 2, y: CLIENT.y + CLIENT.h / 2 };
const serverCenter = { x: SERVER.x + SERVER.w / 2, y: SERVER.y + SERVER.h / 2 };
const limiterEdge = { x: LIMITER.x + 6, y: LIMITER.y + LIMITER.h / 2 + 30 };

export function RateLimiterTokenBucketDiagram() {
  const { step, paused, togglePaused, playing } = useSteppedAnimation(STEPS.length, STEP_DURATION_S, REPEAT_PAUSE_S);

  const current = STEPS[step];
  const tokensNow = TOKENS_AFTER[step];

  return (
    <svg
      viewBox={`0 0 660 ${VIEWBOX_HEIGHT}`}
      className="h-auto w-full text-text-muted"
      role="img"
      aria-label="Token bucket rate limiting: a burst of requests spends down 5 saved tokens, the next two are rejected instantly once the bucket is empty, then it refills at a steady rate."
    >
      <ArrowMarker id="rate-limiter-arrow" />
      <DiagramArrow x1={CLIENT.x + CLIENT.w} y1={clientCenter.y} x2={LIMITER.x} y2={clientCenter.y} markerId="rate-limiter-arrow" />
      <DiagramArrow x1={LIMITER.x + LIMITER.w} y1={serverCenter.y} x2={SERVER.x} y2={serverCenter.y} markerId="rate-limiter-arrow" />

      <DiagramBox x={CLIENT.x} y={CLIENT.y} width={CLIENT.w} height={CLIENT.h} lines={["Client"]} />
      <DiagramBox x={SERVER.x} y={SERVER.y} width={SERVER.w} height={SERVER.h} lines={["API Server"]} />

      {/* Rate Limiter — a labeled box housing the bucket's 5 token slots. */}
      <rect x={LIMITER.x} y={LIMITER.y} width={LIMITER.w} height={LIMITER.h} rx={2} strokeWidth={1} className="fill-bg-elevated stroke-signal" />
      <text x={LIMITER.x + 16} y={LIMITER.y + 22} className="fill-signal text-[11px] font-medium">
        Rate Limiter
      </text>
      <text x={LIMITER.x + 16} y={LIMITER.y + 38} className="fill-text-subtle text-[9.5px]">
        token bucket — capacity {CAPACITY}
      </text>

      {Array.from({ length: CAPACITY }).map((_, i) => {
        const x = TOKENS_START_X + i * (TOKEN_SIZE + TOKEN_GAP);
        const filled = i < tokensNow;
        return (
          <motion.rect
            key={i}
            x={x}
            y={TOKENS_Y}
            width={TOKEN_SIZE}
            height={TOKEN_SIZE}
            rx={3}
            strokeWidth={1}
            className="stroke-signal"
            initial={false}
            animate={{ opacity: filled ? 1 : 0.15 }}
            style={{ fill: "var(--color-signal)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        );
      })}

      {playing && current.kind !== "refill" && (
        <RequestDot key={step} admitted={current.kind === "admit"} />
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

/** One request's journey for a single step — admitted continues all the way to the API Server; rejected stops at the limiter's edge and dissolves there. Remounted every step (`key={step}` on the caller) so it always starts fresh at the Client. */
function RequestDot({ admitted }: { admitted: boolean }) {
  const target = admitted ? serverCenter : limiterEdge;
  const color = admitted ? "var(--color-status-healthy)" : "var(--color-status-critical)";

  return (
    <motion.circle
      r={5}
      style={{ filter: "drop-shadow(0 0 4px currentColor)", color }}
      initial={{ cx: clientCenter.x, cy: clientCenter.y, opacity: 0, scale: 1 }}
      animate={{
        cx: [clientCenter.x, target.x, target.x],
        cy: [clientCenter.y, target.y, target.y],
        opacity: [0, 1, admitted ? 1 : 0],
        scale: [1, 1, admitted ? 1 : 0.3],
        fill: color,
      }}
      transition={{ duration: STEP_DURATION_S, times: [0, 0.55, 1], ease: "easeInOut" }}
    />
  );
}
