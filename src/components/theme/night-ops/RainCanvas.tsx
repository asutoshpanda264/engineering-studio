"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { WeatherPhase } from "@/components/theme/night-ops/weatherCycle";

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

// How strongly each precipitation dial (see weatherCycle.ts) reads for a
// given phase. RainCanvas eases toward these every frame instead of
// snapping to them — that's what makes "heavy rain slowing into snow"
// read as weather actually changing rather than a hard cut. `intensity`
// is how much falls at all; `snow` is rain-vs-snow — two independent
// dials, not one three-state enum, so a drop can be mid-crossfade between
// looking like rain and looking like snow while intensity is also still
// easing toward its own target.
const INTENSITY_TARGET: Record<WeatherPhase, number> = {
  // Was 0.35 ("light-rain") — read as unnoticeable, since it was also the
  // resting/reduced-motion look. Bumped so the loop's base rain is clearly
  // weather from the moment it starts, not just a rounding error before
  // heavy-rain arrives.
  rain: 0.55,
  "heavy-rain": 1,
  snow: 0.55,
};
const SNOW_TARGET: Record<WeatherPhase, number> = {
  rain: 0,
  "heavy-rain": 0,
  snow: 1,
};

// Rate the eased dials above close the gap toward their target, per frame
// at 60fps — small enough that a full swing (e.g. heavy-rain's intensity
// 1 easing down to snow's 0.55, alongside snow climbing 0 to 1) takes
// several seconds, not an instant snap.
const EASE_RATE = 0.006;

/**
 * Ambient precipitation for the Night Ops preview theme — thin falling
 * streaks for rain, drifting flakes for snow, cool-toned and low-opacity,
 * meant to read as weather against glass rather than a literal sim.
 * Driven by `phase` (see weatherCycle.ts's automatic rain -> snow loop,
 * always some precipitation falling, owned by NightOpsAtmosphere): rather
 * than swapping look on every phase change, the same fixed drop pool eases two
 * dials (intensity, rain-vs-snow) toward each phase's targets every
 * frame, so both the intensity ramp and the rain->snow crossfade read as
 * gradual weather change. Canvas rather than DOM nodes since this is
 * dozens of moving elements every frame; a `<canvas>` is the cheap way to
 * do that without layout/paint cost per drop.
 *
 * Respects `prefers-reduced-motion`: draws one still frame at the resting
 * rain look instead of animating or cycling at all (the weather
 * cycle itself never advances under reduced motion either — see
 * weatherCycle.ts), same as `DnsRecursiveLookupDiagram`'s pattern
 * elsewhere in the app — the mood stays, the motion doesn't. Also pauses
 * the loop while the tab is hidden.
 */
export function RainCanvas({ phase }: { phase: WeatherPhase }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef(phase);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

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

    // Draws a drop as a rain streak, a snow flake, or a crossfade of both
    // depending on `snow` — two draw calls sharing one position rather
    // than trying to morph one shape into the other, which reads as a
    // clean dissolve at the low opacities this runs at.
    function drawParticle(d: Drop, intensity: number, snow: number) {
      const alpha = d.opacity * intensity;
      if (alpha < 0.004) return;
      if (snow < 0.96) {
        ctx!.strokeStyle = `hsl(220 20% 75% / ${alpha * (1 - snow)})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(d.x, d.y);
        ctx!.lineTo(d.x - 2, d.y + d.len);
        ctx!.stroke();
      }
      if (snow > 0.04) {
        const radius = 1.4 + (d.len / 36) * 2.2;
        ctx!.fillStyle = `hsl(200 70% 94% / ${alpha * snow})`;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, radius, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    if (prefersReducedMotion) {
      const restIntensity = INTENSITY_TARGET.rain;
      ctx.clearRect(0, 0, width, height);
      drops.forEach((d) => drawParticle(d, restIntensity, 0));
      return () => window.removeEventListener("resize", resize);
    }

    let raf = 0;
    let intensity = 0;
    let snow = 0;
    function frame(t: number) {
      const targetIntensity = INTENSITY_TARGET[phaseRef.current];
      const targetSnow = SNOW_TARGET[phaseRef.current];
      intensity += (targetIntensity - intensity) * EASE_RATE;
      snow += (targetSnow - snow) * EASE_RATE;

      ctx!.clearRect(0, 0, width, height);
      for (const d of drops) {
        drawParticle(d, intensity, snow);
        // Falls slower and drifts side-to-side (a sine wander, phased by
        // each drop's own x so the flock doesn't sway in lockstep) the
        // more "snow" it's become; a straight-down lean the more "rain".
        const fallSpeed = d.speed * (1 - snow * 0.78);
        const drift = -0.3 * (1 - snow) + Math.sin(t * 0.0015 + d.x * 0.01) * 0.6 * snow;
        d.y += fallSpeed;
        d.x += drift;
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
