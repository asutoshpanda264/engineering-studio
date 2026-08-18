import type { HTMLAttributes, ReactNode } from "react";

type PanelVariant = "default" | "elevated";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
}

const variantClasses: Record<PanelVariant, string> = {
  default: "bg-bg-panel border border-border",
  elevated: "bg-bg-elevated border border-border shadow-elevated",
};

function PanelRoot({
  variant = "default",
  className = "",
  children,
  ...props
}: PanelProps) {
  return (
    <div
      className={`rounded-lg ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PanelHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  action?: ReactNode;
  /** "Polish" Workshop-style craft pass (see WorkshopStyleProvider): a
   *  signal-colored leading tick + tinted bottom rule instead of the plain
   *  hairline, so a panel header reads as instrumented rather than just
   *  labeled. Off by default — every existing call site is unaffected. */
  accent?: boolean;
}

function PanelHeader({
  title,
  action,
  accent = false,
  className = "",
  ...props
}: PanelHeaderProps) {
  return (
    <div
      className={`flex h-9 shrink-0 items-center justify-between border-b px-3 ${accent ? "border-signal/40" : "border-border"} ${className}`}
      {...props}
    >
      <h2 className="flex min-w-0 items-center gap-1.5 truncate text-xs font-medium uppercase tracking-wide text-text-muted">
        {accent && <span className="size-1.5 shrink-0 bg-signal" aria-hidden />}
        <span className="truncate">{title}</span>
      </h2>
      {action}
    </div>
  );
}

function PanelBody({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`min-h-0 flex-1 overflow-auto p-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export const Panel = Object.assign(PanelRoot, {
  Header: PanelHeader,
  Body: PanelBody,
});
