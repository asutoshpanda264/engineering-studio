"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

const CHAR_INTERVAL_MS = 24;

/**
 * Reveals `text` one character at a time, VN-style. Resets whenever
 * `text` itself changes (a new dialogue beat), and skips straight to the
 * full string for `prefers-reduced-motion` — the typewriter is a flavor
 * effect, not something anyone should have to wait out.
 */
function useTypewriter(text: string): { shown: string; isDone: boolean; skipToEnd: () => void } {
  const [shownLength, setShownLength] = useState(0);
  const [trackedText, setTrackedText] = useState(text);

  // Reset synchronously during render when the line itself changes —
  // React's documented pattern for "resetting state when a prop
  // changes," rather than an effect that calls setState immediately on
  // mount/update (which the lint rule flags, and which would still cost
  // an extra render either way).
  if (text !== trackedText) {
    setTrackedText(text);
    setShownLength(0);
  }

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion still goes through the interval (just one tick of
    // the full length) rather than setting state directly in the effect
    // body — keeps this a single code path instead of two.
    const step = reduceMotion ? text.length : 1;

    let shown = 0;
    const id = window.setInterval(() => {
      shown = Math.min(shown + step, text.length);
      setShownLength(shown);
      if (shown >= text.length) window.clearInterval(id);
    }, CHAR_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [text]);

  return {
    shown: text.slice(0, shownLength),
    isDone: shownLength >= text.length,
    skipToEnd: () => setShownLength(text.length),
  };
}

export interface DialogueBoxProps {
  /** Name plate above the box — omit for an unattributed/narration line. */
  speakerName?: string;
  text: string;
  /** Present only when this beat can advance (e.g. not the final beat in
      a scene). First click/Enter/Space skips the typewriter if it's
      still running; the next one calls this. Omit to render a static,
      non-interactive line. */
  onAdvance?: () => void;
  /** Rendered below the text once it's fully revealed — e.g. an
      `AnswerChoice` list. Never clickable-through to `onAdvance`, they're
      deliberately separate interactive regions. */
  children?: ReactNode;
  className?: string;
}

export function DialogueBox({ speakerName, text, onAdvance, children, className = "" }: DialogueBoxProps) {
  const { shown, isDone, skipToEnd } = useTypewriter(text);
  const interactive = Boolean(onAdvance);

  const advanceOrSkip = () => {
    if (!isDone) {
      skipToEnd();
      return;
    }
    onAdvance?.();
  };

  return (
    <div
      className={`relative rounded-[var(--quest-radius-lg)] border-[length:var(--quest-border-width)] border-[var(--quest-ink)] bg-[var(--quest-cream)] p-5 text-[var(--quest-ink)] ${className}`}
    >
      {speakerName && (
        <span
          data-quest-display
          className="absolute -top-4 left-5 rounded-[var(--quest-radius-md)] border-[length:var(--quest-border-width)] border-[var(--quest-ink)] bg-[var(--quest-yellow)] px-3 py-1 text-sm font-semibold"
        >
          {speakerName}
        </span>
      )}
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? advanceOrSkip : undefined}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  advanceOrSkip();
                }
              }
            : undefined
        }
        className={`text-lg leading-relaxed ${interactive ? "cursor-pointer" : ""}`}
      >
        {shown}
        {interactive && isDone && (
          <motion.span
            aria-hidden
            className="ml-1 inline-block text-xl"
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          >
            ▾
          </motion.span>
        )}
      </div>
      {isDone && children && <div className="mt-4">{children}</div>}
    </div>
  );
}
