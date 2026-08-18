"use client";

import { motion } from "framer-motion";
import { DiagramBox, svgResponsiveProps } from "../primitives";
import { useSteppedAnimation } from "../useSteppedAnimation";
import { DiagramCaptionBar } from "../DiagramCaptionBar";
import { getEntityCatalogItem } from "@/lib/entityCatalog";

const MessageQueueIcon = getEntityCatalogItem("message_queue").icon;

/**
 * Message Queue's `deliveryMode`, animated as a real comparison — Queue
 * (point-to-point, one shared consumer pool) vs Topic (fan-out, every
 * subscriber gets its own independent copy and its own backlog) — per
 * `MessageQueue.ts`'s own class doc: "modeled as a comparable config axis
 * the same way Load Balancer ships comparable algorithms," and per the
 * project's "entity algorithm diversity" precedent (don't hardcode one
 * mode as the answer). Three independently-run instances (Queue, and two
 * Topic subscribers S1/S2) receive the exact same publish stream at once.
 *
 * The story leans on the same "identical when equal, diverges once
 * unequal" shape the Load Balancer comparison established: Queue and
 * Topic's S1 both run one consumer at the same dispatch speed, so they
 * track each other exactly the whole way through — S2 is deliberately
 * slower (2 steps per message instead of 1), and that alone is what makes
 * it fall behind, not the delivery mode itself. What the divergence
 * demonstrates is Topic's real claim: S2 backing up never touches Queue
 * or S1's state even slightly, because there's no shared backlog between
 * subscribers to overflow.
 *
 * The second thing dramatized: every "acknowledged instantly" claim in
 * `entityDeepDive.ts`'s summary — the producer's ack fires the moment a
 * message is durably admitted, never gated on when any consumer actually
 * gets to it. Shown as a checkmark line that fires every arrival step,
 * independent of whatever the three rows below are doing with dispatch.
 *
 * `DERIVED` runs a small local one-consumer/one-backlog simulation per
 * row (advance in-flight work, then admit this step's arrival) — simple
 * enough to not need replaying the real `MessageQueue`/`BoundedProcessor`
 * classes (their dispatch timing is randomized-jitter/ms-based; this
 * diagram's "step" is a scripted beat, not a millisecond), but verified
 * against a scratch run before any captions were written, same discipline
 * `CacheEvictionDiagram` used.
 */

interface StepDef {
  arrival: string | null;
  caption: string;
}

// Deterministic publish stream: M1, M2, M3 one per step, then a quiet step
// with nothing new arriving so the divergence has room to read clearly.
const STEPS: StepDef[] = [
  {
    arrival: "M1",
    caption: "M1 is published. Queue and Topic both acknowledge the producer instantly — before any consumer starts.",
  },
  {
    arrival: "M2",
    caption: "M2 is published. Queue and S1 already finished M1 and pick it up — S2 is still on M1, so M2 waits in S2's own backlog.",
  },
  {
    arrival: "M3",
    caption: "M3 is published. S2 moves on to M2, but M3 backs up behind it. Queue and S1 haven't lost a step.",
  },
  {
    arrival: null,
    caption: "Traffic stops. Queue and S1 are already idle — S2 is still working through its own backlog, entirely on its own.",
  },
  {
    arrival: null,
    caption: "Same messages, two shapes: Queue hands each one to a shared pool. Topic gives every subscriber its own copy — and its own pace.",
  },
];

interface RowSnapshot {
  current: string | null;
  backlog: string[];
}

/** One row's tiny simulation: a single consumer + FIFO backlog. Mirrors
 * `BoundedProcessor`'s admit/complete shape at a conceptual level (a slot
 * frees, then pulls the next backlog item) without needing its real
 * timing — see class doc. */
function makeRow(dispatchSteps: number) {
  let current: { msgId: string; remaining: number } | null = null;
  let backlog: string[] = [];

  return {
    tick(arrival: string | null): RowSnapshot {
      if (current) {
        current.remaining--;
        if (current.remaining <= 0) {
          current = null;
          const next = backlog.shift();
          if (next) current = { msgId: next, remaining: dispatchSteps };
        }
      }
      if (arrival) {
        if (!current) {
          current = { msgId: arrival, remaining: dispatchSteps };
        } else {
          backlog = [...backlog, arrival];
        }
      }
      return { current: current?.msgId ?? null, backlog: [...backlog] };
    },
  };
}

