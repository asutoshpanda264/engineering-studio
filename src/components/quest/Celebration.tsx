"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

export interface CelebrationProps {
  className?: string;
}

const COLORS = ["var(--quest-yellow)", "var(--quest-blue)", "var(--quest-coral)", "var(--quest-green)"];
const PARTICLE_COUNT = 16;

interface Particle {
  id: number;
  dx: number;
  dy: number;
  rotate: number;
  color: string;
  delay: number;
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * 360 + (Math.random() * 20 - 10);
    const distance = 60 + Math.random() * 50;
    const rad = (angle * Math.PI) / 180;
    return {
      id: i,
      dx: Math.cos(rad) * distance,
      dy: Math.sin(rad) * distance,
      rotate: angle,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.15,
    };
  });
}

/**
 * A confetti burst, fired only on genuine completion — never a loop,
 * never decoration. Plays once on mount; if a future screen needs a
 * second burst without a full page navigation, give this a changing
 * `key` from the parent rather than adding a re-trigger prop here — a
 * remount is the whole mechanism, no extra API needed.
 */
export function Celebration({ className = "" }: CelebrationProps) {
  const particles = useMemo(() => makeParticles(), []);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-visible ${className}`}>
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute left-1/2 top-1/2 size-2.5 rounded-[3px]"
          style={{ background: particle.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: particle.dx, y: particle.dy, opacity: 0, scale: 0.4, rotate: particle.rotate }}
          transition={{ duration: 0.9, delay: particle.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
