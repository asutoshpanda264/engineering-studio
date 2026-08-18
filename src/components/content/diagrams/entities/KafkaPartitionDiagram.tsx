"use client";

import { DiagramBox, svgResponsiveProps } from "../primitives";
import { useSteppedAnimation } from "../useSteppedAnimation";
import { DiagramCaptionBar } from "../DiagramCaptionBar";
import { hashStringToIndex } from "@/simulation/entities/hashRouting";
import { getEntityCatalogItem } from "@/lib/entityCatalog";

const KafkaIcon = getEntityCatalogItem("kafka").icon;
const ApiIcon = getEntityCatalogItem("api").icon;

/**
 * Kafka's one genuinely distinct mechanism vs. Message Queue's Topic mode
 * (which already dramatizes "independent consumer groups don't block each
 * other" — no need to re-tell that story here, see
 * `MessageQueueDeliveryModeDiagram`): the ordering-vs-parallelism tradeoff
 * a single Partition Count decision makes, per `entityDeepDive.ts`'s pros
 * ("makes the ordering-vs-parallelism tradeoff something you can watch
 * happen") and `Kafka.ts`'s own class doc.
 *
 * Two beats, one shared setup (2 partitions, one consumer group
 * deliberately over-provisioned at 4 consumers):
 *   1. A message's partition is `hashStringToIndex(key, partitionCount)` —
 *      imported directly from the real `hashRouting.ts` (a tiny pure
 *      function, not a stateful class, so unlike `CacheEvictionDiagram`'s
 *      locally-mirrored comparator this one's safe and cheap to just call
 *      live) — so `user-1` deterministically lands in the same partition
 *      every time, and a different key doesn't.
 *   2. `Kafka.ts`'s own formula, `Math.max(1, Math.min(consumerCountPerGroup,
 *      partitionCount))`, caps this group's real parallelism at 2 — the
 *      other 2 consumers are structurally idle for the entire run, no
 *      matter how much traffic arrives. This is the entity's most commonly
 *      cited real-world misconfiguration, per its own featured failure
 *      mode ("Wasted Consumers Past the Partition Ceiling").
 */

const PARTITION_COUNT = 2;
const CONSUMER_COUNT_PER_GROUP = 4;
const EFFECTIVE_CONCURRENCY = Math.max(1, Math.min(CONSUMER_COUNT_PER_GROUP, PARTITION_COUNT));

interface StepDef {
  key: string | null;
  caption: string;
}

// Deterministic publish stream — real partition assignment computed below
// via the actual hashStringToIndex, not hand-picked.
const STEPS: StepDef[] = [
  { key: "user-1", caption: "user-1 is published. Its key hashes to Partition 0 — every message with this key will always land here." },
  { key: "user-2", caption: "user-2 hashes to Partition 1. A different key means no ordering promise between the two — only within a partition." },
  { key: "user-1", caption: "user-1 again — same key, same Partition 0, deterministically. That's Kafka's actual ordering guarantee." },
  { key: "user-4", caption: "user-4 also lands in Partition 1. Only 2 partitions exist here, so different keys do sometimes share one." },
  {
    key: null,
    caption: "4 consumers in this group, only 2 partitions — 2 sit permanently idle. A 5th consumer helps nothing; more partitions would.",
  },
];

const PARTITIONS = Array.from({ length: PARTITION_COUNT }, (_, i) => i);

// Which partition each step's key lands in, via the real hash function.
const STEP_PARTITION: (number | null)[] = STEPS.map((s) => (s.key ? hashStringToIndex(s.key, PARTITION_COUNT) : null));

// Cumulative per-partition log — the append-only sequence each partition
// has received by this step, derived rather than hand-maintained.
const PARTITION_LOG: string[][][] = STEPS.reduce<string[][][]>((acc, s, i) => {
  const prev = acc.length === 0 ? PARTITIONS.map(() => [] as string[]) : acc[acc.length - 1].map((log) => [...log]);
  const p = STEP_PARTITION[i];
  if (s.key && p !== null) prev[p].push(s.key);
  acc.push(prev);
  return acc;
}, []);

const PARTITION_W = 316;
const PARTITION_H = 56;
const PARTITION_Y = 30;
const CONSUMER_LABEL_Y = 102;
const CONSUMER_ROW_Y = 108;
const CONSUMER_H = 40;
const CONSUMER_W = 150;
const CONSUMER_GAP = 14;
const CAPTION_Y = 160;
const VIEWBOX_HEIGHT = 198;

