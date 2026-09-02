import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface CardProps {
  href: string;
  /** Rendered top-right, e.g. "01" — pass a pre-formatted string. */
  number?: string;
  icon?: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  /** Footer content before the reveal-on-hover arrow — e.g. an icon + "30 min". */
  meta: ReactNode;
  complete?: boolean;
  className?: string;
}

/**
 * The shared "reading room" grid card — replaces the identical
 * `border border-border bg-bg-panel` recipe that LLDList, AgenticList,
 * CaseStudiesList, and EntitiesList each duplicated verbatim (four
 * different content types rendering as the same bordered rectangle).
 * `/foundations` used to be the fifth (`FoundationsList`) but no longer
 * does — `FoundationsJourney` needs completion/track-position-driven
 * variants (a featured/full-width card, a status-tinted completed one)
 * this shared component doesn't support, so it renders its own card
 * locally rather than stretching `Card`'s props to cover a one-off shape.
 * Corner brackets instead of a boxed border — the treatment globals.css's
 * file-header comment already promised ("hairline rules and corner-bracket
 * markers replace shadowed rounded cards") but no component actually built
 * until this one. Hover lifts onto `bg-hover` (lighter than the resting
 * `bg-panel`) rather than the old `bg-elevated`, which was actually
 * *darker* than panel — see globals.css's `--color-bg-hover` comment.
 *
 * `.reading-room-card` (globals.css) layers a real border, a rounded
 * corner, and a resting/hover shadow on top of the corner brackets above,
 * under Paper only — the same fix `/foundations`'s own cards went through
 * first (flagged back there as "the boxes match the background," no edge
 * to separate a flat surface from the page it sits on). Dark/night-ops
 * keep the original square, borderless, corner-bracket-only surface
 * exactly as it was. A plain CSS class rather than a `theme === "light"`
 * JS check — `Card` renders inside `/learn`'s page.tsx, a Server
 * Component with no `useTheme()` of its own, and turning `Card` itself
 * into a Client Component to read theme here would force every value its
 * callers pass in (starting with `icon: LucideIcon`, a component
 * reference) across a Server→Client props boundary, which React rejects.
 */
export function Card({
  href,
  number,
  icon: Icon,
  title,
  description,
  meta,
  complete,
  className = "",
}: CardProps) {
  return (
    <Link
      href={href}
      className={`reading-room-card group relative flex h-full flex-col gap-3 p-5 transition-all duration-fast ease-standard hover:-translate-y-0.5 ${className}`}
    >
      <CardCorners />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="size-4 shrink-0 text-signal" aria-hidden />}
          <h3 className="font-medium text-text">{title}</h3>
        </div>
        {number !== undefined && (
          <span className="flex shrink-0 items-center gap-1.5 pt-0.5 font-mono text-[10px] text-text-subtle">
            {complete && <Check className="size-3 text-status-healthy" aria-hidden />}
            {number}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-text-muted">{description}</p>
      <div className="mt-auto flex items-center gap-1.5 pt-2 font-mono text-[11px] uppercase tracking-wide text-text-subtle">
        {meta}
        <ArrowRight
          className="ml-auto size-3.5 shrink-0 text-signal opacity-0 transition-all duration-fast ease-standard group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </Link>
  );
}

/** Four short corner marks — a viewfinder/instrument reticle instead of a
    boxed border. Dim border color at rest, brightens to the signal accent
    on hover so the whole card reads as "targeted" rather than just lit up.
    Exported so bespoke cards that can't route through `Card` itself (e.g.
    the landing page's scenario cards, which need Paper theme's rounded/
    shadowed layout) can still use the same mark instead of a plain border. */
export function CardCorners() {
  const base =
    "pointer-events-none absolute size-2 border-border transition-colors duration-fast ease-standard group-hover:border-signal/70";
  return (
    <>
      <span aria-hidden className={`${base} left-0 top-0 border-l border-t`} />
      <span aria-hidden className={`${base} right-0 top-0 border-r border-t`} />
      <span aria-hidden className={`${base} bottom-0 left-0 border-b border-l`} />
      <span aria-hidden className={`${base} bottom-0 right-0 border-b border-r`} />
    </>
  );
}
