import type { HTMLAttributes } from "react";

type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "error";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

// Hairline-bordered tag, not a filled rounded pill — same "specimen" mark
// as the landing page's Tag component, so a badge always reads as data,
// never as decoration.
const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border-border text-text-muted",
  primary: "border-signal/50 text-signal",
  success: "border-status-healthy/50 text-status-healthy",
  warning: "border-status-degraded/50 text-status-degraded",
  error: "border-status-critical/50 text-status-critical",
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
