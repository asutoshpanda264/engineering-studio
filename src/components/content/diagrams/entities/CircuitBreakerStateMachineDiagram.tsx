"use client";

import { motion } from "framer-motion";
import { ArrowMarker, DiagramArrow, DiagramBox, svgResponsiveProps } from "../primitives";
import { useSteppedAnimation } from "../useSteppedAnimation";
import { DiagramCaptionBar } from "../DiagramCaptionBar";
import { getEntityCatalogItem } from "@/lib/entityCatalog";

const ClientIcon = getEntityCatalogItem("client").icon;
const DatabaseIcon = getEntityCatalogItem("database").icon;
const CircuitBreakerIcon = getEntityCatalogItem("circuit_breaker").icon;

/**
 * The three-state breaker (Closed → Open → Half-Open → Closed) from
 * `src/simulation/entities/CircuitBreaker.ts`, animated as the exact state
 * cycle that entity actually runs — not a paraphrase. A Database wrapped by
 * the breaker starts failing; five *consecutive* failures (the default
 * Failure Threshold, per `entityDeepDive.ts`'s "normal" config) trips the
 * breaker open, after which every request fails instantly without ever
 * reaching the Database — the entity's whole reason to exist, per its own
 * tagline ("Stops hammering something that's already struggling"). After
 * Trip Duration elapses, exactly one probe (the default Half-Open Probes)
 * is let through to test recovery; it succeeds, and the breaker closes
 * again with its failure streak reset.
 *
 * `DERIVED` replays the same closed/open/half-open transition rules the
 * real `CircuitBreaker.ts` runs (trip resets the streak to zero, a
 * half-open success closes the breaker, reject/wait are no-ops) rather
 * than hand-picking a badge state and streak count per step — so the
 * story is provably faithful to the entity, the same discipline
 * `RateLimiterTokenBucketDiagram.tsx` uses for its token count.
 */

const CLIENT = { x: 12, y: 96, w: 120, h: 40 };
const BREAKER = { x: 200, y: 40, w: 260, h: 120 };
const DATABASE = { x: 528, y: 96, w: 120, h: 40 };

const FAILURE_THRESHOLD = 5;
const SLOT_SIZE = 20;
const SLOT_GAP = 12;
const SLOTS_Y = BREAKER.y + 78;
const SLOTS_START_X = BREAKER.x + 24;

const CAPTION_Y = 210;
const VIEWBOX_HEIGHT = 236;

type StepKind = "success" | "fail" | "reject" | "wait" | "probe";
interface Step {
  kind: StepKind;
  caption: string;
}

// Scripted story: healthy traffic, then the Database degrades into 5
// consecutive failures (tripping the breaker), then two instantly-rejected
// requests while open, a quiet trip-duration window, a single recovery
// probe, and a close back to normal — the full state cycle once through.
const STEPS: Step[] = [
  { kind: "success", caption: "Closed — requests pass straight through to the Database. A success keeps the failure streak at zero." },
  { kind: "fail", caption: "The Database starts failing. First consecutive failure — streak: 1 of 5 needed to trip." },
  { kind: "fail", caption: "Second consecutive failure — streak: 2 of 5." },
  { kind: "fail", caption: "Third consecutive failure — streak: 3 of 5." },
  { kind: "fail", caption: "Fourth consecutive failure — streak: 4 of 5. One more trips the breaker." },
  { kind: "fail", caption: "Fifth consecutive failure — threshold reached. The breaker trips open." },
  { kind: "reject", caption: "Open — this request fails instantly. It never reaches the struggling Database." },
  { kind: "reject", caption: "Still open — every request fails fast, giving the Database room to recover instead of piling on more load." },
  { kind: "wait", caption: "Trip Duration elapses — several seconds pass with zero load reaching the Database." },
  { kind: "probe", caption: "Half-Open — exactly one trial request is let through to test whether the Database has recovered." },
  { kind: "success", caption: "The probe succeeds. The failure streak resets and the breaker closes again." },
];

type BreakerState = "closed" | "open" | "half_open";
interface Derived {
  state: BreakerState;
  streak: number;
}

// Replays CircuitBreaker.ts's own transition rules against the script
// above, rather than hand-maintaining badge/streak state in parallel.
const DERIVED: Derived[] = STEPS.reduce<Derived[]>((acc, s) => {
  const prev = acc.length === 0 ? { state: "closed" as BreakerState, streak: 0 } : acc[acc.length - 1];
  let { state, streak } = prev;
  if (s.kind === "fail") {
    streak = Math.min(FAILURE_THRESHOLD, streak + 1);
    if (streak >= FAILURE_THRESHOLD) {
      state = "open";
      streak = 0;
    }
  } else if (s.kind === "probe") {
    state = "half_open";
  } else if (s.kind === "success") {
    streak = 0;
    if (state === "half_open") state = "closed";
  }
  // "reject" and "wait" change nothing — same as the real entity while open.
  acc.push({ state, streak });
  return acc;
}, []);

const BADGE: Record<BreakerState, { label: string; tone: "healthy" | "critical" | "signal" }> = {
  closed: { label: "CLOSED", tone: "healthy" },
  open: { label: "OPEN", tone: "critical" },
  half_open: { label: "HALF-OPEN", tone: "signal" },
};

const STEP_DURATION_S = 2.4;
const REPEAT_PAUSE_S = 1.6;

