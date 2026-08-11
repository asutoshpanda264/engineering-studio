"use client";

import { motion } from "framer-motion";

export type ConceptObjectKind =
  | "user"
  | "server"
  | "api"
  | "database"
  | "cache"
  | "queue"
  | "load_balancer"
  | "cdn";

export type ConceptObjectStatus = "normal" | "healthy" | "overloaded";

export interface ConceptObjectProps {
  kind: ConceptObjectKind;
  label?: string;
  status?: ConceptObjectStatus;
  size?: number;
  className?: string;
}

const INK = "var(--quest-ink)";

/** One icon per kind, drawn on a shared 40×40 grid — simple stroke/fill
    shapes so a future illustrated pass can replace any one of these
    without touching `ConceptObject`'s own logic (same skin-boundary
    idea as the mascot, one level down). */
function Icon({ kind, status }: { kind: ConceptObjectKind; status: ConceptObjectStatus }) {
  switch (kind) {
    case "user":
      return (
        <>
          <circle cx={20} cy={13} r={6} fill={INK} />
          <path d="M8 33 Q20 20 32 33 Z" fill={INK} />
        </>
      );
    case "database":
      return (
        <>
          <path d="M10 14 V21 A10 4 0 0 0 30 21 V14" fill="none" stroke={INK} strokeWidth={2.5} />
          <ellipse cx={20} cy={14} rx={10} ry={4} fill="none" stroke={INK} strokeWidth={2.5} />
          <path d="M10 21 A10 4 0 0 0 30 21" fill="none" stroke={INK} strokeWidth={2} />
        </>
      );
    case "cache":
      return (
        <>
          <rect x={9} y={9} width={22} height={22} rx={4} fill="none" stroke={INK} strokeWidth={2.5} />
          <path d="M22 11 L14 23 H20 L18 31 28 18 H22 Z" fill={INK} />
        </>
      );
    case "queue":
      return (
        <>
          {[9, 17, 25].map((x) => (
            <rect key={x} x={x} y={14} width={6} height={12} rx={1.5} fill="none" stroke={INK} strokeWidth={2} />
          ))}
        </>
      );
    case "load_balancer":
      return (
        <>
          <circle cx={20} cy={13} r={4} fill="none" stroke={INK} strokeWidth={2.5} />
          <path
            d="M20 17 V23 M20 23 L10 30 M20 23 L20 30 M20 23 L30 30"
            stroke={INK}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "cdn":
      return (
        <>
          <circle cx={20} cy={20} r={11} fill="none" stroke={INK} strokeWidth={2.5} />
          <ellipse cx={20} cy={20} rx={5} ry={11} fill="none" stroke={INK} strokeWidth={2} />
          <line x1={9} y1={20} x2={31} y2={20} stroke={INK} strokeWidth={2} />
        </>
      );
    case "api":
      return (
        <>
          <rect x={9} y={9} width={22} height={22} rx={4} fill="none" stroke={INK} strokeWidth={2.5} />
          <path
            d="M16 14 L12 20 L16 26 M24 14 L28 20 L24 26"
            stroke={INK}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "server":
    default:
      return (
        <>
          <rect x={10} y={8} width={20} height={24} rx={3} fill="none" stroke={INK} strokeWidth={2.5} />
          <line x1={14} y1={14} x2={26} y2={14} stroke={INK} strokeWidth={2} />
          <line x1={14} y1={19} x2={26} y2={19} stroke={INK} strokeWidth={2} />
          <circle
            cx={25}
            cy={26}
            r={2}
            fill={status === "overloaded" ? "var(--quest-coral-deep)" : "var(--quest-green-deep)"}
          />
        </>
      );
  }
}

function containerFill(kind: ConceptObjectKind, status: ConceptObjectStatus): string {
  if (kind === "user") return "var(--quest-blue)";
  if (status === "overloaded") return "var(--quest-coral)";
  if (status === "healthy") return "var(--quest-green)";
  return "var(--quest-cream)";
}

/**
 * One system-design primitive — the vocabulary `SystemDiagram` composes
 * scenes from. `status` is the only thing that moves: an `overloaded`
 * object (never a `user`, they don't get overloaded) wobbles slightly,
 * everything else is still — motion here means "struggling," not
 * decoration.
 */
export function ConceptObject({ kind, label, status = "normal", size = 56, className = "" }: ConceptObjectProps) {
  const overloaded = status === "overloaded" && kind !== "user";

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <motion.div
        role="img"
        aria-label={label ?? kind.replace("_", " ")}
        animate={overloaded ? { rotate: [0, -3, 3, 0] } : { rotate: 0 }}
        transition={overloaded ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : undefined}
        className="flex items-center justify-center rounded-[var(--quest-radius-md)] border-[length:var(--quest-border-width)] border-[var(--quest-ink)]"
        style={{ width: size, height: size, background: containerFill(kind, status) }}
      >
        <svg viewBox="0 0 40 40" width={size * 0.7} height={size * 0.7} aria-hidden>
          <Icon kind={kind} status={status} />
        </svg>
      </motion.div>
      {label && (
        <span
          data-quest-display
          className="max-w-[6rem] text-center text-xs font-semibold text-[var(--quest-ink-on-dark)]"
        >
          {label}
        </span>
      )}
    </div>
  );
}
