import { useId } from "react";
import { ArrowMarker, DiagramArrow, svgResponsiveProps } from "../primitives";
import type { SequenceActor, SequenceMessage } from "@/content/shared/lesson";

/**
 * Generic two/three-party message exchange over time — handshakes,
 * request/response. N evenly-spaced vertical lifelines, each with a
 * labeled box at top; each message is a horizontal arrow at a fixed row,
 * direction following whichever actor is left vs. right, label centered
 * above the arrow (reuses `DiagramArrow`'s own label placement).
 */

const BOX_Y = 4;
const BOX_W = 130;
const BOX_H = 30;
const FIRST_MSG_Y = 66;
const ROW_HEIGHT = 46;
const BOTTOM_PAD = 20;
const COL_WIDTH = 220;

export function SequenceDiagram({ actors, messages }: { actors: SequenceActor[]; messages: SequenceMessage[] }) {
  const arrowId = `sequence-arrow-${useId()}`;
  const width = Math.max(actors.length * COL_WIDTH, 300);
  const height = FIRST_MSG_Y + ROW_HEIGHT * Math.max(messages.length - 1, 0) + BOTTOM_PAD;
  const xById = new Map(actors.map((actor, i) => [actor.id, (i + 0.5) * (width / actors.length)]));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      {...svgResponsiveProps(width, height)}
      className="text-text-muted"
      role="img"
      aria-label={`Message sequence between ${actors.map((actor) => actor.label).join(" and ")}: ${messages
        .map((msg) => msg.label)
        .join(", ")}.`}
    >
      <ArrowMarker id={arrowId} />

      {actors.map((actor) => {
        const x = xById.get(actor.id)!;
        return (
          <g key={actor.id}>
            <rect x={x - BOX_W / 2} y={BOX_Y} width={BOX_W} height={BOX_H} rx={2} strokeWidth={1} className="fill-bg-elevated stroke-border" />
            <text x={x} y={BOX_Y + BOX_H / 2 + 4} textAnchor="middle" className="fill-text text-[11px] font-medium">
              {actor.label}
            </text>
            <line
              x1={x}
              y1={BOX_Y + BOX_H}
              x2={x}
              y2={height - BOTTOM_PAD}
              strokeWidth={1}
              strokeDasharray="3 3"
              className="stroke-border"
            />
          </g>
        );
      })}

      {messages.map((msg, i) => {
        const y = FIRST_MSG_Y + ROW_HEIGHT * i;
        return (
          <DiagramArrow
            key={i}
            x1={xById.get(msg.from)!}
            y1={y}
            x2={xById.get(msg.to)!}
            y2={y}
            markerId={arrowId}
            label={msg.label}
            dashed={msg.dashed}
            tone={msg.tone}
          />
        );
      })}
    </svg>
  );
}
