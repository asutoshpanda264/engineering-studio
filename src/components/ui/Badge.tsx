import type { HTMLAttributes } from "react";

type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "error";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-bg-elevated text-text-muted",
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-text-subtle",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
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
