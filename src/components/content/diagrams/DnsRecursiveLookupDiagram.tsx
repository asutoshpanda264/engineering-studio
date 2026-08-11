"use client";

import { motion } from "framer-motion";
import { ArrowMarker, DiagramArrow, DiagramBox } from "./primitives";
import { useSteppedAnimation } from "./useSteppedAnimation";
import { DiagramCaptionBar } from "./DiagramCaptionBar";

/**
 * The same swiggy.com resolution `DnsResolutionFlowDiagram` lists as a
 * numbered checklist, redrawn as what it actually is: one resolver making
 * four separate round trips out to different authorities and back, never
 * talking to Root/TLD/Authoritative directly with each other. A single
 * packet — colored `signal` while it's a query heading out, `healthy`
 * while it's a response heading back to the resolver — bounces
 * Browser → Resolver → Root → Resolver → TLD → Resolver → Authoritative →
 * Resolver → Browser, on a loop, with a subtitle underneath spelling out
 * what was actually just resolved at each hop.
 *
 * Stepping/pausing is handled by `useSteppedAnimation` and the caption bar
 * (with its built-in play/pause button) by `DiagramCaptionBar` — both
 * shared with every other stepped diagram in this folder now, factored out
 * once this became the second one (see `RateLimiterTokenBucketDiagram`).
 * Respects `prefers-reduced-motion` by not rendering any of this at all.
 */

const ARROW_ID = "dns-recursive-arrow";

const BROWSER = { x: 12, y: 84, w: 138, h: 40 };
const RESOLVER = { x: 240, y: 84, w: 160, h: 40 };
const ROOT = { x: 480, y: 4, w: 168, h: 40 };
const TLD = { x: 480, y: 84, w: 168, h: 40 };
const AUTH = { x: 480, y: 164, w: 168, h: 40 };

const CAPTION_Y = 232;
const VIEWBOX_HEIGHT = 258;

const centerOf = (n: { x: number; y: number; w: number; h: number }) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

// The loop: query out to each authority, response back to the resolver,
// then the resolver's final answer back to the browser. Waypoint 0 and the
// last waypoint are both Browser's center, so wrapping the step counter
// back to 0 is a no-op position-wise — no jump to hide, no fade needed.
const WAYPOINTS = [
  centerOf(BROWSER),
  centerOf(RESOLVER),
  centerOf(ROOT),
  centerOf(RESOLVER),
  centerOf(TLD),
  centerOf(RESOLVER),
  centerOf(AUTH),
  centerOf(RESOLVER),
  centerOf(BROWSER),
];

// One entry per leg (waypoint i -> i+1): the caption to show while
// traveling that leg, and whether it's a query heading out (signal) or a
// response heading back (healthy).
const LEGS: { caption: string; tone: "signal" | "healthy" }[] = [
  { caption: "Browser asks the resolver: what's the IP for swiggy.com?", tone: "signal" },
  { caption: "Resolver asks Root: who handles .com?", tone: "signal" },
  { caption: "Root resolves the TLD: \"for .com domains, ask 192.5.6.30\"", tone: "healthy" },
  { caption: "Resolver asks the .com TLD server: where does swiggy.com live?", tone: "signal" },
  { caption: "TLD resolves swiggy's own DNS server: \"ask 205.251.x.x\"", tone: "healthy" },
  { caption: "Resolver asks swiggy.com's authoritative server directly: what's your IP?", tone: "signal" },
  { caption: "Authoritative resolves the final IP — geo-routed to the nearest edge", tone: "healthy" },
  { caption: "Resolver hands the browser its answer: swiggy.com → 13.234.156.90", tone: "healthy" },
];

const LEG_DURATION_S = 2.6;
const REPEAT_PAUSE_S = 1.4;

const TONE_COLOR: Record<"signal" | "healthy", string> = {
  signal: "var(--color-signal)",
  healthy: "var(--color-status-healthy)",
};

export function DnsRecursiveLookupDiagram() {
  const { step, paused, togglePaused, playing } = useSteppedAnimation(WAYPOINTS.length, LEG_DURATION_S, REPEAT_PAUSE_S);

  const activeLeg = step > 0 ? LEGS[step - 1] : undefined;
  const dotPos = WAYPOINTS[step];
  const dotColor = activeLeg ? TONE_COLOR[activeLeg.tone] : "var(--color-text-subtle)";

  return (
    <svg
      viewBox={`0 0 660 ${VIEWBOX_HEIGHT}`}
      className="h-auto w-full text-text-muted"
      role="img"
      aria-label="Recursive DNS lookup: the resolver makes four separate round trips — to the root server, the .com TLD server, and swiggy.com's authoritative server — before answering the browser, resolving one step closer to the final IP at each hop."
    >
      <ArrowMarker id={ARROW_ID} />

      <DiagramArrow x1={BROWSER.x + BROWSER.w} y1={BROWSER.y + BROWSER.h / 2} x2={RESOLVER.x} y2={RESOLVER.y + RESOLVER.h / 2} markerId={ARROW_ID} />
      <DiagramArrow x1={RESOLVER.x + RESOLVER.w - 24} y1={RESOLVER.y + 2} x2={ROOT.x} y2={ROOT.y + ROOT.h - 6} markerId={ARROW_ID} />
      <DiagramArrow x1={RESOLVER.x + RESOLVER.w} y1={RESOLVER.y + RESOLVER.h / 2} x2={TLD.x} y2={TLD.y + TLD.h / 2} markerId={ARROW_ID} />
      <DiagramArrow x1={RESOLVER.x + RESOLVER.w - 24} y1={RESOLVER.y + RESOLVER.h - 2} x2={AUTH.x} y2={AUTH.y + 6} markerId={ARROW_ID} />

      <DiagramBox x={BROWSER.x} y={BROWSER.y} width={BROWSER.w} height={BROWSER.h} lines={["Browser"]} />
      <DiagramBox x={RESOLVER.x} y={RESOLVER.y} width={RESOLVER.w} height={RESOLVER.h} lines={["Recursive Resolver", "your ISP"]} tone="signal" />
      <DiagramBox x={ROOT.x} y={ROOT.y} width={ROOT.w} height={ROOT.h} lines={["Root DNS Server"]} />
      <DiagramBox x={TLD.x} y={TLD.y} width={TLD.w} height={TLD.h} lines={[".com TLD Server"]} />
      <DiagramBox x={AUTH.x} y={AUTH.y} width={AUTH.w} height={AUTH.h} lines={["swiggy.com DNS", "authoritative"]} tone="healthy" />

      {playing && (
        <>
          <motion.circle
            r={5}
            initial={false}
            animate={{ cx: dotPos.x, cy: dotPos.y, fill: dotColor }}
            transition={{ duration: LEG_DURATION_S, ease: "easeInOut" }}
            style={{ filter: "drop-shadow(0 0 4px currentColor)", color: dotColor }}
          />

          <DiagramCaptionBar
            y={CAPTION_Y - 18}
            caption={activeLeg ? activeLeg.caption : "Watching a fresh swiggy.com lookup start…"}
            captionKey={step}
            paused={paused}
            onTogglePause={togglePaused}
          />
        </>
      )}
    </svg>
  );
}
