import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";
/**
 * "sharp" (default) is Trace's flat, zero-radius, uppercase-mono block —
 * unchanged, every existing call site. "pill" is the opt-in modern
 * treatment for the auth/report surfaces only (see login/register pages,
 * ReportBugButton) — rounded, sentence-case, with a soft lift on hover.
 */
type ButtonShape = "sharp" | "pill";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  icon?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<ButtonShape, Record<ButtonVariant, string>> = {
  sharp: {
    // text-bg (not a hardcoded white) so the primary block keeps working
    // ink-on-accent contrast in both themes — same flat, zero-radius
    // solid-block treatment as every other primary action in the product
    // (see LinkButton.tsx, its <Link> counterpart).
    primary: "bg-signal text-bg hover:bg-signal-hover active:bg-signal-active",
    secondary:
      "bg-bg-elevated text-text border border-border hover:border-border-hover hover:bg-bg-panel",
    ghost: "text-text-muted hover:text-text hover:bg-bg-elevated",
  },
  pill: {
    primary:
      "bg-signal text-bg shadow-lg shadow-signal/25 hover:bg-signal-hover hover:shadow-signal/40 hover:-translate-y-0.5 active:translate-y-0 active:bg-signal-active",
    secondary:
      "bg-bg-elevated text-text border border-border hover:border-border-hover hover:bg-bg-hover hover:-translate-y-0.5 active:translate-y-0",
    ghost: "text-text-muted hover:text-text hover:bg-bg-elevated",
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-sm gap-2",
};

const shapeClasses: Record<ButtonShape, string> = {
  sharp: "uppercase tracking-wide",
  pill: "rounded-xl tracking-normal",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      shape = "sharp",
      icon,
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-medium
          transition-all duration-fast ease-standard
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg
          disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0
          ${shapeClasses[shape]} ${variantClasses[shape][variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