const clientCenter = { x: CLIENT.x + CLIENT.w / 2, y: CLIENT.y + CLIENT.h / 2 };
const databaseCenter = { x: DATABASE.x + DATABASE.w / 2, y: DATABASE.y + DATABASE.h / 2 };
const breakerEdge = { x: BREAKER.x + 6, y: BREAKER.y + BREAKER.h / 2 + 30 };

export function CircuitBreakerStateMachineDiagram() {
  const { step, paused, togglePaused, playing } = useSteppedAnimation(STEPS.length, STEP_DURATION_S, REPEAT_PAUSE_S);

  const current = STEPS[step];
  const derived = DERIVED[step];
  const badge = BADGE[derived.state];

  return (
    <svg
      viewBox={`0 0 660 ${VIEWBOX_HEIGHT}`}
      {...svgResponsiveProps(660, VIEWBOX_HEIGHT)}
      className="text-text-muted"
      role="img"
      aria-label="Circuit breaker state machine: five consecutive failures trip the breaker open, every request then fails instantly without reaching the Database, and after a trip duration a single trial request probes for recovery and closes the breaker again."
    >
      <ArrowMarker id="circuit-breaker-arrow" />
      <DiagramArrow x1={CLIENT.x + CLIENT.w} y1={clientCenter.y} x2={BREAKER.x} y2={clientCenter.y} markerId="circuit-breaker-arrow" />
      <DiagramArrow x1={BREAKER.x + BREAKER.w} y1={databaseCenter.y} x2={DATABASE.x} y2={databaseCenter.y} markerId="circuit-breaker-arrow" />

      <DiagramBox x={CLIENT.x} y={CLIENT.y} width={CLIENT.w} height={CLIENT.h} lines={["Client"]} icon={ClientIcon} />
      <DiagramBox x={DATABASE.x} y={DATABASE.y} width={DATABASE.w} height={DATABASE.h} lines={["Database"]} icon={DatabaseIcon} />

      {/* Circuit Breaker — a labeled box housing the state badge and the failure-streak slots. */}
      <rect x={BREAKER.x} y={BREAKER.y} width={BREAKER.w} height={BREAKER.h} rx={2} strokeWidth={1} className="fill-bg-elevated stroke-signal" />
      <CircuitBreakerIcon x={BREAKER.x + 16} y={BREAKER.y + 10} width={11} height={11} strokeWidth={2} className="text-signal" aria-hidden />
      <text x={BREAKER.x + 33} y={BREAKER.y + 22} className="fill-signal text-[11px] font-medium">
        Circuit Breaker
      </text>
      <text x={BREAKER.x + 16} y={BREAKER.y + 38} className="fill-text-subtle text-[9.5px]">
        consecutive failures — threshold {FAILURE_THRESHOLD}
      </text>

      {/* State badge, top-right of the box. */}
      <BadgeTone x={BREAKER.x + BREAKER.w - 94} y={BREAKER.y + 8} label={badge.label} tone={badge.tone} />

      {Array.from({ length: FAILURE_THRESHOLD }).map((_, i) => {
        const x = SLOTS_START_X + i * (SLOT_SIZE + SLOT_GAP);
        const filled = i < derived.streak;
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

      {playing && current.kind !== "wait" && <RequestDot key={step} kind={current.kind} />}

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

/** The state badge pill — a small bordered rect + centered label, colored by tone like everything else in this file. */
function BadgeTone({ x, y, label, tone }: { x: number; y: number; label: string; tone: "healthy" | "critical" | "signal" }) {
  const width = 78;
  const height = 18;
  const strokeClass = tone === "healthy" ? "stroke-status-healthy" : tone === "critical" ? "stroke-status-critical" : "stroke-signal";
  const textClass = tone === "healthy" ? "fill-status-healthy" : tone === "critical" ? "fill-status-critical" : "fill-signal";
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={9} strokeWidth={1} className={`fill-bg ${strokeClass}`} />
      <text x={x + width / 2} y={y + height / 2 + 3.5} textAnchor="middle" className={`${textClass} text-[9.5px] font-medium`}>
        {label}
      </text>
    </g>
  );
}

/**
 * One request's journey for a single step. `success`/`fail`/`probe` all
 * travel the full Client → Breaker → Database path (this is a dramatized
 * one-way trip, same abstraction level `RateLimiterTokenBucketDiagram`
 * uses — the caption carries the nuance of which leg actually fails).
 * `reject` stops dead at the breaker's edge and dissolves there, the same
 * "never reaches the target" visual as a rate-limiter rejection. Remounted
 * every step (`key={step}` on the caller) so it always starts fresh.
 */
function RequestDot({ kind }: { kind: Exclude<StepKind, "wait"> }) {
  const reaches = kind !== "reject";
  const target = reaches ? databaseCenter : breakerEdge;
  const color =
    kind === "fail" || kind === "reject"
      ? "var(--color-status-critical)"
      : kind === "probe"
        ? "var(--color-signal)"
        : "var(--color-status-healthy)";

  return (
    <motion.circle
      r={5}
      style={{ filter: "drop-shadow(0 0 4px currentColor)", color }}
      initial={{ cx: clientCenter.x, cy: clientCenter.y, opacity: 0, scale: 1 }}
      animate={{
        cx: [clientCenter.x, target.x, target.x],
        cy: [clientCenter.y, target.y, target.y],
        opacity: [0, 1, reaches ? 1 : 0],
        scale: [1, 1, reaches ? 1 : 0.3],
        fill: color,
      }}
      transition={{ duration: STEP_DURATION_S, times: [0, 0.55, 1], ease: "easeInOut" }}
    />
  );
}
