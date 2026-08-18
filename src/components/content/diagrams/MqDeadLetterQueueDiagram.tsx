import { ArrowMarker, DiagramArrow, DiagramBox, svgResponsiveProps } from "./primitives";
import { getEntityCatalogItem } from "@/lib/entityCatalog";

const ApiIcon = getEntityCatalogItem("api").icon;
const MessageQueueIcon = getEntityCatalogItem("message_queue").icon;

/**
 * Dead Letter Queue, as two small panels instead of the ascii-style
 * "[msg1] [msg2] [msg3_broken] [msg4] [msg5]" sublabel the generic
 * `architecture` block was cramming into one 150px-wide box (it overflowed
 * badly — the actual bug behind "the diagrams are so ugly"). Same
 * before/after panel shape `DnsFailoverDiagram` established: left panel is
 * the failure loop (consumer keeps NACKing msg3, broker keeps redelivering
 * it), right panel is the outcome (msg3 moved out to the DLQ, ops team
 * replays it once the bug's fixed) — the two things the surrounding prose
 * actually walks through.
 *
 * Messages are individual numbered slots (reusing `DiagramBox` at a small
 * size) rather than one long bracket-separated string, so nothing has to
 * fit unbounded text into a fixed-width box.
 */

const ARROW_NEUTRAL = "mq-dlq-arrow-neutral";
const ARROW_CRITICAL = "mq-dlq-arrow-critical";
const ARROW_HEALTHY = "mq-dlq-arrow-healthy";

const SLOT = 30;
const SLOT_STEP = SLOT + 6;
const SLOT_Y = 36;

const PANEL_B_X = 340;

export function MqDeadLetterQueueDiagram() {
  return (
    <svg
      viewBox="0 0 660 156"
      {...svgResponsiveProps(660, 156)}
      className="text-text-muted"
      role="img"
      aria-label="Dead letter queue: msg3 fails 3 times as the consumer NACKs and the broker keeps redelivering it. After the 3rd failure, the broker moves msg3 out of the order queue into the dead letter queue instead of retrying forever. The ops team investigates, fixes the bug, and replays msg3 back into the queue."
    >
      <ArrowMarker id={ARROW_NEUTRAL} />
      <ArrowMarker id={ARROW_CRITICAL} tone="critical" />
      <ArrowMarker id={ARROW_HEALTHY} tone="healthy" />

      {/* Panel A — the retry loop, still inside the queue */}
      <text x={0} y={12} className="fill-text-subtle text-[10px] font-medium uppercase tracking-wide">
        Attempts 1–3 — same failure
      </text>

      {["1", "2", "3", "4", "5"].map((n, i) => (
        <DiagramBox
          key={`a-${n}`}
          x={i * SLOT_STEP}
          y={SLOT_Y}
          width={SLOT}
          height={SLOT}
          lines={[n]}
          tone={n === "3" ? "critical" : "neutral"}
          dashed={n === "3"}
        />
      ))}

      {/* Consumer sits directly under slot 3 (not beside the row) so the
          dispatch/redeliver arrows drop straight down instead of cutting
          across slots 4 and 5. */}
      <DiagramBox x={17} y={90} width={140} height={40} lines={["Consumer", "attempt 3 — fails"]} tone="critical" icon={ApiIcon} />

      <DiagramArrow x1={78} y1={66} x2={78} y2={90} markerId={ARROW_NEUTRAL} />
      <DiagramArrow x1={96} y1={90} x2={96} y2={66} markerId={ARROW_CRITICAL} dashed tone="critical" label="redeliver ×3" />

      {/* Panel B — moved out to the DLQ, then replayed */}
      <text x={PANEL_B_X} y={12} className="fill-text-subtle text-[10px] font-medium uppercase tracking-wide">
        After the 3rd failure
      </text>

      {["1", "2", null, "4", "5"].map((n, i) => (
        <DiagramBox
          key={`b-${i}`}
          x={PANEL_B_X + i * SLOT_STEP}
          y={SLOT_Y}
          width={SLOT}
          height={SLOT}
          lines={[n ?? "–"]}
          tone="neutral"
          dashed={n === null}
        />
      ))}

      <DiagramBox x={PANEL_B_X} y={104} width={140} height={44} lines={["Dead Letter Queue", "msg3_broken"]} tone="critical" icon={MessageQueueIcon} />
      <DiagramBox x={PANEL_B_X + 150} y={104} width={140} height={44} lines={["Ops team", "fix & replay"]} tone="healthy" />

      <DiagramArrow x1={PANEL_B_X + 87} y1={66} x2={PANEL_B_X + 70} y2={104} markerId={ARROW_CRITICAL} tone="critical" />
      <DiagramArrow x1={PANEL_B_X + 140} y1={126} x2={PANEL_B_X + 150} y2={126} markerId={ARROW_NEUTRAL} />

      <path
        d={`M${PANEL_B_X + 220},104 L${PANEL_B_X + 220},22 L${PANEL_B_X + 87},22 L${PANEL_B_X + 87},36`}
        fill="none"
        strokeWidth={1}
        strokeDasharray="3 3"
        className="stroke-status-healthy"
        markerEnd={`url(#${ARROW_HEALTHY})`}
      />
      <text x={PANEL_B_X + 154} y={18} textAnchor="middle" className="fill-text-subtle text-[9px]">
        replay after fix
      </text>
    </svg>
  );
}
