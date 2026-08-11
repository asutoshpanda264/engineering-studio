"use client";

import type { KeyboardEvent } from "react";
import { motion } from "framer-motion";

/**
 * The bordered subtitle bar every stepped diagram in this folder puts
 * under its topology — a small play/pause button at the left edge
 * (reusing that space instead of a separate floating control, per direct
 * feedback on the first diagram this shipped for) plus the current step's
 * caption, crossfading in on a remount whenever `captionKey` changes.
 *
 * Purely presentational — pass it whatever `useSteppedAnimation` gives you.
 */
export function DiagramCaptionBar({
  x = 4,
  y,
  width = 652,
  caption,
  captionKey,
  paused,
  onTogglePause,
}: {
  x?: number;
  y: number;
  width?: number;
  caption: string;
  /** Remount key for the caption's crossfade-in — pass the current step index. */
  captionKey: number | string;
  paused: boolean;
  onTogglePause: () => void;
}) {
  const buttonCx = x + 20;
  const buttonCy = y + 13;
  const textX = x + width / 2;

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onTogglePause();
    }
  };

  return (
    <>
      <rect x={x} y={y} width={width} height={26} rx={2} className="fill-bg stroke-border" strokeWidth={1} />

      <g
        role="button"
        tabIndex={0}
        aria-label={paused ? "Play the animation" : "Pause the animation"}
        onClick={onTogglePause}
        onKeyDown={onKeyDown}
        className="cursor-pointer outline-none"
      >
        <circle
          cx={buttonCx}
          cy={buttonCy}
          r={11}
          strokeWidth={1}
          className="fill-bg-elevated stroke-border transition-colors duration-fast ease-standard hover:stroke-signal focus-visible:stroke-signal"
        />
        {paused ? (
          <path
            d={`M${buttonCx - 3} ${buttonCy - 6} L${buttonCx - 3} ${buttonCy + 6} L${buttonCx + 5} ${buttonCy} Z`}
            className="fill-text"
          />
        ) : (
          <>
            <rect x={buttonCx - 4} y={buttonCy - 6} width={3} height={12} className="fill-text" />
            <rect x={buttonCx + 1} y={buttonCy - 6} width={3} height={12} className="fill-text" />
          </>
        )}
      </g>

      <motion.text
        key={captionKey}
        x={textX}
        y={y + 18}
        textAnchor="middle"
        className="fill-text text-[10px] font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {caption}
      </motion.text>
    </>
  );
}
