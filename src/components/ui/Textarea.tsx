import { forwardRef, useId } from "react";
import type { ReactNode, TextareaHTMLAttributes } from "react";

type TextareaVariant = "default" | "modern";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
  variant?: TextareaVariant;
}

/** Multiline sibling of `Input` — same label/error/id shape and the same
 *  opt-in "modern" glass treatment (see Input.tsx), used by ReportBugButton. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, variant = "default", className = "", rows = 5, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const isModern = variant === "modern";

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={
              isModern
                ? "text-[13px] font-medium text-text/90"
                : "text-xs font-medium uppercase tracking-wide text-text-muted"
            }
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={
            isModern
              ? `w-full rounded-xl border bg-bg-elevated/60 px-4 py-3 text-[15px] text-text
                placeholder:text-text-subtle
                backdrop-blur-sm
                transition-all duration-fast ease-standard
                focus-visible:outline-none focus-visible:border-signal focus-visible:ring-4 focus-visible:ring-signal/15
                disabled:opacity-50 disabled:pointer-events-none
                ${error ? "border-status-critical/60" : "border-border hover:border-border-hover"}
                ${className}`
              : `border bg-bg-elevated px-3 py-2 text-sm text-text
                placeholder:text-text-subtle
                transition-colors duration-fast ease-standard
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg
                disabled:opacity-50 disabled:pointer-events-none
                ${error ? "border-status-critical" : "border-border hover:border-border-hover"}
                ${className}`
          }
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
);

Textarea.displayName = "Textarea";
