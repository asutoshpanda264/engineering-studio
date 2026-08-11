"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { questSnappy } from "@/lib/quest/motion";

type GameButtonVariant = "primary" | "secondary" | "ghost";
type GameButtonSize = "sm" | "md" | "lg";

// framer-motion's HTMLMotionProps<"button"> and React's own
// ButtonHTMLAttributes disagree on a handful of event signatures
// (drag/animation events mean something more specific to Framer) —
// omitting them here is the standard fix for spreading native button
// props onto a `motion.button`.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
>;

export interface GameButtonProps extends NativeButtonProps {
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  icon?: ReactNode;
}

// Keep in sync with `--quest-shadow-offset` in quest.css. Framer needs a
// plain number to animate a transform; reading a CSS custom property
// into a motion value would need a DOM measurement this component has
// no reason to do otherwise.
const SHADOW_OFFSET_PX = 4;

const BASE =
  "relative inline-flex items-center justify-center rounded-[var(--quest-radius-pill)] border-[length:var(--quest-border-width)] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quest-blue)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const VARIANT_CLASSES: Record<GameButtonVariant, string> = {
  primary: "border-[var(--quest-ink)] bg-[var(--quest-yellow)] text-[var(--quest-ink)] hover:bg-[var(--quest-yellow-deep)]",
  secondary: "border-[var(--quest-ink)] bg-[var(--quest-cream)] text-[var(--quest-ink)] hover:bg-[var(--quest-cream-dim)]",
  ghost: "border-transparent bg-transparent text-[var(--quest-ink-on-dark)] hover:bg-white/10",
};

const SIZE_CLASSES: Record<GameButtonSize, string> = {
  sm: "gap-1.5 px-4 py-2 text-sm",
  md: "gap-2 px-6 py-3 text-base",
  lg: "gap-2.5 px-8 py-4 text-lg",
};

/**
 * Quest's one tactile button. `primary`/`secondary` get the offset
 * "pushable" shadow (a static block underneath, the face slides down
 * onto it on press so the shadow visually disappears) — `ghost` skips
 * the shadow entirely for lower-emphasis actions (e.g. "skip") that
 * shouldn't compete with a screen's primary action. Every press moves;
 * that's the point — see docs-game/CLAUDE.md §6.
 */
export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  ({ variant = "primary", size = "md", icon, disabled, className = "", children, ...props }, ref) => {
    const tactile = variant !== "ghost";

    return (
      <span className="relative inline-block">
        {tactile && (
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              top: SHADOW_OFFSET_PX,
              background: "var(--quest-shadow-color)",
              borderRadius: "var(--quest-radius-pill)",
            }}
          />
        )}
        <motion.button
          ref={ref}
          data-quest-display
          disabled={disabled}
          initial={{ y: 0 }}
          whileHover={disabled ? undefined : { y: tactile ? -2 : 0, scale: tactile ? 1 : 1.03 }}
          whileTap={disabled ? undefined : { y: tactile ? SHADOW_OFFSET_PX : 0, scale: tactile ? 1 : 0.97 }}
          transition={questSnappy}
          className={`${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
          {...props}
        >
          {icon}
          {children}
        </motion.button>
      </span>
    );
  }
);
GameButton.displayName = "GameButton";
