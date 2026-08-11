export interface ProgressIndicatorProps {
  /** 0-based index of the current step. */
  value: number;
  /** Total number of steps. */
  max: number;
  className?: string;
}

/**
 * A row of chunky segments, not a percentage bar — "step 3 of 5" reads
 * faster as filled/unfilled notches than as a smoothly-animated
 * percentage would, and it matches the game-HUD checkpoint-marker
 * language the rest of Quest uses. Session-only, never persisted — see
 * docs-game/CLAUDE.md's constraints on XP/progress.
 */
export function ProgressIndicator({ value, max, className = "" }: ProgressIndicatorProps) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value + 1}
      aria-valuemin={1}
      aria-valuemax={max}
      className={`flex items-center gap-1.5 ${className}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="h-2.5 flex-1 rounded-[var(--quest-radius-pill)] border-[length:var(--quest-border-width)] border-[var(--quest-ink)]"
          style={{ background: i <= value ? "var(--quest-yellow)" : "var(--quest-cream)" }}
        />
      ))}
    </div>
  );
}
