import Link from "next/link";
import type { ReactNode } from "react";
import type { ComponentProps } from "react";

type LinkButtonVariant = "primary" | "secondary";
type LinkButtonSize = "sm" | "md";

export interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  icon?: ReactNode;
  children: ReactNode;
}

// The one primary-action treatment in the product: a flat signal-colored
// block, mono uppercase label, zero radius — no exceptions, no per-page
// hand-rolled class strings. `Button` (ui/Button.tsx) is this same
// vocabulary for actual <button>s; this is the <Link> half of it, since a
// navigational CTA is never semantically a button. Every page used to
// carry its own copy of these classes (landing's LINK_BUTTON_*, the
// entity deep-dive's PRIMARY_LINK, a bare bg-signal/text-white div on
// Foundations) — that drift is exactly how a "text-white" that breaks
// light-theme contrast, or a CTA that's suddenly not mono/uppercase like
// every other one, sneaks in unnoticed. One implementation now.
const BASE =
  "inline-flex items-center justify-center gap-2 font-mono font-semibold uppercase tracking-wide transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const VARIANT_CLASSES: Record<LinkButtonVariant, string> = {
  primary: "bg-signal text-bg hover:bg-signal-hover active:bg-signal-active",
  secondary: "border border-border text-text hover:border-signal hover:text-signal",
};

const SIZE_CLASSES: Record<LinkButtonSize, string> = {
  sm: "h-9 px-4 text-xs gap-1.5",
  md: "h-11 px-6 text-xs",
};

export function LinkButton({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}
