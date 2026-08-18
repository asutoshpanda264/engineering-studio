"use client";

import { motion } from "framer-motion";
import type { BoxTone } from "../primitives";
import { DiagramBox, svgResponsiveProps } from "../primitives";
import { useSteppedAnimation } from "../useSteppedAnimation";
import { DiagramCaptionBar } from "../DiagramCaptionBar";
import type { EvictionPolicy } from "@/simulation/entities/CacheStore";
import { getEntityCatalogItem } from "@/lib/entityCatalog";

const CacheIcon = getEntityCatalogItem("cache").icon;

/**
 * Cache eviction, animated as a genuine comparison across all four policies
 * `CacheStore.ts` implements (LRU/LFU/FIFO/MRU) — not just LRU in isolation.
 * Per docs/ENTITY-ANIMATIONS-PLAN.md row 4 (the "hit right before eviction"
 * story) plus explicit direction to keep that AND compare policies side by
 * side, matching the precedent set for Load Balancer's algorithms: a single
 * hardcoded policy doesn't teach anything a student can observe or compare
 * (see the "entity algorithm diversity" project memory). Cache's own
 * Inspector already ships all four as selectable config with hit-rate
 * evidence — this diagram is the "how it works" counterpart, watchable
 * rather than configured.
 *
 * One shared key stream is fed to four independent 4-slot caches at once,
 * one per policy. Two eviction moments happen along the way:
 *   1. Key A is hit right before a new key (E) arrives at capacity — FIFO
 *      and MRU evict A anyway (insertion order / "evict what's hot" are
 *      both blind to the save); LRU and LFU both save it, evicting B
 *      instead.
 *   2. C and D pick up extra hits — frequency and recency start to
 *      disagree — and when F arrives, LRU evicts A (its last touch is the
 *      stalest) while LFU evicts E instead (fewer total touches than A,
 *      even though A is chronologically staler). A genuine LRU-vs-LFU
 *      divergence, not a coincidence.
 *
 * `DERIVED` replays the exact same eviction comparator `CacheStore.ts`
 * runs (mirrored below, not imported — same discipline
 * `CircuitBreakerStateMachineDiagram` uses for its transition rules) against
 * the script, once per policy, so every slot shown here is provably what
 * the real entity would do with this traffic — verified against the actual
 * `CacheStore` class while building this (see the conversation this shipped
 * from), not hand-picked.
 */

type OpKind = "insert" | "hit";
interface Op {
  kind: OpKind;
  key: string;
}

interface StepDef {
  ops: Op[];
  opLabel: string;
  caption: string;
}

// Deterministic key stream, identical for all four policies. Verified by
// replaying it through the real `CacheStore` class (capacity 4, all four
// policies) before scripting these captions — see class doc above.
const STEPS: StepDef[] = [
  {
    ops: [
      { kind: "insert", key: "A" },
      { kind: "insert", key: "B" },
      { kind: "insert", key: "C" },
      { kind: "insert", key: "D" },
    ],
    opLabel: "insert A, B, C, D",
    caption: "Capacity 4, same key stream, four eviction policies watching side by side.",
  },
  {
    ops: [{ kind: "hit", key: "A" }],
    opLabel: "hit A",
    caption: "A is requested again — a hit. Every cache records it; not every policy acts on it.",
  },
  {
    ops: [{ kind: "insert", key: "E" }],
    opLabel: "insert E → eviction",
    caption: "New key E, cache full. FIFO and MRU evict A anyway — LRU and LFU save it, evicting B instead.",
  },
  {
    ops: [
      { kind: "hit", key: "C" },
      { kind: "hit", key: "C" },
    ],
    opLabel: "hit C ×2",
    caption: "C gets hit twice. Frequency is climbing for LFU; nothing else notices yet.",
  },
  {
    ops: [{ kind: "hit", key: "D" }],
    opLabel: "hit D",
    caption: "D gets hit once, just now — recent for LRU, but still low-frequency for LFU.",
  },
  {
    ops: [{ kind: "insert", key: "F" }],
    opLabel: "insert F → eviction",
    caption: "New key F. LRU evicts A (stale) — but LFU evicts E instead: fewer touches beats older touches.",
  },
  {
    ops: [],
    opLabel: "",
    caption: "Same traffic, four outcomes: FIFO/MRU ignore usage; LRU tracks recency; LFU tracks frequency.",
  },
];

