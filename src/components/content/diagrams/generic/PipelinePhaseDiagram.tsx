"use client";

import { useId } from "react";
import type { ComponentType, SVGProps } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowMarker, estimateMaxChars, wrapText } from "../primitives";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import type { PipelineIconId, PipelineNode, PipelineSideNode } from "@/content/shared/lesson";

type DiagramIcon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Hand-drawn on the same 24×24 outline grid (round caps/joins, single
 * stroke weight) the imported Lucide/entity-catalog icons already use —
 * `Client`/`LLM Call` intentionally keep their real `ENTITY_CATALOG` glyph
 * (same icon those entities show on `/entities/[slug]` and the Workshop
 * canvas, a deliberate cross-diagram consistency this file shouldn't
 * break), so these five need to sit in the same visual family rather than
 * clash with them. Motif-matched to the reference diagram this figure is
 * modeled on: a small vector graph for embedding, a database cylinder for
 * the store, stacked pages for the raw corpus, a pair of braces for
 * assembling a prompt, a checked card for the final answer.
 */
const EmbeddingIcon: DiagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="2" />
    <circle cx="5.5" cy="18" r="2" />
    <circle cx="18.5" cy="18" r="2" />
    <line x1="11.1" y1="6.8" x2="6.4" y2="16.2" />
    <line x1="12.9" y1="6.8" x2="17.6" y2="16.2" />
    <line x1="7.5" y1="18" x2="16.5" y2="18" />
  </svg>
);

const VectorDbIcon: DiagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v12a8 3 0 0 0 16 0V6" />
    <path d="M4 12a8 3 0 0 0 16 0" />
    <circle cx="9" cy="15.3" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="17.2" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="16" cy="14.6" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);

const DataSourceIcon: DiagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="7" y="4" width="14" height="12" rx="1.5" className="fill-bg-elevated" />
    <rect x="3" y="8" width="14" height="12" rx="1.5" className="fill-bg-elevated" />
    <line x1="6" y1="12.5" x2="14" y2="12.5" />
    <line x1="6" y1="16" x2="14" y2="16" />
  </svg>
);

const CombineIcon: DiagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.5 4.5c-2 0-3 1-3 3v2.5c0 1.2-.6 2-2 2 1.4 0 2 .8 2 2V17c0 2 1 3 3 3" />
    <path d="M14.5 4.5c2 0 3 1 3 3v2.5c0 1.2.6 2 2 2-1.4 0-2 .8-2 2V17c0 2-1 3-3 3" />
  </svg>
);

const OutputIcon: DiagramIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 12.5l3 3 7-7.5" />
  </svg>
);

/**
 * `PipelineDiagram`'s sibling for the one topology where the actual lesson
 * *is* the shape of the pipeline: which stretch is embedding, which is
 * retrieval, which is generation, and which is just plumbing moving data
 * between them. Two differences from the plain variant, both in service of
 * that: nodes past the midpoint wrap onto a second row (right-to-left, so
 * the whole figure reads as one loop instead of running off the page), and
 * each node is colored by *what kind of step it is* via the `--color-rag-*`
 * tokens — `globals.css`'s own comment on those tokens is the reason this
 * is a separate component rather than a mode on `PipelineDiagram`: the
 * "color is status, never category" rule is real everywhere else, and a
 * one-off exception belongs in a one-off component, not a flag quietly
 * available on the system's main pipeline primitive.
 *
 * `animated` (opt-in, off unless content sets it, always inert under
 * `prefers-reduced-motion`) adds a traveling request dot on the main chain
 * only — see the `PipelinePhaseDiagram` prop doc below for why the offline
 * branch never plays.
 *
 * The two-row wrap is index-based, not hardcoded to any particular node
 * count: nodes `[0, topCount)` lay out left-to-right on the top row,
 * `[topCount, n)` continue right-to-left on the bottom row, column-aligned
 * so the node directly below the last top node is the first bottom node —
 * the same loop `docs/`'s reference RAG diagrams draw by hand.
 */

