"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Fades + lifts a section into place the first time it scrolls into view.
 * Skips the animation under prefers-reduced-motion (WORKSHOP-UI.md §20)
 * rather than relying on the global CSS override, since this is driven by
 * Framer's JS animation loop, not a CSS transition.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
