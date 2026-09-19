import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * "default" (unchanged) is Trace's flat h-9/zero-radius field, used by
 * every existing call site. "modern" is the opt-in glass-card treatment
 * for the auth pages (login/register) — taller, rounded, an optional
 * leading icon, and (for `type="password"`) a built-in show/hide toggle.
 */
type InputVariant = "default" | "modern";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  variant?: InputVariant;
  /** "modern" variant only — a leading icon (e.g. Mail, Lock) inset into the field. */
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, variant = "default", icon, className = "", type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [revealed, setRevealed] = useState(false);
    const isModern = variant === "modern";
    const isPassword = type === "password";
    const resolvedType = isModern && isPassword ? (revealed ? "text" : "password") : type;

    if (!isModern) {
      return (
        <div className="flex flex-col gap-1.5">
          {label && (
            <label
              htmlFor={inputId}
              className="text-xs font-medium uppercase tracking-wide text-text-muted"
            >
              {label}
            </label>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`h-9 border bg-bg-elevated px-3 text-sm text-text
              placeholder:text-text-subtle
              transition-colors duration-fast ease-standard
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg
              disabled:opacity-50 disabled:pointer-events-none
              ${error ? "border-status-critical" : "border-border hover:border-border-hover"}
              ${className}`}
            {...props}
          />
          {error && (
            <p id={`${inputId}-error`} className="text-xs text-status-critical">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-text/90">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-11 items-center justify-center text-text-subtle">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`h-12 w-full rounded-xl border bg-bg-elevated/60 text-[15px] text-text
              placeholder:text-text-subtle
              backdrop-blur-sm
              transition-all duration-fast ease-standard
              focus-visible:outline-none focus-visible:border-signal focus-visible:ring-4 focus-visible:ring-signal/15
              disabled:opacity-50 disabled:pointer-events-none
              ${icon ? "pl-11" : "pl-4"}
              ${isPassword ? "pr-11" : "pr-4"}
              ${error ? "border-status-critical/60" : "border-border hover:border-border-hover"}
              ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              tabIndex={-1}
              aria-label={revealed ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 z-10 flex w-11 items-center justify-center text-text-subtle transition-colors duration-fast ease-standard hover:text-text"
            >
              {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-status-critical">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