const CONCEPT_ICONS: Record<PipelineIconId, DiagramIcon> = {
  embedding: EmbeddingIcon,
  "vector-db": VectorDbIcon,
  "data-source": DataSourceIcon,
  combine: CombineIcon,
  output: OutputIcon,
};

type Phase = "io" | "embed" | "retrieve" | "generate" | "corpus";

const PHASE_CLASSES: Record<Phase, { border: string; icon: string; tag: string; dash?: string }> = {
  io: { border: "stroke-border-hover", icon: "text-text-muted", tag: "fill-text-subtle" },
  embed: { border: "stroke-rag-embed", icon: "text-rag-embed", tag: "fill-rag-embed" },
  retrieve: { border: "stroke-rag-retrieve", icon: "text-rag-retrieve", tag: "fill-rag-retrieve" },
  generate: { border: "stroke-rag-generate", icon: "text-rag-generate", tag: "fill-rag-generate" },
  corpus: { border: "stroke-rag-corpus", icon: "text-rag-corpus", tag: "fill-rag-corpus", dash: "3 5" },
};

const CARD_W = 152;
const CARD_H = 84;
const GAP = 66; // horizontal space between row cards, for the arrow + its (possibly 2-line) label
const ROW_GAP_Y = 92; // vertical space between the two rows, for the drop connector + its label
const SIDE_CARD_H = 48; // 18px icon + label both need to clear the card's own bottom edge — 40 clipped the label into the border
const SIDE_LINE_H = 11;
const PAD_X = 18;
const PAD_TOP = 18;
const ICON_SIZE = 30;

/** Same resolution order `PipelineDiagram.iconFor` uses — an entity's own catalog icon first, else the small conceptual set above. */
function iconFor(node: PipelineNode): DiagramIcon | undefined {
  if (node.entityType) return getEntityCatalogItem(node.entityType).icon;
  if (node.icon) return CONCEPT_ICONS[node.icon];
  return undefined;
}

/**
 * What kind of step this node is, for coloring — derived from the same
 * `entityType`/`icon` fields content already sets, never a new field on
 * `PipelineNode` itself, so existing `pipeline` content needs zero changes
 * to opt into this variant. `llm_call` is the one entity type that reads as
 * "generation" here; every other entity (Client, ...) is plain request/
 * response plumbing, same as the `combine`/`output` concept icons.
 */
function phaseFor(node: PipelineNode): Phase {
  if (node.entityType === "llm_call") return "generate";
  if (node.icon === "embedding") return "embed";
  if (node.icon === "vector-db") return "retrieve";
  if (node.icon === "data-source") return "corpus";
  return "io";
}

interface ColPos {
  row: "top" | "bottom";
  col: number;
}

function Card({
  x,
  y,
  node,
  icon: Icon,
  labelMaxChars,
}: {
  x: number;
  y: number;
  node: PipelineNode;
  icon?: DiagramIcon;
  labelMaxChars: number;
}) {
  const phase = phaseFor(node);
  const { border, icon, tag } = PHASE_CLASSES[phase];
  const labelLines = wrapText(node.label, labelMaxChars, 2);
  const iconCy = y + 22;
  const labelTop = iconCy + ICON_SIZE / 2 + 17;

  return (
    <g>
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4} strokeWidth={1.4} className={`fill-bg-elevated ${border}`} />
      {Icon ? (
        <Icon
          x={x + CARD_W / 2 - ICON_SIZE / 2}
          y={iconCy - ICON_SIZE / 2}
          width={ICON_SIZE}
          height={ICON_SIZE}
          strokeWidth={1.5}
          className={icon}
          aria-hidden
        />
      ) : (
        <circle cx={x + CARD_W / 2} cy={iconCy} r={ICON_SIZE / 2} strokeWidth={1} className={`fill-none ${border}`} />
      )}
      {labelLines.map((line, li) => (
        <text
          key={li}
          x={x + CARD_W / 2}
          y={labelTop + li * 14}
          textAnchor="middle"
          // Mono, same as every other label in this figure (and the site's
          // own "mono is for labels/data" rule) — a bold display face would
          // match the reference diagram's title treatment more literally,
          // but that means loading a third typeface the rest of the site
          // never uses just for this one figure. One consistent technical
          // voice reads closer to that crispness without the new dependency.
          className="fill-text font-mono text-[12px] font-semibold"
        >
          {line}
        </text>
      ))}
      {node.sublabel && (
        <text
          x={x + CARD_W / 2}
          y={labelTop + labelLines.length * 14 + 12}
          textAnchor="middle"
          className={`${tag} font-mono text-[9.5px] uppercase`}
          style={{ letterSpacing: "0.04em" }}
        >
          {node.sublabel}
        </text>
      )}
    </g>
  );
}

