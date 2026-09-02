import type { HTMLAttributes } from "react";

type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "error";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

// Hairline-bordered tag, not a filled rounded pill — same "specimen" mark
// as the landing page's Tag component, so a badge always reads as data,
// never as decoration. A faint tint of the variant color sits behind the
// hairline (10% opacity, neutral gets a plain elevated wash) so a badge
// reads as a small solid chip at a glance instead of just outlined text —
// "refined tag," not "more border."
const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border-border bg-bg-elevated/60 text-text-muted",
  primary: "border-signal/50 bg-signal/10 text-signal",
  success: "border-status-healthy/50 bg-status-healthy/10 text-status-healthy",
  warning: "border-status-degraded/50 bg-status-degraded/10 text-status-degraded",
  error: "border-status-critical/50 bg-status-critical/10 text-status-critical",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-text-subtle",
  primary: "bg-signal",
  success: "bg-status-healthy",
  warning: "bg-status-degraded",
  error: "bg-status-critical",
};

export function Badge({
  variant = "neutral",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`size-1.5 shrink-0 rounded-full ${dotClasses[variant]}`}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
