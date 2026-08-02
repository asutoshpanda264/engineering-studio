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
}

function PanelHeader({
  title,
  action,
  className = "",
  ...props
}: PanelHeaderProps) {
  return (
    <div
      className={`flex h-9 shrink-0 items-center justify-between border-b border-border px-3 ${className}`}
      {...props}
    >
      <h2 className="truncate text-xs font-medium text-text-muted">
        {title}
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