export function KafkaPartitionDiagram() {
  const { step, paused, togglePaused, playing } = useSteppedAnimation(STEPS.length, 2.6, 1.8);
  const current = STEPS[step];
  const activePartition = STEP_PARTITION[step];
  const logs = PARTITION_LOG[step];

  return (
    <svg
      viewBox={`0 0 660 ${VIEWBOX_HEIGHT}`}
      {...svgResponsiveProps(660, VIEWBOX_HEIGHT)}
      className="text-text-muted"
      role="img"
      aria-label="Kafka partitioning: each message's key deterministically hashes to one partition, guaranteeing order within that partition but not across partitions. A consumer group with more consumers than partitions leaves the extra consumers permanently idle, since parallelism is capped at the partition count."
    >
      {playing && (
        <text x={8} y={16} className="fill-text-subtle text-[9.5px] font-medium">
          {current.key ? `Publish: ${current.key} → Partition ${activePartition}` : "No new messages this step"}
        </text>
      )}

      {PARTITIONS.map((p) => {
        const box = { x: 8 + p * (PARTITION_W + 20), y: PARTITION_Y, w: PARTITION_W, h: PARTITION_H };
        const active = activePartition === p;
        return (
          <g key={p}>
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx={2}
              strokeWidth={1}
              className={active ? "fill-bg-elevated stroke-signal" : "fill-bg-elevated stroke-border"}
            />
            <KafkaIcon
              x={box.x + 10}
              y={box.y + 6}
              width={10}
              height={10}
              strokeWidth={2}
              className={active ? "text-signal" : "text-text-subtle"}
              aria-hidden
            />
            <text
              x={box.x + 24}
              y={box.y + 16}
              className={active ? "fill-signal text-[10px] font-medium" : "fill-text-subtle text-[10px] font-medium"}
            >
              {`Partition ${p}`}
            </text>
            {logs[p].map((key, i) => (
              <g key={`${key}-${i}`}>
                <rect x={box.x + 10 + i * 62} y={box.y + 26} width={54} height={20} rx={3} strokeWidth={1} className="fill-bg stroke-border-hover" />
                <text x={box.x + 10 + i * 62 + 27} y={box.y + 40} textAnchor="middle" className="fill-text text-[9px]">
                  {key}
                </text>
              </g>
            ))}
          </g>
        );
      })}

      {playing && (
        <text x={8} y={CONSUMER_LABEL_Y} className="fill-text-subtle text-[9.5px] font-medium">
          {`Consumer group — ${CONSUMER_COUNT_PER_GROUP} consumers, ${PARTITION_COUNT} partitions (${EFFECTIVE_CONCURRENCY} ever actually used)`}
        </text>
      )}

      {Array.from({ length: CONSUMER_COUNT_PER_GROUP }).map((_, i) => {
        const x = 8 + i * (CONSUMER_W + CONSUMER_GAP);
        const boundPartition = i < EFFECTIVE_CONCURRENCY ? i : null;
        const isActive = boundPartition !== null && boundPartition === activePartition;
        const label = `C${i + 1}`;
        const hint = boundPartition !== null ? `reads P${boundPartition}` : "no partition — idle";
        return (
          <ConsumerBox
            key={i}
            x={x}
            y={CONSUMER_ROW_Y}
            width={CONSUMER_W}
            height={CONSUMER_H}
            label={label}
            hint={hint}
            wasted={boundPartition === null}
            active={isActive}
          />
        );
      })}

      {playing && (
        <DiagramCaptionBar y={CAPTION_Y} caption={current.caption} captionKey={step} paused={paused} onTogglePause={togglePaused} />
      )}
    </svg>
  );
}

/** One consumer's box. Structurally-wasted consumers (past the partition
 * ceiling) render dashed and dim for the whole run — the same "not real /
 * not doing anything" visual `LoadBalancerRoutingDiagram` uses for
 * not-yet-added servers, reused here for "never will be used" instead of
 * "not yet." A bound consumer flashes signal-toned for exactly the step
 * its partition receives a message. */
function ConsumerBox({
  x,
  y,
  width,
  height,
  label,
  hint,
  wasted,
  active,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  hint: string;
  wasted: boolean;
  active: boolean;
}) {
  if (wasted) {
    return <DiagramBox x={x} y={y} width={width} height={height} lines={[label, hint]} dashed icon={ApiIcon} />;
  }
  return <DiagramBox x={x} y={y} width={width} height={height} lines={[label, hint]} tone={active ? "signal" : "neutral"} icon={ApiIcon} />;
}
