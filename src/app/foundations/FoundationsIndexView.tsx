"use client";

import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { AppHeader } from "@/components/layout/AppHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { FoundationLesson } from "@/content/foundations/types";
import { FoundationsMap } from "@/components/foundations/FoundationsMap";
import { FoundationsJourney } from "@/components/foundations/FoundationsJourney";
import { FoundationsAtlas } from "@/components/foundations/FoundationsAtlas";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";

/**
 * `/foundations`' body — a client component (needs `useTheme()`) so the
 * page can render two genuinely different shapes depending on theme:
 *
 * - `night-ops` (Batman Mode): the arcade `FoundationsMap` — a pannable/
 *   zoomable "game world map" canvas, full-bleed below the header
 *   (`h-screen`/`overflow-hidden` on `<main>`).
 * - Everything else (the default `dark` theme): `FoundationsJourney` — a
 *   tracked, sequenced index (readout strip, a Continue/Start Here focal
 *   point, five named tracks), deliberately *not* the same flat-grid shape
 *   the other reading rooms use — see that file's own doc comment for why
 *   this page in particular needed to diverge — in a normally-scrolling
 *   `<main>`.
 *
 * The `<main>` wrapper itself has to live in here, not in the server
 * `page.tsx` above it, because its sizing (`h-screen` + `overflow-hidden`
 * for the map vs. plain `min-h-screen` for the list) genuinely differs
 * per branch — the map needs a bounded-height ancestor to pan/zoom inside
 * of, the list needs to scroll the page normally. `page.tsx` stays a
 * server component purely for its `metadata` export.
 *
 * First client render always matches the SSR default (`"dark"`, per
 * `ThemeProvider.getServerSnapshot`) — a `night-ops` visitor's very first
 * paint is briefly the list before `useSyncExternalStore` corrects it to
 * the map, same hydration shape every other theme-dependent bit of this
 * app already accepts.
 *
 * The non-night-ops branch further splits in two via `view`: `Journey`
 * (the tracked list above) or `Atlas` (`FoundationsAtlas` — an immersive,
 * environment-and-visual-metaphor take on the same lessons/progress data,
 * see that file's own doc comment). Tied directly to theme, not a manual
 * choice — Paper gets Journey, dark gets Atlas — per explicit feedback
 * once both had been live side-by-side long enough to pick a winner per
 * theme: Atlas's environment (the fixed copper/status-healthy `AtlasBackdrop`
 * glow, `TrackBadge`'s icon-glow chip, `AtlasZone`'s blurred corner blobs)
 * is tuned for dark's near-black ground and was the one actually kept
 * there; Journey's flatter, bordered-panel treatment (now with a real
 * elevation shadow — see that file's own `TrackSection` comment) reads
 * better against Paper's near-white ground. A manual `ViewToggle` used to
 * sit here for comparing the two live; removed along with this, since the
 * decision is no longer a per-visitor choice. Not offered in `night-ops`:
 * that theme already has its own immersive shape (`FoundationsMap`) and
 * doesn't need either.
 */
