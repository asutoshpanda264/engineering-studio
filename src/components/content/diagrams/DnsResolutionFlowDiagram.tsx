import { ArrowMarker } from "./primitives";

/**
 * The step-by-step "you type swiggy.com" resolution journey from
 * Foundations Lesson 5 — a vertical timeline rail rather than the tree
 * shape `DnsHierarchyDiagram` uses, so the two figures read as visibly
 * different kinds of thing (a structure vs. a sequence) the way the
 * lesson's own prose treats them differently.
 */

const ARROW_ID = "dns-resolution-arrow";

interface Step {
  title: string;
  detail: string;
  /** Numbered steps get a filled ring with their number; start/end get an unlabeled dot. */
  number?: number;
  tone?: "neutral" | "signal" | "healthy";
}

const STEPS: Step[] = [
  { title: "You type swiggy.com", detail: "browser needs an IP address to connect to" },
  { title: "Browser cache", number: 1, detail: "seen this before? No → continue" },
  { title: "OS cache (/etc/hosts)", number: 2, detail: "cached locally? No → continue" },
  { title: "Recursive resolver (your ISP)", number: 3, detail: "cached? No → ask a root server" },
  { title: "Root DNS server", number: 4, detail: "\"I don't know swiggy.com, but .com TLD is at 192.5.6.30\"" },
  { title: ".com TLD server", number: 5, detail: "\"I don't know it directly, but Swiggy's DNS is at 205.251.x.x\"" },
  { title: "Swiggy's authoritative DNS", number: 6, detail: "\"swiggy.com = 13.234.156.90\"", tone: "signal" },
  { title: "Browser connects to 13.234.156.90", detail: "resolver caches the answer — ~20–120ms total", tone: "healthy" },
];

const RAIL_X = 26;
const ROW_HEIGHT = 56;
const TOP = 24;
const BOX_X = 56;
const BOX_W = 590;
const BOX_H = 40;

export function DnsResolutionFlowDiagram() {
  const height = TOP + ROW_HEIGHT * (STEPS.length - 1) + BOX_H + 16;

  return (
    <svg
      viewBox={`0 0 680 ${height}`}
      className="h-auto w-full text-text-muted"
      role="img"
      aria-label="DNS resolution step by step: browser cache, OS cache, recursive resolver, root server, TLD server, authoritative server, then connect."
    >
      <ArrowMarker id={ARROW_ID} />

      {/* Rail */}
      <line
        x1={RAIL_X}
        y1={TOP}
        x2={RAIL_X}
        y2={TOP + ROW_HEIGHT * (STEPS.length - 1)}
        strokeWidth={1}
        className="stroke-border"
      />

      {STEPS.map((step, i) => {
        const cy = TOP + ROW_HEIGHT * i;
        const boxY = cy - BOX_H / 2;
        const textFill =
          step.tone === "signal" ? "fill-signal" : step.tone === "healthy" ? "fill-status-healthy" : "fill-text";
        const ringClass =
          step.tone === "signal"
            ? "fill-bg stroke-signal"
            : step.tone === "healthy"
              ? "fill-bg stroke-status-healthy"
              : "fill-bg stroke-border-hover";
        const boxStroke =
          step.tone === "signal" ? "stroke-signal" : step.tone === "healthy" ? "stroke-status-healthy" : "stroke-border";

        return (
          <g key={i}>
            {i > 0 && (
              <line
                x1={RAIL_X}
                y1={cy - ROW_HEIGHT + 7}
                x2={RAIL_X}
                y2={cy - 7}
                strokeWidth={1}
                className="stroke-border-hover"
                markerEnd={`url(#${ARROW_ID})`}
              />
            )}
            <circle cx={RAIL_X} cy={cy} r={7} strokeWidth={1} className={ringClass} />
            {step.number && (
              <text x={RAIL_X} y={cy + 3} textAnchor="middle" className="fill-text-muted text-[8px] font-medium">
                {step.number}
              </text>
            )}

            <rect x={BOX_X} y={boxY} width={BOX_W} height={BOX_H} rx={2} strokeWidth={1} className={`fill-bg-elevated ${boxStroke}`} />
            <text x={BOX_X + 12} y={boxY + 16} className={`${textFill} text-[11px] font-medium`}>
              {step.title}
            </text>
            <text x={BOX_X + 12} y={boxY + 30} className="fill-text-subtle text-[9.5px]">
              {step.detail}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
