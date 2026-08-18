/**
 * Decorative full-bleed background for `/learn` — a loosely-clustered
 * network topology (not a repeating grid) with one highlighted request
 * path threading through a central hub, plus a scatter of real
 * system-design vocabulary rendered as faint blueprint annotations.
 *
 * Replaces the earlier `.bg-blueprint-grid` tile, which was flat/uniform
 * and read as generic texture rather than anything to do with this app's
 * actual subject matter. This is still purely decorative (all coordinates
 * are hand-placed, not derived from real content) and still static — no
 * loop, no scroll-trigger — consistent with the rest of the app's rule
 * that motion communicates a state change, never just decorates.
 *
 * All color comes from the existing design tokens (`stroke-border`,
 * `fill-signal`, etc.) via the same Tailwind `fill-*`/`stroke-*` utilities
 * `src/components/content/diagrams/primitives.tsx` already established,
 * so it's theme-aware for free. Every visual layer sits in its own `<g
 * opacity>` well below full strength — this is meant to read as texture
 * behind the page, never compete with the cards on top of it.
 */

type NodeShape = "circle" | "square";

interface MeshNode {
  x: number;
  y: number;
  shape: NodeShape;
}

// Three loose clusters (echoing the three reading rooms) plus scattered
// bridge/filler nodes for even coverage — hand-placed, not a grid.
const NODES: MeshNode[] = [
  // Cluster A — top-left
  { x: 140, y: 160, shape: "square" },
  { x: 260, y: 110, shape: "circle" },
  { x: 300, y: 260, shape: "circle" },
  { x: 420, y: 180, shape: "square" },
  { x: 180, y: 300, shape: "circle" },
  // Cluster B — top-right
  { x: 1200, y: 140, shape: "circle" },
  { x: 1340, y: 190, shape: "square" },
  { x: 1420, y: 320, shape: "circle" },
  { x: 1260, y: 300, shape: "circle" },
  { x: 1480, y: 120, shape: "circle" },
  // Cluster C — bottom-center
  { x: 700, y: 700, shape: "square" },
  { x: 820, y: 660, shape: "circle" },
  { x: 900, y: 760, shape: "circle" },
  { x: 760, y: 820, shape: "circle" },
  { x: 960, y: 680, shape: "square" },
  // Bridges / filler, scattered for coverage
  { x: 800, y: 420, shape: "square" }, // 15 — central hub
  { x: 500, y: 480, shape: "circle" }, // 16
  { x: 1100, y: 500, shape: "circle" }, // 17
  { x: 650, y: 300, shape: "circle" }, // 18
  { x: 1000, y: 250, shape: "circle" }, // 19
  { x: 300, y: 600, shape: "circle" }, // 20
  { x: 1350, y: 650, shape: "circle" }, // 21
  { x: 60, y: 500, shape: "circle" }, // 22
  { x: 1540, y: 480, shape: "circle" }, // 23
  { x: 950, y: 150, shape: "circle" }, // 24
  { x: 450, y: 750, shape: "circle" }, // 25
];

const EDGES: [number, number][] = [
  // Cluster A
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [2, 4],
  // Cluster B
  [5, 6],
  [5, 8],
  [6, 7],
  [7, 8],
  [6, 9],
  // Cluster C
  [10, 11],
  [11, 12],
  [12, 14],
  [12, 13],
  [10, 13],
  // Bridges
  [2, 18],
  [18, 15],
  [15, 16],
  [16, 20],
  [15, 17],
  [17, 8],
  [17, 21],
  [19, 15],
  [19, 5],
  [15, 11],
  [22, 0],
  [22, 20],
  [23, 21],
  [23, 7],
  [24, 19],
  [24, 3],
  [9, 24],
  [14, 21],
];

// The one highlighted request path — client cluster → hub → cluster B —
// rendered in the signal color, same "one real path picked out of the
// noise" idea as the landing page's HeroDiagram packets.
const ACCENT_EDGES: [number, number][] = [
  [2, 18],
  [18, 15],
  [15, 17],
  [17, 8],
];
const ACCENT_NODES = new Set([2, 18, 15, 17, 8]);

const LABELS: { x: number; y: number; text: string; rotate?: number }[] = [
  { x: 250, y: 420, text: "p95 latency", rotate: -4 },
  { x: 1290, y: 430, text: "round robin", rotate: 3 },
  { x: 540, y: 600, text: "cache-aside", rotate: -3 },
  { x: 1050, y: 610, text: "ttl 60s", rotate: 4 },
  { x: 830, y: 190, text: "consistent hashing", rotate: -2 },
  { x: 140, y: 700, text: "backpressure", rotate: 3 },
  { x: 1420, y: 760, text: "circuit breaker", rotate: -3 },
  { x: 680, y: 110, text: "sharding", rotate: 2 },
];

function Node({ node, accent }: { node: MeshNode; accent: boolean }) {
  const cls = accent ? "fill-signal stroke-signal" : "fill-bg-elevated stroke-border-hover";
  if (node.shape === "square") {
    const s = accent ? 9 : 7;
    return <rect x={node.x - s / 2} y={node.y - s / 2} width={s} height={s} strokeWidth={1} className={cls} />;
  }
  return <circle cx={node.x} cy={node.y} r={accent ? 4.5 : 3.5} strokeWidth={1} className={cls} />;
}

export function SystemMeshBackground() {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
      focusable="false"
    >
      <g className="stroke-border" strokeWidth={1} opacity={0.4}>
        {EDGES.map(([a, b], i) => {
          const na = NODES[a];
          const nb = NODES[b];
          return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} />;
        })}
      </g>

      <g className="stroke-signal" strokeWidth={1.25} opacity={0.55}>
        {ACCENT_EDGES.map(([a, b], i) => {
          const na = NODES[a];
          const nb = NODES[b];
          return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} />;
        })}
      </g>

      <g opacity={0.5}>
        {NODES.map((node, i) => (
          <Node key={i} node={node} accent={ACCENT_NODES.has(i)} />
        ))}
      </g>

      <g className="fill-text-subtle font-mono text-[15px] uppercase tracking-wide" opacity={0.3}>
        {LABELS.map((label, i) => (
          <text key={i} x={label.x} y={label.y} transform={`rotate(${label.rotate ?? 0} ${label.x} ${label.y})`}>
            {label.text}
          </text>
        ))}
      </g>
    </svg>
  );
}