interface Derived {
  queue: RowSnapshot;
  s1: RowSnapshot;
  s2: RowSnapshot;
}

const DERIVED: Derived[] = (() => {
  const queue = makeRow(1);
  const s1 = makeRow(1);
  const s2 = makeRow(2);
  return STEPS.map((s) => ({ queue: queue.tick(s.arrival), s1: s1.tick(s.arrival), s2: s2.tick(s.arrival) }));
})();

const ROWS: { key: keyof Derived; label: string; hint: string }[] = [
  { key: "queue", label: "Queue", hint: "shared pool" },
  { key: "s1", label: "Topic → S1", hint: "own copy, fast" },
  { key: "s2", label: "Topic → S2", hint: "own copy, slow" },
];

const ROW_LABEL_W = 110;
const ROW_LABEL_H = 30;
const SLOT_SIZE = 30;
const ROWS_START_Y = 44;
const ROW_H = 42;
const CAPTION_Y = 202;
const VIEWBOX_HEIGHT = 232;

export function MessageQueueDeliveryModeDiagram() {
  const { step, paused, togglePaused, playing } = useSteppedAnimation(STEPS.length, 2.6, 1.8);
  const current = STEPS[step];
  const derived = DERIVED[step];

  return (
    <svg
      viewBox={`0 0 660 ${VIEWBOX_HEIGHT}`}
      {...svgResponsiveProps(660, VIEWBOX_HEIGHT)}
      className="text-text-muted"
      role="img"
      aria-label="Message Queue delivery modes compared: the same publish stream sent to a Queue (shared consumer pool) and a Topic (independent copy per subscriber). A slower subscriber falls behind on its own backlog without ever affecting the shared queue or a faster subscriber."
    >
      {playing && (
        <text x={8} y={16} className="fill-text-subtle text-[9.5px] font-medium">
          {current.arrival ? `Publish: ${current.arrival}` : "No new messages this step"}
        </text>
      )}
      {playing && current.arrival && (
        <motion.text
          key={current.arrival + step}
          x={8}
          y={30}
          className="fill-status-healthy text-[9px] font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {`✓ ${current.arrival} acknowledged instantly`}
        </motion.text>
      )}

      {ROWS.map((row, rowIndex) => {
        const rowY = ROWS_START_Y + rowIndex * ROW_H;
        const snapshot = derived[row.key];
        return (
          <g key={row.key}>
            <DiagramBox x={8} y={rowY} width={ROW_LABEL_W} height={ROW_LABEL_H} lines={[row.label, row.hint]} icon={MessageQueueIcon} />
            <ConsumerSlot x={8 + ROW_LABEL_W + 14} y={rowY} size={SLOT_SIZE} rowHeight={ROW_LABEL_H} msgId={snapshot.current} />
            {snapshot.backlog.length > 0 && (
              <text
                x={8 + ROW_LABEL_W + 14 + SLOT_SIZE + 14}
                y={rowY + ROW_LABEL_H / 2 + 4}
                className="fill-status-critical text-[9.5px] font-medium"
              >
                {`+${snapshot.backlog.length} waiting (${snapshot.backlog.join(", ")})`}
              </text>
            )}
          </g>
        );
      })}

      {playing && (
        <DiagramCaptionBar y={CAPTION_Y} caption={current.caption} captionKey={step} paused={paused} onTogglePause={togglePaused} />
      )}
    </svg>
  );
}

/** A single consumer's occupancy — signal-toned (in-flight work) while
 * busy, dim/neutral while idle. The message id crossfades in via a
 * content-keyed remount, same technique `CacheEvictionDiagram`'s
 * `SlotSquare` uses, whenever the row picks up a new message. */
function ConsumerSlot({ x, y, size, rowHeight, msgId }: { x: number; y: number; size: number; rowHeight: number; msgId: string | null }) {
  const slotY = y + (rowHeight - size) / 2;
  return (
    <g>
      <motion.rect
        x={x}
        y={slotY}
        width={size}
        height={size}
        rx={3}
        strokeWidth={1}
        className={msgId ? "fill-bg-elevated stroke-signal" : "fill-bg-elevated stroke-border"}
        initial={false}
        animate={{ opacity: msgId ? 1 : 0.35 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      />
      {msgId && (
        <motion.text
          key={msgId}
          x={x + size / 2}
          y={slotY + size / 2 + 4}
          textAnchor="middle"
          className="fill-signal text-[10px] font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {msgId}
        </motion.text>
      )}
    </g>
  );
}
