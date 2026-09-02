import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import { Database, FileStack, GitMerge, MessageSquare, Sparkles } from "lucide-react";
import { ArrowMarker, estimateMaxChars, svgResponsiveProps, wrapText } from "../primitives";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import type { PipelineIconId, PipelineNode, PipelineSideNode } from "@/content/shared/lesson";

/**
 * A big-icon, minimal-text horizontal chain — "Client → Embedding →
 * Vector DB → ... → LLM Call" — deliberately the opposite instinct of
 * `ArchitectureDiagram`'s dense col/row grid or `FlowDiagram`'s per-step
 * narration: one big centered icon and a short label per node,
 * generously sized, nothing else. Built for a case study's top-level
 * topology (`docs/Expansion_TODO.md` Pillar E). A first version of this
 * component only showed the three *simulated* nodes (Client → Retriever
 * → LLM Call) — accurate to what the Workshop scenario actually runs,
 * but skipped the real RAG mechanics the Retriever entity abstracts
 * internally; `sideNodes` and the conceptual (non-entity) `icon` set
 * exist so a case study can show that full mechanism instead.
 */

const CONCEPT_ICONS: Record<PipelineIconId, LucideIcon> = {
  embedding: Sparkles,
  "vector-db": Database,
  "data-source": FileStack,
  combine: GitMerge,
  output: MessageSquare,
};

const CARD_W = 132;
const CARD_H = 96;
const GAP = 68; // horizontal space between main-chain cards, for the arrow + its label
const PAD_X = 20;
const PAD_TOP = 20;
const SIDE_ROW_H = 74; // vertical space reserved above the main row for side nodes
const ICON_SIZE = 28;
const LABEL_MAX_LINES = 2;
const SUBLABEL_MAX_LINES = 2;

const toneClasses = (tone?: PipelineNode["tone"]) =>
  tone === "signal"
    ? { border: "stroke-signal", icon: "text-signal", label: "fill-signal" }
    : tone === "healthy"
      ? { border: "stroke-status-healthy", icon: "text-status-healthy", label: "fill-status-healthy" }
      : tone === "critical"
        ? { border: "stroke-status-critical", icon: "text-status-critical", label: "fill-status-critical" }
        : { border: "stroke-border", icon: "text-text-subtle", label: "fill-text" };

/** Resolves a node's icon to a plain component reference — never itself rendered as JSX, so it's safe to compute once per node and hand the already-resolved icon down as a prop (same shape `ArchitectureLayer` uses for `DiagramBox`'s own `icon` prop). */
function iconFor(node: PipelineNode): LucideIcon | undefined {
  if (node.entityType) return getEntityCatalogItem(node.entityType).icon;
  if (node.icon) return CONCEPT_ICONS[node.icon];
  return undefined;
}

