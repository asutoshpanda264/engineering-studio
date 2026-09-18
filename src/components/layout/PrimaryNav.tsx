"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ListChecks, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
 * A CONTRIBUTOR/ADMIN-only "Contribute"/"Admin" tab belongs here once
 * those routes exist (Phase B of the same plan) — deliberately not
 * stubbed in yet, since a nav tab pointing at a route that 404s is worse
 * than no tab.
 */
export function PrimaryNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex shrink-0 items-center gap-5">
      {SECTIONS.map((section) => {
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
