"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ListChecks, PenLine, ShieldCheck, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/authStore";

interface NavSection {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Broader than an exact-path match — a section stays highlighted while
   *  browsing any route that conceptually belongs to it (e.g. `/lld` is
   *  still "Learning", `/leaderboard` is still "Problems"). */
  matches: (pathname: string) => boolean;
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const SECTIONS: NavSection[] = [
  {
    href: "/learn",
    label: "Learning",
    icon: BookOpen,
    matches: (p) =>
      startsWithAny(p, [
        "/learn",
        "/foundations",
        "/lld",
        "/case-studies",
        "/agentic",
        "/entities",
        "/tutorial",
        "/batman-mode",
      ]),
  },
  {
    href: "/problems",
    label: "Problems",
    icon: ListChecks,
    matches: (p) =>
      startsWithAny(p, ["/problems", "/interview-questions", "/leaderboard", "/daily-challenge", "/progress"]),
  },
  {
    href: "/workshop",
    label: "Workshop",
    icon: Wrench,
    matches: (p) => startsWithAny(p, ["/workshop"]),
  },
];

/**
 * The one shared top-level section switcher — Learning / Problems /
 * Workshop — so the whole site is organized into exactly three places to
 * be, reachable identically from every page (see the Sept 18 nav plan,
 * item 1). Dropped into `AppHeader` by default; `WorkshopHeader` (which
 * isn't built on `AppHeader` — it's a canvas toolbar, not a "back link +
 * nav" header) renders it separately for the same reason.
 *
 * A CONTRIBUTOR account sees an extra "Contribute" tab, an ADMIN account
 * sees "Admin" instead (Phase B) — never both, and never rendered before
 * `useAuth()`'s bootstrap settles (`status === "ready"`), same "don't
 * flash the wrong state" rule `AuthStatus` follows, so a guest or a
 * plain USER never sees a tab flicker in only to disappear.
 */
export function PrimaryNav() {
  const pathname = usePathname() ?? "";
  const { user, status } = useAuth();

  const roleSection: NavSection | null =
    status !== "ready" || !user
      ? null
      : user.role === "CONTRIBUTOR"
        ? { href: "/contribute", label: "Contribute", icon: PenLine, matches: (p) => startsWithAny(p, ["/contribute"]) }
        : user.role === "ADMIN"
          ? { href: "/admin", label: "Admin", icon: ShieldCheck, matches: (p) => startsWithAny(p, ["/admin"]) }
          : null;

  const sections = roleSection ? [...SECTIONS, roleSection] : SECTIONS;

  return (
    <nav className="flex shrink-0 items-center gap-5">
      {sections.map((section) => {
        const active = section.matches(pathname);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide transition-colors duration-fast ease-standard ${
              active ? "text-signal" : "text-text-muted hover:text-signal"
            }`}
          >
            <section.icon className="size-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{section.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
