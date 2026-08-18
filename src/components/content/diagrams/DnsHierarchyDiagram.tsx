import { ArrowMarker, DiagramBox, svgResponsiveProps } from "./primitives";

/**
 * The three-level DNS server hierarchy (Root → TLD → Authoritative) from
 * Foundations Lesson 5 — replaces the ascii tree that used to sit under
 * "DNS is a distributed database". Authoritative servers get the signal
 * accent: they're "the final authority" the lesson's own text calls out,
 * the one box in this tree a reader would actually go configure.
 */

const ARROW_ID = "dns-hierarchy-arrow";

/** `M x1 y1` down to a shared bus row, across, then down into the child's top edge. */
function elbow(x1: number, y1: number, x2: number, y2: number, busY: number) {
  return `M${x1} ${y1} V${busY} H${x2} V${y2}`;
}

export function DnsHierarchyDiagram() {
  const root = { x: 260, y: 8, w: 150, h: 44 };
  const tldY = 100;
  const tldW = 150;
  const tldH = 44;
  const tlds = [
    { x: 25, lines: [".com TLD SERVER", "Verisign"] },
    { x: 260, lines: [".in TLD SERVER", "NIXI"] },
    { x: 495, lines: [".org TLD SERVER", "PIR"] },
  ];
  const authY = 190;
  const authW = 160;
  const authH = 40;
  const authoritative = [
    { x: 15, lines: ["flipkart.com", "Authoritative DNS"] },
    { x: 205, lines: ["swiggy.com", "Authoritative DNS"] },
  ];

  const rootBottom = { x: root.x + root.w / 2, y: root.y + root.h };
  const comCenter = { x: tlds[0].x + tldW / 2, y: tldY };
  const comBottom = { x: comCenter.x, y: tldY + tldH };

  return (
    <svg
      viewBox="0 0 680 240"
      {...svgResponsiveProps(680, 240)}
      className="text-text-muted"
      role="img"
      aria-label="DNS server hierarchy: Root delegates to TLD servers, which delegate to each domain's authoritative DNS server."
    >
      <ArrowMarker id={ARROW_ID} />

      {/* Root -> each TLD */}
      {tlds.map((tld, i) => (
        <path
          key={i}
          d={elbow(rootBottom.x, rootBottom.y, tld.x + tldW / 2, tldY, rootBottom.y + 24)}
          fill="none"
          strokeWidth={1}
          className="stroke-border-hover"
          markerEnd={`url(#${ARROW_ID})`}
        />
      ))}

      {/* .com TLD -> each authoritative server */}
      {authoritative.map((auth, i) => (
        <path
          key={i}
          d={elbow(comBottom.x, comBottom.y, auth.x + authW / 2, authY, comBottom.y + 24)}
          fill="none"
          strokeWidth={1}
          className="stroke-border-hover"
          markerEnd={`url(#${ARROW_ID})`}
        />
      ))}

      <DiagramBox x={root.x} y={root.y} width={root.w} height={root.h} lines={["ROOT DNS SERVERS", "13 clusters worldwide"]} />

      {tlds.map((tld, i) => (
        <DiagramBox key={i} x={tld.x} y={tldY} width={tldW} height={tldH} lines={tld.lines} />
      ))}

      {authoritative.map((auth, i) => (
        <DiagramBox key={i} x={auth.x} y={authY} width={authW} height={authH} lines={auth.lines} tone="signal" />
      ))}
    </svg>
  );
}
