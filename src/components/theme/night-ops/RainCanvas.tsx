"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
  opacity: number;
}

function makeDrops(width: number, height: number): Drop[] {
  const count = Math.round((width * height) / 22000);
  const drops: Drop[] = [];
  for (let i = 0; i < count; i++) {
    drops.push({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 14 + Math.random() * 22,
      speed: 4 + Math.random() * 5,
      opacity: 0.08 + Math.random() * 0.14,
    });
  }
  return drops;
}

/**
 * Ambient rain for the Night Ops preview theme — thin falling streaks,
 * cool-toned and low-opacity, meant to read as rain against glass rather
 * than a literal weather sim. Canvas rather than DOM nodes since this is
 * dozens of moving elements every frame; a `<canvas>` is the cheap way to
 * do that without layout/paint cost per drop.
 *
 * Respects `prefers-reduced-motion`: draws one still frame of streaks
 * instead of animating, same as `DnsRecursiveLookupDiagram`'s pattern
 * elsewhere in the app — the mood stays, the motion doesn't. Also pauses
 * the loop while the tab is hidden.
 */
export function RainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let drops: Drop[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = makeDrops(width, height);
    }
    resize();
    window.addEventListener("resize", resize);

    function drawDrop(d: Drop) {
      ctx!.strokeStyle = `hsl(220 20% 75% / ${d.opacity})`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(d.x, d.y);
      ctx!.lineTo(d.x - 2, d.y + d.len);
      ctx!.stroke();
    }

    if (prefersReducedMotion) {
      ctx.clearRect(0, 0, width, height);
      drops.forEach(drawDrop);
      return () => window.removeEventListener("resize", resize);
    }

    let raf = 0;
    function frame() {
      ctx!.clearRect(0, 0, width, height);
      for (const d of drops) {
        drawDrop(d);
        d.y += d.speed;
        d.x -= 0.3;
        if (d.y > height) {
          d.y = -d.len;
          d.x = Math.random() * width;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(frame);
      }
    }
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden
    />
  );
}
