"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * Compact single-series trend line for a stat tile (dataviz skill —
 * "choosing a form": a single current value + trend is a stat tile with a
 * sparkline, not a full chart). One hue, no legend — a single series names
 * itself via the tile's own label, per the skill's mark spec: 2px round-cap
 * line, a soft area wash, and a hover crosshair since this has a plot (the
 * skill's hover rule only exempts a bare stat tile with no plot at all).
 */
export interface SparklinePoint {
  time: number;
  value: number;
}

export interface SparklineProps {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  /** Any valid CSS color — defaults to the app's primary token. */
  color?: string;
  formatValue?: (value: number) => string;
  formatTime?: (time: number) => string;
  /** Current playback position, if this sparkline is tracking a live run. */
  cursorTime?: number | null;
}

const PADDING_Y = 3;

export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = "var(--color-primary)",
  formatValue = (v) => v.toFixed(1),
  formatTime = (t) => `${(t / 1000).toFixed(1)}s`,
  cursorTime = null,
}: SparklineProps) {
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const scales = useMemo(() => {
    if (data.length === 0) return null;

    const minTime = data[0].time;
    const maxTime = data[data.length - 1].time;
    const timeSpan = Math.max(1, maxTime - minTime);

    const values = data.map((d) => d.value);
    let minValue = Math.min(...values);
    let maxValue = Math.max(...values);
    if (minValue === maxValue) {
      minValue -= 1;
      maxValue += 1;
    }

    const plotTop = PADDING_Y;
    const plotBottom = height - PADDING_Y;

    const xForTime = (t: number) => ((t - minTime) / timeSpan) * width;
    const yForValue = (v: number) =>
      plotBottom - ((v - minValue) / (maxValue - minValue)) * (plotBottom - plotTop);

    const points = data.map((d) => `${xForTime(d.time)},${yForValue(d.value)}`);
    const linePath = `M${points.join("L")}`;
    const areaPath = `${linePath}L${width},${height}L0,${height}Z`;

    return { xForTime, yForValue, linePath, areaPath };
  }, [data, width, height]);

  if (!scales) {
    return <div style={{ width, height }} aria-hidden />;
  }

  const { xForTime, yForValue, linePath, areaPath } = scales;

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const targetTime = data[0].time + fraction * (data[data.length - 1].time - data[0].time);

    let nearest = 0;
    let nearestDistance = Infinity;
    data.forEach((point, i) => {
      const distance = Math.abs(point.time - targetTime);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  const cursorX = cursorTime !== null ? xForTime(cursorTime) : null;
  const hoverPoint = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width, height }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverIndex(null)}
    >
      <svg width={width} height={height} className="overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {cursorX !== null && (
          <line
            x1={cursorX}
            x2={cursorX}
            y1={0}
            y2={height}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.6}
          />
        )}
        {hoverPoint && (
          <>
            <line
              x1={xForTime(hoverPoint.time)}
              x2={xForTime(hoverPoint.time)}
              y1={0}
              y2={height}
              stroke="var(--color-text-subtle)"
              strokeWidth={1}
            />
            <circle
              cx={xForTime(hoverPoint.time)}
              cy={yForValue(hoverPoint.value)}
              r={4}
              fill={color}
              stroke="var(--color-bg-panel)"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {hoverPoint && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-border bg-bg-elevated px-2 py-1 text-[11px] shadow-dropdown"
          style={{
            left: Math.min(Math.max(xForTime(hoverPoint.time), 28), width - 28),
            top: 0,
            transform: "translate(-50%, calc(-100% - 6px))",
          }}
        >
          <span className="font-medium text-text">{formatValue(hoverPoint.value)}</span>
          <span className="ml-1.5 text-text-subtle">{formatTime(hoverPoint.time)}</span>
        </div>
      )}
    </div>
  );
}
