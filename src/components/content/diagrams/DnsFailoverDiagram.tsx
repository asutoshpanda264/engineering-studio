import { ArrowMarker, DiagramArrow, DiagramBox, svgResponsiveProps } from "./primitives";

/**
 * DNS failover, before and after — two small topologies side by side
 * rather than the ascii version's five-line vertical script. Putting
 * "primary healthy" and "primary down" panels next to each other makes
 * the actual mechanism visible at a glance: the DNS record is the only
 * thing that moves, from one arrow to the other.
 */

const ARROW_BEFORE = "dns-failover-arrow-before";
const ARROW_AFTER = "dns-failover-arrow-after";
const PANEL_W = 260;
const GAP = 140;

function Panel({
  panelX,
  title,
  primaryDown,
  arrowId,
}: {
  panelX: number;
  title: string;
  primaryDown: boolean;
  arrowId: string;
}) {
  const client = { x: panelX, y: 34, width: 90, height: 32 };
  const dns = { x: panelX, y: 106, width: 90, height: 32 };
  const primary = { x: panelX + 150, y: 20, width: 110, height: 34 };
  const backup = { x: panelX + 150, y: 110, width: 110, height: 34 };

  return (
    <g>
      <text x={panelX} y={16} className="fill-text-subtle text-[10px] font-medium uppercase tracking-wide">
        {title}
      </text>

      <DiagramBox {...client} lines={["Client"]} />
      <DiagramBox {...dns} lines={["swiggy.com", "DNS record"]} />
      <DiagramBox
        {...primary}
        lines={primaryDown ? ["Primary", "down"] : ["Primary", "13.234.156.90"]}
        tone={primaryDown ? "critical" : "healthy"}
        dashed={primaryDown}
      />
      <DiagramBox
        {...backup}
        lines={primaryDown ? ["Backup", "52.66.24.100"] : ["Backup", "standby"]}
        tone={primaryDown ? "healthy" : "neutral"}
        dashed={!primaryDown}
      />

      <DiagramArrow x1={client.x + client.width / 2} y1={client.y + client.height} x2={dns.x + dns.width / 2} y2={dns.y} markerId={arrowId} />
      <DiagramArrow
        x1={dns.x + dns.width}
        y1={dns.y + 8}
        x2={primary.x}
        y2={primary.y + primary.height / 2}
        markerId={arrowId}
        dashed={primaryDown}
        tone={primaryDown ? "critical" : "healthy"}
      />
      <DiagramArrow
        x1={dns.x + dns.width}
        y1={dns.y + dns.height - 8}
        x2={backup.x}
        y2={backup.y + backup.height / 2}
        markerId={arrowId}
        dashed={!primaryDown}
        tone={primaryDown ? "healthy" : "neutral"}
      />
    </g>
  );
}

export function DnsFailoverDiagram() {
  const afterX = PANEL_W + GAP;
  const midX = PANEL_W + GAP / 2;

  return (
    <svg
      viewBox="0 0 660 200"
      {...svgResponsiveProps(660, 200)}
      className="text-text-muted"
      role="img"
      aria-label="DNS failover: before, DNS points clients at the healthy primary; after the primary fails, a health check flips the DNS record to the backup, and TTL=60 means clients pick it up within about a minute."
    >
      <ArrowMarker id={ARROW_BEFORE} tone="healthy" />
      <ArrowMarker id={ARROW_AFTER} tone="healthy" />

      <Panel panelX={0} title="Before — primary healthy" primaryDown={false} arrowId={ARROW_BEFORE} />
      <Panel panelX={afterX} title="After — failover" primaryDown arrowId={ARROW_AFTER} />

      <line x1={PANEL_W + 14} y1={92} x2={afterX - 14} y2={92} strokeWidth={1} className="stroke-signal" markerEnd={`url(#${ARROW_AFTER})`} />
      <text x={midX} y={64} textAnchor="middle" className="fill-signal text-[9px] font-medium">
        Primary fails
      </text>
      <text x={midX} y={76} textAnchor="middle" className="fill-text-subtle text-[9px]">
        health check detects it
      </text>
      <text x={midX} y={108} textAnchor="middle" className="fill-text-subtle text-[9px]">
        DNS updates —
      </text>
      <text x={midX} y={120} textAnchor="middle" className="fill-text-subtle text-[9px]">
        TTL=60 → users failover in ~1 min
      </text>
    </svg>
  );
}