/** One card — a bordered box, a big centered icon (or a plain ring if none was resolved), and a wrapped label/sublabel below it. Shared between the main chain and `sideNodes`. `icon` is always an already-resolved component reference, never derived here. */
function Card({
  x,
  y,
  node,
  icon: Icon,
  labelMaxChars,
  sublabelMaxChars,
}: {
  x: number;
  y: number;
  node: PipelineNode;
  icon?: LucideIcon;
  labelMaxChars: number;
  sublabelMaxChars: number;
}) {
  const { border, icon, label } = toneClasses(node.tone);
  const labelLines = wrapText(node.label, labelMaxChars, LABEL_MAX_LINES);
  const sublabelLines = node.sublabel ? wrapText(node.sublabel, sublabelMaxChars, SUBLABEL_MAX_LINES) : [];
  const iconCy = y + 20;
  const labelTop = iconCy + ICON_SIZE / 2 + 16;

  return (
    <g>
      <rect x={x} y={y} width={CARD_W} height={CARD_H} rx={4} strokeWidth={1} className={`fill-bg-elevated ${border}`} />
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
        <text key={li} x={x + CARD_W / 2} y={labelTop + li * 14} textAnchor="middle" className={`${label} text-[12px] font-medium`}>
          {line}
        </text>
      ))}
      {sublabelLines.map((line, li) => (
        <text
          key={li}
          x={x + CARD_W / 2}
          y={labelTop + labelLines.length * 14 + 12 + li * 12}
          textAnchor="middle"
          className="fill-text-subtle text-[10px]"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function PipelineDiagram({
  nodes,
  edgeLabels,
  sideNodes = [],
}: {
  nodes: PipelineNode[];
  edgeLabels?: (string | undefined)[];
  sideNodes?: PipelineSideNode[];
}) {
  const arrowId = `pipeline-arrow-${useId()}`;
  const hasSideNodes = sideNodes.length > 0;

  const width = nodes.length * CARD_W + (nodes.length - 1) * GAP + PAD_X * 2;
  const mainTop = PAD_TOP + (hasSideNodes ? SIDE_ROW_H : 0);
  const height = mainTop + CARD_H + PAD_TOP;
  const mainMidY = mainTop + CARD_H / 2;
  const sideY = PAD_TOP - 4;
  const sideCardH = Math.max(mainTop - sideY - 14, 40);

  const labelMaxChars = estimateMaxChars(CARD_W - 16, 12);
  const sublabelMaxChars = estimateMaxChars(CARD_W - 16, 10);

  const xForIndex = (i: number) => PAD_X + i * (CARD_W + GAP);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      {...svgResponsiveProps(width, height)}
      className="text-text-muted"
      role="img"
      aria-label={`Pipeline: ${nodes.map((n) => n.label).join(" → ")}.${
        hasSideNodes ? ` Also: ${sideNodes.map((n) => `${n.label} feeds ${nodes[n.intoIndex]?.label ?? "the pipeline"}`).join("; ")}.` : ""
      }`}
    >
      <ArrowMarker id={arrowId} />

      {/* Main chain */}
      {nodes.map((node, i) => (
        <Card
          key={i}
          x={xForIndex(i)}
          y={mainTop}
          node={node}
          icon={iconFor(node)}
          labelMaxChars={labelMaxChars}
          sublabelMaxChars={sublabelMaxChars}
        />
      ))}
      {nodes.slice(0, -1).map((_, i) => {
        const x1 = xForIndex(i) + CARD_W;
        const x2 = xForIndex(i + 1);
        const label = edgeLabels?.[i];
        return (
          <g key={i}>
            <line x1={x1} y1={mainMidY} x2={x2} y2={mainMidY} strokeWidth={1} className="stroke-border-hover" markerEnd={`url(#${arrowId})`} />
            {label && (
              <text x={(x1 + x2) / 2} y={mainMidY - 8} textAnchor="middle" className="fill-text-subtle text-[10px]">
                {label}
              </text>
            )}
          </g>
        );
      })}

      {/* Side nodes — offset above one main node, feeding into it */}
      {sideNodes.map((node, i) => {
        const targetX = xForIndex(node.intoIndex);
        const Icon = iconFor(node);
        const cx = targetX + CARD_W / 2;
        const cy = sideY + sideCardH / 2;
        return (
          <g key={`side-${i}`}>
            <rect
              x={targetX}
              y={sideY}
              width={CARD_W}
              height={sideCardH}
              rx={4}
              strokeWidth={1}
              strokeDasharray="3 3"
              className={`fill-bg-elevated ${toneClasses(node.tone).border}`}
            />
            {Icon && <Icon x={cx - 9} y={cy - 9} width={18} height={18} strokeWidth={1.5} className={toneClasses(node.tone).icon} aria-hidden />}
            <text x={cx} y={cy + 22} textAnchor="middle" className={`${toneClasses(node.tone).label} text-[10px] font-medium`}>
              {wrapText(node.label, labelMaxChars, 1)[0]}
            </text>
            <line x1={cx} y1={sideY + sideCardH + 4} x2={cx} y2={mainTop - 4} strokeWidth={1} className="stroke-border-hover" markerEnd={`url(#${arrowId})`} />
            {node.edgeLabel && (
              <text x={cx + 6} y={mainTop - 6} textAnchor="start" className="fill-text-subtle text-[9px]">
                {node.edgeLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
