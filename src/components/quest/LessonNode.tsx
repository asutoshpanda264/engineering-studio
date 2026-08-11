"use client";

import Link from "next/link";
import { Check, Lock, Play } from "lucide-react";
import { motion } from "framer-motion";
import { questSnappy } from "@/lib/quest/motion";

export type LessonNodeStatus = "locked" | "unlocked" | "current" | "completed";

export interface LessonNodeProps {
  title: string;
  status: LessonNodeStatus;
  /** Only used when status is unlocked/current/completed — locked nodes
      have nowhere to navigate to yet. */
  href?: string;
  className?: string;
}

// Kept in sync with GameButton's SHADOW_OFFSET_PX by convention, not
// import — a node badge and a button are visually related but not the
// same component, and a shared constant would be a premature
// abstraction for one repeated number (see the project's own
// don't-abstract-until-a-second-real-case rule).
const SHADOW_OFFSET_PX = 4;

const STATUS_FILL: Record<LessonNodeStatus, string> = {
  locked: "var(--quest-navy-deep)",
  unlocked: "var(--quest-blue)",
  current: "var(--quest-yellow)",
  completed: "var(--quest-green)",
};

function StatusIcon({ status }: { status: LessonNodeStatus }) {
  switch (status) {
    case "locked":
      return <Lock className="size-6" aria-hidden />;
    case "completed":
      return <Check className="size-7" aria-hidden />;
    case "current":
      return <Play className="size-6 fill-current" aria-hidden />;
    case "unlocked":
    default:
      return <span className="size-3 rounded-full bg-current" aria-hidden />;
  }
}

/**
 * One stop on the world map. `current` is the deliberately louder
 * state — a continuous pulse — since it's the one thing the player
 * should actually do next; every other state is a static badge so the
 * pulse keeps meaning something instead of every node vibrating at
 * once. Locked nodes render as an inert silhouette: visible (the world
 * is bigger than one lesson) but not interactive.
 */
export function LessonNode({ title, status, href, className = "" }: LessonNodeProps) {
  const interactive = status !== "locked" && Boolean(href);

  const badge = (
    <span className="relative inline-block">
      {interactive && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ top: SHADOW_OFFSET_PX, background: "var(--quest-shadow-color)" }}
        />
      )}
      <motion.span
        animate={status === "current" ? { scale: [1, 1.08, 1] } : { scale: 1, y: 0 }}
        transition={
          status === "current"
            ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
            : questSnappy
        }
        whileHover={interactive ? { y: -2 } : undefined}
        whileTap={interactive ? { y: SHADOW_OFFSET_PX } : undefined}
        className={`relative flex size-16 items-center justify-center rounded-full border-[length:var(--quest-border-width)] sm:size-20 ${
          status === "locked"
            ? "border-[var(--quest-ink-on-dark-muted)] text-[var(--quest-ink-on-dark-muted)] opacity-70"
            : "border-[var(--quest-ink)] text-[var(--quest-ink)]"
        }`}
        style={{ background: STATUS_FILL[status] }}
      >
        <StatusIcon status={status} />
      </motion.span>
    </span>
  );

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {interactive && href ? (
        <Link href={href} aria-label={title}>
          {badge}
        </Link>
      ) : (
        <div aria-label={`${title} — locked`}>{badge}</div>
      )}
      <span
        data-quest-display
        className={`max-w-[7rem] text-center text-xs font-semibold ${
          status === "locked" ? "text-[var(--quest-ink-on-dark-muted)]" : "text-[var(--quest-ink-on-dark)]"
        }`}
      >
        {title}
      </span>
    </div>
  );
}