const CAPACITY = 4;

const POLICIES: { id: EvictionPolicy; label: string; hint: string }[] = [
  { id: "lru", label: "LRU", hint: "least recent" },
  { id: "lfu", label: "LFU", hint: "least frequent" },
  { id: "fifo", label: "FIFO", hint: "oldest inserted" },
  { id: "mru", label: "MRU", hint: "most recent" },
];

interface Slot {
  key: string;
  insertedAt: number;
  lastAccessedAt: number;
  count: number;
}

/** Mirrors `CacheStore.isMoreEvictable` exactly — kept local rather than
 * imported so this stays a diagram, not a dependency on the entity's
 * internals, same choice `CircuitBreakerStateMachineDiagram` made for its
 * transition rules. */
function moreEvictable(candidate: Slot, current: Slot, policy: EvictionPolicy): boolean {
  switch (policy) {
    case "fifo":
      return candidate.insertedAt < current.insertedAt;
    case "lru":
      return candidate.lastAccessedAt < current.lastAccessedAt;
    case "mru":
      return candidate.lastAccessedAt > current.lastAccessedAt;
    case "lfu":
      if (candidate.count !== current.count) return candidate.count < current.count;
      return candidate.insertedAt < current.insertedAt;
  }
}

interface StepSnapshot {
  slots: (Slot | null)[];
  hitIndices: number[];
}

/** Replays the full script against one policy, snapshotting slot contents
 * after every step. Physical slot index is just "where it happens to sit
 * on screen" — an evicted slot's index is reused by whatever replaces it,
 * so a viewer sees the same box change contents rather than items
 * reshuffling positions every step. */
function replay(policy: EvictionPolicy): StepSnapshot[] {
  const slots: (Slot | null)[] = [null, null, null, null];
  let tick = 0;
  const snapshots: StepSnapshot[] = [];

  for (const step of STEPS) {
    const hitIndices: number[] = [];
    for (const op of step.ops) {
      tick++;
      if (op.kind === "hit") {
        const idx = slots.findIndex((s) => s?.key === op.key);
        if (idx === -1) continue;
        const s = slots[idx]!;
        slots[idx] = { ...s, lastAccessedAt: tick, count: s.count + 1 };
        hitIndices.push(idx);
        continue;
      }
      let idx = slots.findIndex((s) => s === null);
      if (idx === -1) {
        idx = 0;
        for (let i = 1; i < slots.length; i++) {
          if (moreEvictable(slots[i]!, slots[idx]!, policy)) idx = i;
        }
      }
      slots[idx] = { key: op.key, insertedAt: tick, lastAccessedAt: tick, count: 1 };
    }
    snapshots.push({ slots: [...slots], hitIndices });
  }
  return snapshots;
}

const DERIVED: Record<EvictionPolicy, StepSnapshot[]> = {
  lru: replay("lru"),
  lfu: replay("lfu"),
  fifo: replay("fifo"),
  mru: replay("mru"),
};

const EMPTY_SLOTS: (Slot | null)[] = [null, null, null, null];

/** Neutral (untouched), signal (freshly inserted into an empty slot),
 * critical (this insert evicted whatever was here), or healthy (hit). */
function slotTone(policy: EvictionPolicy, step: number, slotIndex: number): BoxTone {
  const current = DERIVED[policy][step];
  if (current.hitIndices.includes(slotIndex)) return "healthy";
  const currentKey = current.slots[slotIndex]?.key ?? null;
  const previousKey = (step === 0 ? EMPTY_SLOTS : DERIVED[policy][step - 1].slots)[slotIndex]?.key ?? null;
  if (currentKey === previousKey) return "neutral";
  return previousKey === null ? "signal" : "critical";
}

