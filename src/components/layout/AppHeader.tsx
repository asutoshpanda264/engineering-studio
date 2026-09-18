import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { PrimaryNav } from "@/components/layout/PrimaryNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuthStatus } from "@/components/auth/AuthStatus";

export interface AppHeaderProps {
  /**
   * The standard "back to X" link on the left. Omit only when passing a
   * custom `left` (the landing page's multi-link nav is the one place that
   * doesn't fit a single back link).
   */
  back?: { href: string; label: string };
  /** Overrides `back` entirely — for the one page that isn't a "back to X" shape. */
  left?: ReactNode;
  /**
   * Extra page-specific actions (a CTA button, an icon link) rendered in
   * the right-hand cluster, before `ThemeToggle`/`AuthStatus`. Most pages
   * no longer need this — site-wide nav links (Leaderboard, Interviews,
   * Learn, ...) belong in `PrimaryNav` now, not here.
   */
  right?: ReactNode;
  /**
   * Escape hatch: replaces `back`/`left`/`right` entirely and owns the full
   * row (still inside the shared `h-14`/max-width/`justify-between` shell).
   * Only for a page whose left+right slots must swap together as one unit
   * — e.g. `[slug]/page.tsx`'s `LockInHeaderNav`, which replaces both the
   * back-link and the actions with "Locked" indicators during a Timed
   * Challenge run, not just one side of it.
   */
  children?: ReactNode;
  /**
   * Tailwind max-width class for the inner row. Match whatever content
   * column sits directly below this header — an index/grid page, a
   * two-column article with a sidebar, and a single narrow item page are
   * legitimately different widths. What must NOT drift is everything else
   * (height, border, blur, back-link treatment), which is what actually
   * caused the visible cross-page jump this component replaces.
   */
  maxWidthClassName?: string;
  /** False for a header that scrolls away with the page instead of pinning. Default true. */
  sticky?: boolean;
  /**
   * Extra classes appended to the header's own `border-b bg-bg/90
   * backdrop-blur` shell — an escape hatch for `/learn`/`/foundations`
   * to swap in `!bg-workspace-bg/90` so the header's background matches
   * their light-only workspace ground instead of the plain global one
   * (a visible seam otherwise: the header stayed the old warm off-white
   * while the page below it became the new cool blue-gray). `!important`
   * needed since both are `bg-*` utilities targeting the same property —
   * plain class order in source doesn't reliably win once Tailwind
   * dedupes across the whole app's compiled CSS. Every other caller
   * omits this and gets the exact shell it always has.
   */
  className?: string;
}

/**
 * The one shared header shell for every content page (`/learn`,
 * `/entities`, `/foundations`, `/agentic`, `/case-studies`, `/lld` and their
 * `[slug]` pages, `/problems` and its solution page, `/interview-questions`
 * and its detail page, and the landing page) — previously 16 hand-rolled
 * copies of the same `sticky border-b backdrop-blur` bar, which had quietly
 * drifted apart: some weren't `sticky` at all, `z-10` vs `z-20`, and
 * `max-w-5xl` vs `max-w-6xl` between /learn and /entities specifically (a
 * ~130px jump in the back-link's position navigating between two pages
 * that are otherwise the same page *shape*). One implementation now owns
 * that shell; only the parts that legitimately vary (the back-link
 * destination/label, the right-side actions, and the content max-width)
 * are still per-page.
 *
 * `WorkshopHeader.tsx`, `EditorShell.tsx`'s header, and
 * `FailureDemoHeader.tsx` are deliberately NOT folded into this — those are
 * canvas toolbars (title, badges, Run/Reset/Export/Clear actions,
 * non-sticky, `bg-bg-elevated`), a different shape entirely, not a
 * "back link + nav" header.
 *
 * Renders `PrimaryNav` (the site-wide Learning/Problems/Workshop switch)
 * next to `left`/`back`, and always ends the row with `ThemeToggle` then
 * `AuthStatus` at the true right edge, past everything else including any
 * per-page `right` content — see the Sept 18 nav plan, items 1-4. Every
 * caller used to build its own copy of both; centralizing them here is
 * what makes "the toggle is always at the extreme right, everywhere"
 * actually true instead of independently re-decided per page.
 */
export function AppHeader({
  back,
  left,
  right,
  children,
  maxWidthClassName = "max-w-6xl",
  sticky = true,
  className = "",
}: AppHeaderProps) {
  return (
    <header
      className={`${sticky ? "sticky top-0" : ""} z-10 border-b border-border bg-bg/90 backdrop-blur ${className}`}
    >
      <div className={`mx-auto flex h-14 ${maxWidthClassName} items-center justify-between gap-4 px-6`}>
        {children ?? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-5">
              {left ?? (
                back && (
                  <Link
                    href={back.href}
                    className="flex min-w-0 items-center gap-2 font-mono text-xs uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
                  >
                    <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{back.label}</span>
                  </Link>
                )
              )}
              <PrimaryNav />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {right}
              <ThemeToggle />
              <AuthStatus />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