export function PipelinePhaseDiagram({
  nodes,
  edgeLabels,
  sideNodes = [],
  animated = false,
}: {
  nodes: PipelineNode[];
  edgeLabels?: (string | undefined)[];
  sideNodes?: PipelineSideNode[];
  /**
   * A signal-colored dot travels the main chain once per loop, one arrow
   * at a time — visible only while it's actually on an arrow, hidden the
   * instant it reaches a box, where a pulsing ring on that box takes over
   * as "the request is here" instead. Paced by each segment's actual
   * on-screen distance (not an equal 1/N split), with a real pause dwelt
   * at every node, not just an equal split of one continuous glide — see
   * the keyframe-builder comment below for why. Never plays the offline
   * branch — that path runs on its own schedule, ahead of any one
   * request, which is the whole point of drawing it dashed and separate.
   */
  animated?: boolean;
}) {
  const arrowId = `pipeline-phase-arrow-${useId()}`;
  const offlineArrowId = `pipeline-phase-offline-arrow-${useId()}`;
  const prefersReducedMotion = useReducedMotion();
  const playing = animated && !prefersReducedMotion && nodes.length > 1;

  const topCount = Math.ceil(nodes.length / 2);
  const bottomCount = nodes.length - topCount;

  const colFor = (index: number): ColPos =>
    index < topCount ? { row: "top", col: index } : { row: "bottom", col: topCount - 1 - (index - topCount) };

  const xForCol = (col: number) => PAD_X + col * (CARD_W + GAP);

  const sideAbove = sideNodes.filter((n) => colFor(n.intoIndex).row === "top");
  const sideBelow = sideNodes.filter((n) => colFor(n.intoIndex).row === "bottom");

  const width = topCount * CARD_W + (topCount - 1) * GAP + PAD_X * 2;

  /**
   * A side node's `edgeLabel` is real content-authored prose ("embedded &
   * indexed ahead of time"), not a short tag — how many lines it wraps to
   * varies with both the label and which column it lands in (less room in
   * the last column, closer to the diagram's right edge). Sized here, once,
   * from the real wrap so `SIDE_ROW_H` can grow to fit it instead of
   * guessing a fixed height and clipping whatever doesn't fit.
   */
  const sideEdgeLines = (node: PipelineSideNode): string[] => {
    if (!node.edgeLabel) return [];
    const cx = xForCol(colFor(node.intoIndex).col) + CARD_W / 2;
    const availableWidth = width - PAD_X - (cx + 10);
    return wrapText(node.edgeLabel, estimateMaxChars(availableWidth, 9.5), 3);
  };
  const maxSideLines = Math.max(0, ...sideNodes.map((n) => sideEdgeLines(n).length));
  const sideRowH = SIDE_CARD_H + 10 + Math.max(1, maxSideLines) * SIDE_LINE_H + 14;

  const topY = PAD_TOP + (sideAbove.length > 0 ? sideRowH : 0);
  const bottomY = bottomCount > 0 ? topY + CARD_H + ROW_GAP_Y : topY;
  const yForRow = (row: "top" | "bottom") => (row === "top" ? topY : bottomY);

  const height = bottomY + CARD_H + PAD_TOP + (sideBelow.length > 0 ? sideRowH : 0);

  const labelMaxChars = estimateMaxChars(CARD_W - 18, 12);
  const edgeLabelMaxChars = estimateMaxChars(GAP - 6, 10.5);

  // Each segment's exact on-screen endpoints — shared by the connector
  // lines below and the traveling dot's keyframes, so the dot always rides
  // exactly on top of the arrow it's drawn on rather than a separately
  // computed (and potentially drifting) path.
  const segments: { x1: number; y1: number; x2: number; y2: number; sameRow: boolean }[] = nodes
    .slice(0, -1)
    .map((_, i) => {
      const a = colFor(i);
      const b = colFor(i + 1);
      if (a.row === b.row) {
        const leftCol = Math.min(a.col, b.col);
        const rightCol = Math.max(a.col, b.col);
        const forward = a.col < b.col;
        const x1 = forward ? xForCol(leftCol) + CARD_W : xForCol(rightCol);
        const x2 = forward ? xForCol(rightCol) : xForCol(leftCol) + CARD_W;
        const y = yForRow(a.row) + CARD_H / 2;
        return { x1, y1: y, x2, y2: y, sameRow: true };
      }
      const x = xForCol(a.col) + CARD_W / 2;
      return { x1: x, y1: yForRow("top") + CARD_H, x2: x, y2: yForRow("bottom"), sameRow: false };
    });

  /**
   * The traveling dot only exists on an arrow — hidden the instant it
   * reaches a box, reappearing only once it departs again — so a node's
   * glow ring (lit exactly while the dot at that node is hidden, via
   * `litNode`) reads as "the request is here" and the dot reads as "the
   * request is moving," never both drawn on top of each other at once.
   * Built as one flat keyframe list, all three animated values (`cx`,
   * `cy`, `opacity`) sharing the same `times`, rather than leaning on
   * `repeatDelay` for pauses — that only ever inserts one gap, at the very
   * end of a cycle, so each intermediate stop needs its own explicit dwell
   * baked into the timeline. A dwell is two identical consecutive
   * keyframes (position and opacity both unchanged) rather than a single
   * keyframe held via `repeatDelay`-style logic — without the duplicate,
   * Framer Motion would ease `cx`/`cy`/`opacity` all together across the
   * *whole* gap to the next keyframe, which is exactly the "dot drifts
   * through the box while fading" look this is trying to avoid.
   */
  const PACE_S_PER_PX = 0.0055;
  const MIN_TRAVEL_S = 0.4;
  const DWELL_S = 0.55; // paused at a node, dot hidden, its ring lit
  const POP_S = 0.14; // quick fade as the dot appears/disappears at a box edge

  interface Keyframe {
    t: number;
    cx: number;
    cy: number;
    opacity: number;
    litNode: number | null;
  }
  const restingAtStart: Keyframe[] = [
    { t: 0, cx: segments[0].x1, cy: segments[0].y1, opacity: 0, litNode: 0 },
    { t: DWELL_S, cx: segments[0].x1, cy: segments[0].y1, opacity: 0, litNode: 0 }, // hold: resting at node 0
  ];
  const { kfs: keyframes } = segments.reduce(
    (acc, seg, i) => {
      const travelS = Math.max(Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1) * PACE_S_PER_PX, MIN_TRAVEL_S);
      const tDepart = acc.t + POP_S;
      const tArrive = tDepart + travelS;
      const tVanish = tArrive + POP_S;
      const hasDwell = i < segments.length - 1;
      const tHold = tVanish + DWELL_S;
      const kfs: Keyframe[] = [
        ...acc.kfs,
        { t: tDepart, cx: seg.x1, cy: seg.y1, opacity: 1, litNode: null }, // pop visible, depart
        { t: tArrive, cx: seg.x2, cy: seg.y2, opacity: 1, litNode: null }, // arrive, still visible
        { t: tVanish, cx: seg.x2, cy: seg.y2, opacity: 0, litNode: i + 1 }, // vanish, next node's ring lights
        ...(hasDwell ? [{ t: tHold, cx: seg.x2, cy: seg.y2, opacity: 0, litNode: i + 1 }] : []), // hold through the dwell
      ];
      return { t: hasDwell ? tHold : tVanish, kfs };
    },
    { t: DWELL_S, kfs: restingAtStart },
  );
  // No trailing dwell for the last node — `repeatDelay` below covers that
  // pause instead, holding this last keyframe's value (dot hidden, final
  // node's ring lit) until the loop restarts.
  const totalT = keyframes[keyframes.length - 1].t || 1;
  const times = keyframes.map((k) => k.t / totalT);
  const duration = totalT;
  const repeatDelay = DWELL_S + 0.3; // a beat longer — the final answer is worth lingering on
  const transition = { duration, times, repeat: Infinity, repeatDelay, ease: "easeInOut" as const };
  const dotCx = keyframes.map((k) => k.cx);
  const dotCy = keyframes.map((k) => k.cy);
  const dotOpacity = keyframes.map((k) => k.opacity);
  const ringOpacityFor = (nodeIndex: number) => keyframes.map((k) => (k.litNode === nodeIndex ? 1 : 0));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      // Deliberately capped at native size instead of `svgResponsiveProps`'s
      // usual "grow to fill the column" behavior — that helper is right for
      // a dense grid/architecture diagram, but stretching *this* figure's
      // hand-tuned proportions up to a ~1024px column blows every icon,
      // stroke, and label past its designed scale. Reads as an image with
      // an intrinsic size instead: shrinks on a narrow viewport, never grows
      // past what it was actually drawn at.
      style={{ width: "100%", maxWidth: `${width}px`, height: "auto" }}
      className="mx-auto block text-text-muted"
      role="img"
      aria-label={`Pipeline, colored by phase: ${nodes.map((n) => n.label).join(" → ")}.${
        sideNodes.length > 0
          ? ` Also: ${sideNodes.map((n) => `${n.label} feeds ${nodes[n.intoIndex]?.label ?? "the pipeline"}`).join("; ")}.`
          : ""
      }`}
    >
      <ArrowMarker id={arrowId} />
      <defs>
        <marker id={offlineArrowId} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-rag-corpus" />
        </marker>
      </defs>

      {/* Main chain — connectors first, so a label spilling past its gap never gets painted over by a later card. */}
      {segments.map((seg, i) => {
        const label = edgeLabels?.[i];
        const lines = label ? wrapText(label, edgeLabelMaxChars, 2) : [];

        if (seg.sameRow) {
          const midX = (seg.x1 + seg.x2) / 2;
          return (
            <g key={i}>
              <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} strokeWidth={1.2} className="stroke-border-hover" markerEnd={`url(#${arrowId})`} />
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={midX}
                  y={seg.y1 - 22 + li * 12}
                  textAnchor="middle"
                  className="fill-text-subtle font-mono text-[10px]"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        }

        // Row transition — the drop connector at the shared right-edge column.
        return (
          <g key={i}>
            <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} strokeWidth={1.2} className="stroke-border-hover" markerEnd={`url(#${arrowId})`} />
            {lines.map((line, li) => (
              <text
                key={li}
                x={seg.x1 + 12}
                y={(seg.y1 + seg.y2) / 2 - 4 + li * 12}
                textAnchor="start"
                className="fill-text-subtle font-mono text-[10px]"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {nodes.map((node, i) => {
        const pos = colFor(i);
        return (
          <Card key={i} x={xForCol(pos.col)} y={yForRow(pos.row)} node={node} icon={iconFor(node)} labelMaxChars={labelMaxChars} />
        );
      })}

      {/* Traveling request — a pulse ring per node lit exactly while the dot
          is hidden there (`ringOpacityFor` shares the dot's own keyframe
          list, so the two are always in lockstep), the dot itself visible
          only in the gaps between. Signal-copper, same accent `FlowDiagram`
          reserves for "a request in motion" elsewhere. */}
      {playing && (
        <>
          {nodes.map((_, i) => {
            const pos = colFor(i);
            return (
              <motion.rect
                key={`pulse-${i}`}
                x={xForCol(pos.col) - 2}
                y={yForRow(pos.row) - 2}
                width={CARD_W + 4}
                height={CARD_H + 4}
                rx={6}
                fill="none"
                strokeWidth={1.5}
                style={{ stroke: "var(--color-signal)" }}
                initial={false}
                animate={{ opacity: ringOpacityFor(i) }}
                transition={transition}
              />
            );
          })}
          <motion.circle
            r={4.5}
            style={{ fill: "var(--color-signal)", filter: "drop-shadow(0 0 4px var(--color-signal))" }}
            initial={false}
            animate={{ cx: dotCx, cy: dotCy, opacity: dotOpacity }}
            transition={transition}
          />
        </>
      )}

      {/* Offline side nodes — dashed corpus-colored connector, drawn above (or, for a node in the bottom row, below) the card it feeds. */}
      {sideNodes.map((node, i) => {
        const target = colFor(node.intoIndex);
        const isAbove = target.row === "top";
        const cx = xForCol(target.col) + CARD_W / 2;
        const rowTop = yForRow(target.row);
        const sideY = isAbove ? PAD_TOP - 2 : rowTop + CARD_H + sideRowH - SIDE_CARD_H;
        const cy = sideY + SIDE_CARD_H / 2;
        const lineY1 = isAbove ? sideY + SIDE_CARD_H + 4 : rowTop + CARD_H + 4;
        const lineY2 = isAbove ? rowTop - 4 : sideY - 4;
        const Icon = iconFor(node);
        const edgeLines = sideEdgeLines(node);

        return (
          <g key={`side-${i}`}>
            <rect
              x={cx - CARD_W / 2}
              y={sideY}
              width={CARD_W}
              height={SIDE_CARD_H}
              rx={4}
              strokeWidth={1.2}
              strokeDasharray="3 4"
              className="fill-bg-elevated stroke-rag-corpus"
            />
            {Icon && <Icon x={cx - 9} y={cy - 9} width={18} height={18} strokeWidth={1.5} className="text-rag-corpus" aria-hidden />}
            <text x={cx} y={cy + 21} textAnchor="middle" className="fill-rag-corpus font-mono text-[10px] font-medium">
              {wrapText(node.label, labelMaxChars, 1)[0]}
            </text>
            <line
              x1={cx}
              y1={lineY1}
              x2={cx}
              y2={lineY2}
              strokeWidth={1.2}
              strokeDasharray="2 5"
              className="stroke-rag-corpus"
              markerEnd={`url(#${offlineArrowId})`}
            />
            {edgeLines.length > 0 &&
              (() => {
                const midY = (lineY1 + lineY2) / 2 + (isAbove ? 0 : 4);
                const startY = midY - ((edgeLines.length - 1) * SIDE_LINE_H) / 2;
                return edgeLines.map((line, li) => (
                  <text
                    key={li}
                    x={cx + 10}
                    y={startY + li * SIDE_LINE_H}
                    textAnchor="start"
                    className="fill-rag-corpus font-mono text-[9.5px]"
                  >
                    {line}
                  </text>
                ));
              })()}
          </g>
        );
      })}
    </svg>
  );
}