export function FoundationsIndexView({ lessons }: { lessons: FoundationLesson[] }) {
  const { theme } = useTheme();
  const view = theme === "light" ? "journey" : "atlas";

  const header = (
    <AppHeader
      back={{ href: "/learn", label: "Learn" }}
      className="!bg-workspace-bg/90"
      right={
        <>
          <ThemeToggle />
          <LinkButton href="/workshop" variant="secondary" size="sm" className="bg-bg-elevated">
            Enter Workshop
          </LinkButton>
        </>
      }
    />
  );

  if (theme === "night-ops") {
    return (
      <main className="flex h-screen flex-col overflow-hidden bg-bg">
        {header}
        <div className="relative min-h-0 flex-1">
          <FoundationsMap
            lessons={lessons}
            headerSlot={
              <>
                <Badge variant="primary">Phase 1 — Foundations</Badge>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text">
                  The theory underneath the Workshop
                </h1>
                <p className="mt-2 text-sm text-balance text-text-muted">
                  Scroll the map to see how each concept builds on the last.
                </p>
              </>
            }
          />
        </div>
      </main>
    );
  }

  return (
    // `isolate` — load-bearing, not tidiness: without it, `main` (plain
    // `position: static`) doesn't form its own stacking context, so
    // `FoundationsAtlas`'s fixed `-z-10` backdrop (and the `-z-20` grid/mesh
    // below) escape to the *page's* root context and sink below `main`'s
    // own opaque background fill instead of just below the cards —
    // invisible, not "very subtle." `isolate` traps them inside `main`,
    // where negative z-index correctly means "behind this element's own
    // content, in front of its own background." `relative` is the other
    // half of that: the grid/mesh below are `absolute`, so they need `main`
    // as their positioned containing block to size themselves against
    // (`inset-0` resolves to `main`'s own content-driven height, not just
    // one viewport's worth). Atlas (dark) keeps `bg-reading-room` (a plain
    // CSS class, not a JS check — see globals.css), a few points darker
    // than plain `bg-bg`, the same fix every other reading-room index
    // shares — flagged back as "piercing" white once cards started needing
    // a real edge to read against. `AtlasBackdrop` and the grid/mesh below
    // are transparent layers painted *on top* of that fill. Journey (the
    // one branch that actually renders in light theme) instead gets
    // `bg-workspace-bg` — the new light-only `#F4F7FC` workspace ground
    // (see globals.css's `--color-workspace-*`; resolves back to plain
    // `--color-bg` outside light theme, so this is a no-op there) — and no
    // `bg-blueprint-grid` texture: the workspace redesign wants a quiet,
    // uncluttered page ground behind its white cards, not a graph-paper
    // texture competing with them.
    <main
      className={`relative isolate flex min-h-screen flex-col ${view === "journey" ? "bg-workspace-bg" : "bg-reading-room"}`}
    >
      {/* Atlas's structural background — the `bg-blueprint-grid` dot texture
          plus (dark only) `SystemMeshBackground`'s node/edge graph,
          including its one copper-colored "highlighted path" line — as an
          `absolute` layer sized to `main` (needs the `relative` above to
          anchor to) rather than the `fixed`-position one `AtlasBackdrop`
          used to draw both of these on. A fixed layer stays pinned to the
          viewport as the page scrolls, so every zone scrolled past the
          exact same frozen grid and graph — flagged back by name twice
          ("doesn't look compatible with the cards," then the copper line
          specifically as "still staying in the same place") before this
          fix. This one scrolls normally with the page instead, same as
          Journey's own `bg-blueprint-grid` above (that one was already a
          plain scrolling background, never fixed — only Atlas's copy
          needed this). `-z-20`, one behind `AtlasBackdrop`'s own `-z-10`
          atmosphere (the two blurred glow blobs + fade gradient), which
          stays fixed on purpose — see that component's own doc comment for
          why the blobs specifically should *not* follow this fix. */}
      {view === "atlas" && (
        <>
          <div
            aria-hidden
            className={`bg-blueprint-grid pointer-events-none absolute inset-0 -z-20 ${theme === "light" ? "opacity-60" : "opacity-70"}`}
          />
          {/* The mesh graph is a one-off illustration (a fixed 1600×900
              `viewBox`, `preserveAspectRatio="slice"`), not a repeating
              tile like the grid above it — stretching it across `main`'s
              *entire* multi-zone scroll height (thousands of px) would
              force it to scale up until it covers that whole height,
              zooming the graph in until it's an illegible, mostly-empty
              blob. `h-screen` keeps it exactly the size it was always
              drawn at without that distortion. `fixed`, not `absolute` —
              direct feedback on `/learn`'s identical layer asked for the
              opposite of this component's own original behavior ("it now
              scrolls up and out of view with the hero above it"): the
              graph (and its traveling packet, see `SystemMeshBackground`'s
              own doc comment) should stay pinned to the viewport as the
              page scrolls, not scroll away with it. `main`'s `isolate`
              above is what makes a `fixed -z-20` child here safe — see
              this file's other `isolate` comment for the fuller reasoning
              that mirrors. */}
          {theme !== "light" && (
            <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-20 h-screen overflow-hidden opacity-[0.35]">
              <SystemMeshBackground />
            </div>
          )}
        </>
      )}
      {header}
      {/* `workspace-*` text/badge colors — a no-op outside light theme
          (they resolve back to the plain `--color-text`/`--color-signal`
          tokens there), the new palette under it. */}
      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-10 pt-16 text-center sm:pt-20">
        <Badge variant="primary" className="!border-workspace-accent/50 !bg-workspace-accent/10 !text-workspace-accent">
          Phase 1 — Foundations
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-workspace-text sm:text-4xl">
          The theory underneath the Workshop
        </h1>
        <p className="max-w-xl text-balance text-workspace-text-muted">
          The internet, DNS, HTTP, databases, caching, queues — the vocabulary the
          Workshop and entity reference assume you already have. Read in any order;
          nothing here is locked.
        </p>
      </section>
      {view === "atlas" ? <FoundationsAtlas lessons={lessons} /> : <FoundationsJourney lessons={lessons} />}
    </main>
  );
}
