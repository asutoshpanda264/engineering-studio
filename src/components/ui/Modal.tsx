"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Extra header content (e.g. a badge) rendered before the close button. */
  action?: ReactNode;
  /** Overrides the dialog's `max-w-*` — defaults to `max-w-2xl` (dense text/stat content); wider content like an enlarged diagram wants more room. */
  maxWidthClassName?: string;
  /**
   * "default" (unchanged) is the flat, zero-radius instrument dialog used
   * by CompareModal/FigureFrame/LockInEntryPrompt. "modern" is the opt-in
   * glass-card treatment — rounded, gradient hairline border, richer
   * backdrop blur — currently only ReportBugButton's report card.
   */
  variant?: "default" | "modern";
  /** "modern" variant only — an icon rendered in a soft colored badge next to the title. */
  icon?: ReactNode;
}

/**
 * A centered, backdropped dialog for content too dense for an inline
 * sidebar box — first used by the "Try It" Remedies panel's Compare
 * output, which used to squeeze a full before/after breakdown into an
 * 11px-text box inside a 320px sidebar. Escape and a backdrop click both
 * close it; a click inside the dialog itself never does.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  action,
  maxWidthClassName = "max-w-2xl",
  variant = "default",
  icon,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isModern = variant === "modern";

  if (!isModern) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : undefined}
          onClick={(event) => event.stopPropagation()}
          className={`flex max-h-[85vh] w-full ${maxWidthClassName} flex-col overflow-hidden border border-border bg-bg-elevated shadow-elevated`}
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{title}</h2>
            <div className="flex shrink-0 items-center gap-2">
              {action}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 text-text-subtle transition-colors duration-fast ease-standard hover:bg-bg-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      {/* 1px gradient hairline border via padding trick — the same premium
          "glass card" edge the login/register cards use. */}
      <div
        className={`w-full ${maxWidthClassName} rounded-3xl bg-gradient-to-br from-signal/30 via-border to-transparent p-px shadow-2xl shadow-black/50`}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : undefined}
          className="flex max-h-[85vh] flex-col overflow-hidden rounded-[calc(1.5rem-1px)] bg-bg-elevated/95 backdrop-blur-xl"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-6 pt-6">
            <div className="flex min-w-0 items-center gap-3">
              {icon && (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-signal-soft text-signal">
                  {icon}
                </span>
              )}
              <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-text">{title}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {action}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-text-subtle transition-colors duration-fast ease-standard hover:bg-bg-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