const ROW_LABEL_W = 84;
const ROW_LABEL_H = 30;
const SLOT_SIZE = 28;
const SLOT_GAP = 8;
const ROWS_START_Y = 30;
const ROW_H = 40;
const CAPTION_Y = 200;
const VIEWBOX_HEIGHT = 230;

export function CacheEvictionDiagram() {
  const { step, paused, togglePaused, playing } = useSteppedAnimation(STEPS.length, 2.6, 1.8);
  const current = STEPS[step];

  return (
    <svg
      viewBox={`0 0 660 ${VIEWBOX_HEIGHT}`}
      {...svgResponsiveProps(660, VIEWBOX_HEIGHT)}
      className="text-text-muted"
      role="img"
      aria-label="Cache eviction policies compared: the same key stream fed to four independently-policied caches at once. LRU and LFU both save a key that was just hit; FIFO and MRU evict it anyway. As frequency and recency diverge, LRU and LFU end up disagreeing too."
    >
      {playing && (
        <text x={8} y={16} className="fill-text-subtle text-[9.5px] font-medium">
          {current.opLabel ? `Operation: ${current.opLabel}` : "Same stream, four caches, four different final states."}
        </text>
      )}

      {POLICIES.map((policy, rowIndex) => {
        const rowY = ROWS_START_Y + rowIndex * ROW_H;
        const snapshot = DERIVED[policy.id][step];
        return (
          <g key={policy.id}>
            <DiagramBox x={8} y={rowY} width={ROW_LABEL_W} height={ROW_LABEL_H} lines={[policy.label, policy.hint]} icon={CacheIcon} />
            {Array.from({ length: CAPACITY }).map((_, i) => {
              const x = 8 + ROW_LABEL_W + 10 + i * (SLOT_SIZE + SLOT_GAP);
              const y = rowY + (ROW_LABEL_H - SLOT_SIZE) / 2;
              const keyLabel = snapshot.slots[i]?.key ?? null;
              return <SlotSquare key={i} x={x} y={y} size={SLOT_SIZE} keyLabel={keyLabel} tone={slotTone(policy.id, step, i)} />;
            })}
          </g>
        );
      })}

      {playing && (
        <DiagramCaptionBar y={CAPTION_Y} caption={current.caption} captionKey={step} paused={paused} onTogglePause={togglePaused} />
      )}
    </svg>
  );
}

const TONE_STROKE: Record<BoxTone, string> = {
  neutral: "stroke-border",
  signal: "stroke-signal",
  healthy: "stroke-status-healthy",
  critical: "stroke-status-critical",
};

const TONE_TEXT: Record<BoxTone, string> = {
  neutral: "fill-text-subtle",
  signal: "fill-signal",
  healthy: "fill-status-healthy",
  critical: "fill-status-critical",
};

/** One capacity slot. Border/text color swaps outright by tone (a plain
 * conditional class, same choice the reference diagrams make — only
 * opacity gets Motion-interpolated); the key letter remounts and fades in
 * whenever the slot's contents actually change, `DiagramCaptionBar`'s
 * crossfade technique applied at slot granularity so there's no shared
 * keyframe boundary to overlap. */
function SlotSquare({ x, y, size, keyLabel, tone }: { x: number; y: number; size: number; keyLabel: string | null; tone: BoxTone }) {
  return (
    <g>
      <motion.rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={3}
        strokeWidth={1}
        className={`fill-bg-elevated ${TONE_STROKE[tone]}`}
        initial={false}
        animate={{ opacity: keyLabel ? 1 : 0.35 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      />
      {keyLabel && (
        <motion.text
          key={keyLabel}
          x={x + size / 2}
          y={y + size / 2 + 4}
          textAnchor="middle"
          className={`${TONE_TEXT[tone]} text-[11px] font-semibold`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {keyLabel}
        </motion.text>
      )}
    </g>
  );
}
