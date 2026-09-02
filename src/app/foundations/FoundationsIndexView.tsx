"use client";

import { useState } from "react";
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
 * The default-theme branch further splits in two via `view`: `Journey`
 * (the tracked list above) or `Atlas` (`FoundationsAtlas` — an immersive,
 * environment-and-visual-metaphor take on the same lessons/progress data,
 * see that file's own doc comment). Plain `useState`, not persisted —
 * this is a side-by-side compare toggle for evaluating the new layout,
 * not a real user preference worth a `localStorage` key yet. Not offered
 * in `night-ops`: that theme already has its own immersive shape
 * (`FoundationsMap`) and doesn't need a second one.
 */
export function FoundationsIndexView({ lessons }: { lessons: FoundationLesson[] }) {
  const { theme } = useTheme();
  const [view, setView] = useState<"journey" | "atlas">("atlas");

  const header = (
    <AppHeader
      back={{ href: "/learn", label: "Learn" }}
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
    // one viewport's worth). `bg-reading-room` (a plain CSS class, not a JS
    // check — see globals.css) is a few points darker than plain `bg-bg`
    // under Paper only, same fix every other reading-room index now shares
    // — flagged back as "piercing" white here first, once cards started
    // needing a real edge to read against. `AtlasBackdrop` (Atlas's fixed
    // glow-blob atmosphere) and the grid/mesh below are all transparent
    // layers painted *on top* of this same fill, not opaque copies of it —
    // this is the one real base color underneath every view.
    <main
      className={`relative isolate flex min-h-screen flex-col bg-reading-room ${view === "journey" ? "bg-blueprint-grid" : ""}`}
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
              blob. Bounding it to one `h-screen` square pinned to the top
              instead keeps it exactly the size it was always drawn at —
              it now scrolls up and out of view with the hero above it,
              rather than either staying frozen (the original complaint) or
              being distorted (what naively reusing the grid's `inset-0`
              approach here would have done). */}
          {theme !== "light" && (
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-screen overflow-hidden opacity-[0.35]">
              <SystemMeshBackground />
            </div>
          )}
        </>
      )}
      {header}
      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 pb-10 pt-16 text-center sm:pt-20">
        <Badge variant="primary">Phase 1 — Foundations</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          The theory underneath the Workshop
        </h1>
        <p className="max-w-xl text-balance text-text-muted">
          The internet, DNS, HTTP, databases, caching, queues — the vocabulary the
          Workshop and entity reference assume you already have. Read in any order;
          nothing here is locked.
        </p>
        <ViewToggle view={view} onChange={setView} />
      </section>
      {view === "atlas" ? <FoundationsAtlas lessons={lessons} /> : <FoundationsJourney lessons={lessons} />}
    </main>
  );
}

/**
 * The Journey/Atlas compare switch — a small segmented control in the
 * same hairline-bordered, mono-uppercase idiom as `Badge`/`TorchToggle`,
 * not a pair of full buttons, since this is a one-off layout preference
 * sitting right below the page's own tagline rather than a primary
 * action.
 */
function ViewToggle({
  view,
  onChange,
}: {
  view: "journey" | "atlas";
  onChange: (view: "journey" | "atlas") => void;
}) {
  return (
    <div role="tablist" aria-label="Foundations layout" className="mt-1 inline-flex border border-border bg-bg-panel p-0.5">
      {(["journey", "atlas"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={view === option}
          onClick={() => onChange(option)}
          className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
            view === option ? "bg-signal/10 text-signal" : "text-text-subtle hover:text-text-muted"
          }`}
        >
          {option === "journey" ? "Journey" : "Atlas"}
        </button>
      ))}
    </div>
  );
}
