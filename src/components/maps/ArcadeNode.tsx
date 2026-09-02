import Link from "next/link";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NODE_WIDTH = 168;

/**
 * A generic map-card node for `EntitiesMap`/`LLDMap`/`AgenticMap` —
 * `/foundations`' own `MapNode` stays separate (it has the entity-icon
 * lookup, start/capstone emphasis tag, and completing-wipe animation,
 * plus the (currently disabled) locked-button branch — tightly coupled
 * enough to Foundations' own data that forcing it through this shared
 * component would mean threading a pile of foundations-only optional
 * props through here for no payoff). This one only knows two looks —
 * open (`signal` accent) and `completed` (`healthy` accent, a small
 * check) — there's no locked state on any of these three maps.
 */
export function ArcadeNode({
  href,
  x,
  y,
  title,
  subtitle,
  icon: Icon,
  numberLabel,
  footer,
  completed,
  cave,
}: {
  href: string;
  x: number;
  y: number;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  numberLabel?: string;
  footer?: string;
  completed?: boolean;
  cave?: boolean;
}) {
  const style = {
    left: `${x}%`,
    top: `${y}%`,
    width: NODE_WIDTH,
    transform: "translate(-50%, -50%)",
  };

  const toneClasses = completed
    ? `border-status-healthy/50 bg-bg-panel${cave ? " shadow-[0_0_16px_2px_var(--color-status-healthy)]" : ""}`
    : `border-signal/70 bg-bg-panel hover:-translate-y-1 hover:border-signal hover:bg-bg-elevated hover:shadow-dropdown${
        cave ? " shadow-[0_0_14px_2px_var(--color-signal)]" : ""
      }`;

  return (
    <Link
      href={href}
      className={`absolute z-10 flex flex-col border transition-all duration-fast ease-standard ${toneClasses}`}
      style={style}
    >
      <div className={`h-[3px] w-full shrink-0 ${completed ? "bg-status-healthy" : "bg-signal"}`} aria-hidden />
      <div className="flex items-start gap-2 px-2.5 pt-2 pb-1.5">
        <span
          className={`flex size-6 shrink-0 items-center justify-center border ${
            completed ? "border-status-healthy/40 bg-bg-elevated" : "border-signal/40 bg-bg-elevated"
          }`}
          aria-hidden
        >
          {Icon ? (
            <Icon className={`size-3.5 ${completed ? "text-status-healthy" : "text-signal"}`} />
          ) : (
            <span className="font-mono text-[9px] text-text-subtle">{numberLabel}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            {Icon && numberLabel && <span className="font-mono text-[9px] text-text-subtle">{numberLabel}</span>}
            {completed && (
              <Check className="ml-auto size-3 text-status-healthy" aria-hidden />
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-text">{title}</p>
        </div>
      </div>
      {(subtitle || footer) && (
        <p className="mt-auto flex items-center gap-1 border-t border-border/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide text-text-subtle">
          <span className="line-clamp-1">{footer ?? subtitle}</span>
        </p>
      )}
    </Link>
  );
}
