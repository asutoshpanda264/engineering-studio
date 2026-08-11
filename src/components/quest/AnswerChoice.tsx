"use client";

import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { questSnappy } from "@/lib/quest/motion";

export type AnswerChoiceState = "default" | "correct" | "incorrect";

export interface AnswerChoiceProps {
  label: string;
  state?: AnswerChoiceState;
  /** True once *any* choice in the group has been picked and this isn't
      it — dims it and blocks clicks without claiming it was wrong. */
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

// Same offset-shadow convention as GameButton/LessonNode — duplicated
// rather than shared, since a quiz option and a generic action button
// are related but not the same component (see GameButton.tsx's own
// note on this).
const SHADOW_OFFSET_PX = 4;

const STATE_FILL: Record<AnswerChoiceState, string> = {
  default: "var(--quest-cream)",
  correct: "var(--quest-green)",
  incorrect: "var(--quest-coral)",
};

// A one-off reaction (pop on correct, shake on incorrect), not a loop —
// this is a single event, not an ongoing state like `ConceptObject`'s
// "overloaded" wobble.
const FEEDBACK_ANIMATE: Record<AnswerChoiceState, { scale: number[] } | { x: number[] } | undefined> = {
  default: undefined,
  correct: { scale: [1, 1.06, 1] },
  incorrect: { x: [0, -6, 6, -6, 0] },
};

/**
 * One option in a lesson's question. Clicking is the whole interaction
 * — there's no separate "confirm" step — so `state` moves straight from
 * `default` to `correct`/`incorrect` on click, and locks there.
 */
export function AnswerChoice({ label, state = "default", disabled = false, onClick, className = "" }: AnswerChoiceProps) {
  const isAnswered = state !== "default";
  const interactive = !disabled && !isAnswered;

  return (
    <span className="relative block">
      {interactive && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[var(--quest-radius-md)]"
          style={{ top: SHADOW_OFFSET_PX, background: "var(--quest-shadow-color)" }}
        />
      )}
      <motion.button
        type="button"
        disabled={disabled || isAnswered}
        onClick={interactive ? onClick : undefined}
        animate={FEEDBACK_ANIMATE[state]}
        transition={state === "default" ? questSnappy : { duration: 0.4, ease: "easeInOut" }}
        whileHover={interactive ? { y: -2 } : undefined}
        whileTap={interactive ? { y: SHADOW_OFFSET_PX } : undefined}
        className={`relative flex w-full items-center gap-3 rounded-[var(--quest-radius-md)] border-[length:var(--quest-border-width)] border-[var(--quest-ink)] px-4 py-3 text-left font-semibold text-[var(--quest-ink)] disabled:cursor-default ${
          disabled && !isAnswered ? "opacity-50" : ""
        } ${className}`}
        style={{ background: STATE_FILL[state] }}
      >
        {state === "correct" && <Check className="size-5 shrink-0" aria-hidden />}
        {state === "incorrect" && <X className="size-5 shrink-0" aria-hidden />}
        <span>{label}</span>
      </motion.button>
    </span>
  );
}
