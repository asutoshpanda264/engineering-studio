import type { ReactNode } from "react";
import type { LessonBlock } from "@/content/shared/lesson";
import { DIAGRAM_REGISTRY } from "@/components/content/diagrams/registry";
import { FigureFrame } from "@/components/content/FigureFrame";
import { FlowDiagram } from "@/components/content/diagrams/generic/FlowDiagram";
import { SequenceDiagram } from "@/components/content/diagrams/generic/SequenceDiagram";
import { TreeDiagram } from "@/components/content/diagrams/generic/TreeDiagram";
import { ArchitectureDiagram } from "@/components/content/diagrams/generic/ArchitectureDiagram";
import { CompareDiagram } from "@/components/content/diagrams/generic/CompareDiagram";
import { UmlDiagram } from "@/components/content/diagrams/generic/UmlDiagram";
import { TimelineDiagram } from "@/components/content/diagrams/generic/TimelineDiagram";
import { VennDiagram } from "@/components/content/diagrams/generic/VennDiagram";
import { GraphDiagram } from "@/components/content/diagrams/generic/GraphDiagram";

/**
 * Tiny inline-markdown subset for body text authored in `src/content/`:
 * `` `code` `` for identifiers/snippets, `**bold**` for a labeled lead-in
 * (e.g. worked-answer bullets like "**SRP** — ..."), `*italic*` for the
 * occasional emphasized word. Not a full markdown parser on purpose — just
 * enough that content authors can write "`ReportFormatter`" instead of a
 * plain-text backtick, which is all this content actually uses inline.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-${i}`}
          className="rounded-sm bg-bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-signal"
        >
          {match[1]}
        </code>,
      );
    } else if (match[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-text">
          {match[2]}
        </strong>,
      );
    } else {
      nodes.push(<em key={`${keyPrefix}-${i}`}>{match[3]}</em>);
    }
    lastIndex = pattern.lastIndex;
    i++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Renders one `LessonBlock` in the visual language `/entities/[slug]`
 * already established (hairline borders, `bg-bg-panel` boxes, mono
 * uppercase micro-labels, numbered-circle vs. dot list markers) so every
 * reading room — Foundations, LLD, and an entity deep-dive — reads as the
 * same product, not separate articles bolted together. Module-agnostic on
 * purpose: it only knows about `LessonBlock`, never which content module
 * produced it.
 */
export function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.kind) {
    case "paragraph":
      return <p className="text-sm leading-relaxed text-text-muted">{renderInline(block.text, "p")}</p>;

    case "diagram":
      return (
        <pre className="overflow-x-auto border border-border bg-bg-panel p-4 font-mono text-xs leading-relaxed text-text-muted">
          {block.lines.join("\n")}
        </pre>
      );

    // A real vector diagram, looked up by id from the registry `figure`
    // blocks reference (see `content/shared/lesson.ts`). Same bordered
    // `bg-bg-panel` frame the ascii `diagram` case uses, so a reading room
    // that mixes both block kinds still reads as one visual language.
    case "figure": {
      const Diagram = DIAGRAM_REGISTRY[block.diagram];
      return (
        <FigureFrame caption={block.caption}>
          <Diagram />
        </FigureFrame>
      );
    }

    case "flow":
      return (
        <FigureFrame>
          <FlowDiagram steps={block.steps} animated={block.animated} />
        </FigureFrame>
      );

    case "sequence":
      return (
        <FigureFrame>
          <SequenceDiagram actors={block.actors} messages={block.messages} />
        </FigureFrame>
      );

    case "tree":
      return (
        <FigureFrame>
          <TreeDiagram root={block.root} />
        </FigureFrame>
      );

    case "architecture":
      return (
        <FigureFrame>
          <ArchitectureDiagram nodes={block.nodes} edges={block.edges} />
        </FigureFrame>
      );

    case "compare":
      return (
        <FigureFrame>
          <CompareDiagram panels={block.panels} transitionLabel={block.transitionLabel} />
        </FigureFrame>
      );

    case "uml":
      return (
        <FigureFrame>
          <UmlDiagram relationships={block.relationships} />
        </FigureFrame>
      );

    case "timeline":
      return (
        <FigureFrame>
          <TimelineDiagram steps={block.steps} />
        </FigureFrame>
      );

    case "venn":
      return (
        <FigureFrame>
          <VennDiagram panels={block.panels} />
        </FigureFrame>
      );

    case "graph":
      return (
        <FigureFrame>
          <GraphDiagram nodes={block.nodes} edges={block.edges} />
        </FigureFrame>
      );

    case "code":
      return (
        <div className="overflow-hidden border border-border">
          {block.language && (
            <div className="border-b border-border bg-bg-elevated px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-text-subtle">
              {block.language}
            </div>
          )}
          <pre className="overflow-x-auto bg-bg-panel p-4 font-mono text-xs leading-relaxed text-text">
            {block.code}
          </pre>
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-elevated">
                {block.headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-4 py-2.5 align-top leading-relaxed ${
                        j === 0 ? "font-medium text-text" : "text-text-muted"
                      }`}
                    >
                      {renderInline(cell, `t${i}-${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    // Same left-border-accent quote treatment as the entity deep-dive's
    // "truth" blockquote (`/entities/[slug]/page.tsx`, InspectorPanel's
    // EngineeringExplanation) — not a tinted callout box. A soft
    // `bg-signal/5` fill behind italic text is the one shape in this file
    // that didn't already exist somewhere else in the product; this does.
    case "insight":
      return (
        <div className="border-l-2 border-signal/50 pl-4">
          {block.label && (
            <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-signal">
              {block.label}
            </p>
          )}
          <p className="text-sm italic leading-relaxed text-text">{renderInline(block.text, "i")}</p>
        </div>
      );

    case "list":
      return block.ordered ? (
        <ol className="flex flex-col gap-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-text-muted">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-signal/40 font-mono text-[11px] font-medium text-signal">
                {i + 1}
              </span>
              <span className="leading-relaxed">{renderInline(item, `l${i}`)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="flex flex-col gap-3">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-text-muted">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-signal" aria-hidden />
              <span>{renderInline(item, `l${i}`)}</span>
            </li>
          ))}
        </ul>
      );

    case "qa":
      return (
        <div className="flex flex-col gap-1.5 border border-border bg-bg-panel p-4">
          <p className="text-sm font-medium text-text">&ldquo;{renderInline(block.question, "q")}&rdquo;</p>
          <p className="text-sm leading-relaxed text-text-muted">{renderInline(block.answer, "a")}</p>
        </div>
      );
  }
}
