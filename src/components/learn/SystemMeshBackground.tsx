"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/theme/ThemeProvider";

/**
 * Decorative full-bleed background for `/learn` — a loosely-clustered
 * network topology (not a repeating grid) with one highlighted request
 * path threading through a central hub.
 *
 * Used to also scatter real system-design vocabulary ("p95 latency",
 * "round robin", ...) across the mesh as faint blueprint annotations —
 * pulled after feedback that legible words sitting behind scrolling cards
 * read as clutter rather than texture, especially once a card's own copy
 * happened to land near-overlapping one. The graph (nodes/edges/highlighted
 * path) carries the "this is a system" read on its own without needing
 * text.
 *
 * Replaces the earlier `.bg-blueprint-grid` tile, which was flat/uniform
 * and read as generic texture rather than anything to do with this app's
 * actual subject matter. All coordinates are hand-placed, not derived from
 * real content.
 *
 * Was static (no loop) until direct feedback specifically asked for motion
 * on this exact background — "add moving dots animation to the line, or
 * just glow up and fade in to the existing dots." `Packet` below is the
 * former: one small glowing dot traveling the highlighted path node to
 * node and looping, the same "one real path picked out of the noise, a
 * packet actually moving along it" idea the landing page's `HeroDiagram`
 * already uses, just applied to this mesh's own accent path instead of a
 * new element. Everything else — the base graph, the static accent
 * line/nodes underneath the packet — stays exactly as still as before;
 * this adds one small moving accent, it doesn't turn the whole background
 * into a texture that's constantly in motion. `useReducedMotion` skips the
 * packet entirely, same convention `HeroDiagram` uses.
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

// The same chain as `ACCENT_EDGES`, in travel order — `Packet` below
// animates `cx`/`cy` through these points in sequence rather than deriving
// them from the edge list itself, since edge order alone doesn't guarantee
// a single head-to-tail direction (it happens to here, but this makes the
// travel path explicit rather than relying on that coincidence holding).
const ACCENT_PATH: readonly number[] = [2, 18, 15, 17, 8];

/**
 * One glowing dot traveling the accent path node to node, then looping —
 * see this file's own doc comment for why. Same keyframe-array-of-positions
 * recipe `HeroDiagram`'s `Packet` uses (there: `left` percentages along a
 * straight line; here: `cx`/`cy` pairs through several waypoints), just
 * animating SVG attributes instead of a CSS position.
 */
function Packet() {
  const points = ACCENT_PATH.map((i) => NODES[i]);
  const cx = points.map((p) => p.x);
  const cy = points.map((p) => p.y);
  const times = points.map((_, i) => i / (points.length - 1));
  // Fades in leaving the first node, holds fully visible through the
  // waypoints in between, fades out arriving at the last one — never just
  // pops in/out at the path's ends.
  const opacity = points.map((_, i) => (i === 0 || i === points.length - 1 ? 0 : 1));

  return (
    <motion.circle
      r={4}
      className="fill-signal"
      style={{ filter: "drop-shadow(0 0 6px var(--color-signal))" }}
      animate={{ cx, cy, opacity }}
      transition={{ duration: 3.2, times, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
    />
  );
}

function Node({ node, accent, isLight }: { node: MeshNode; accent: boolean; isLight: boolean }) {
  const cls = accent
    ? "fill-signal stroke-signal"
    : isLight
      ? "fill-bg-elevated stroke-text-subtle"
      : "fill-bg-elevated stroke-border-hover";
  if (node.shape === "square") {
    const s = accent ? 9 : 7;
    return <rect x={node.x - s / 2} y={node.y - s / 2} width={s} height={s} strokeWidth={1} className={cls} />;
  }
  return <circle cx={node.x} cy={node.y} r={accent ? 4.5 : 3.5} strokeWidth={1} className={cls} />;
}

export function SystemMeshBackground() {
  const prefersReducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Dark reads this graph as light-on-black — `stroke-border` (translucent
  // near-white) already stands out against `--color-bg`'s near-black.
  // Paper's `--color-border` is the opposite: a very pale tint barely
  // different from the page's own near-white ground, so the exact same
  // classes/opacities read as "not really there" — direct feedback,
  // pointing at a screenshot of the dark version, that this whole graph
  // should look like a visible structure in light too, not just in dark.
  // `--color-text-subtle` (a real mid-tone gray-blue in Paper, not another
  // near-white) stands in for `border`/`border-hover` here — visible on
  // its own even at the same or a slightly lower opacity than dark's,
  // since the color itself is doing the work this time, not the opacity.
  // Tuned down once from an initial pass that read as too heavy next to
  // the hero content it's meant to sit quietly behind.
  const edgeCls = isLight ? "stroke-text-subtle" : "stroke-border";
  const edgeOpacity = isLight ? 0.35 : 0.4;
  const nodeOpacity = 0.5;

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
      focusable="false"
    >
      <g className={edgeCls} strokeWidth={1} opacity={edgeOpacity}>
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

      <g opacity={nodeOpacity}>
        {NODES.map((node, i) => (
          <Node key={i} node={node} accent={ACCENT_NODES.has(i)} isLight={isLight} />
        ))}
      </g>

      {!prefersReducedMotion && <Packet />}
    </svg>
  );
}
