"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { FoundationLesson } from "@/content/foundations/types";
import { getMapNodePosition } from "@/content/foundations/mapLayout";
import { FOUNDATIONS_MAP_REGIONS } from "@/content/foundations/mapRegions";
import {
  getCompletedFoundationSlugs,
  getLastSeenFoundationSlugs,
  getLessonStatus,
  markFoundationsMapSeen,
  useFoundationsProgress,
} from "@/lib/foundationsProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { MapNode } from "./MapNode";
import { MapEdges, type MapEdge } from "@/components/maps/MapEdges";
import { MapRegions } from "@/components/maps/MapRegions";
import { MapLegend } from "@/components/maps/MapLegend";
import { PannableMapCanvas } from "@/components/maps/PannableMapCanvas";
import { useTorchMode } from "@/lib/torchMode";
import { TorchToggle } from "./TorchToggle";
import { TorchCursor } from "./TorchCursor";
import { CaveShroud } from "./CaveShroud";

// On-screen radius of the torch's reveal circle, in real screen pixels —
// converted to the shroud's own (unscaled, pre-`transform: scale(zoom)`)
// coordinate space per-frame in the pointer-move handler below, so the
// torch reads as a constant physical size regardless of how far the reader
// has zoomed the map in or out, the same way a real flashlight's beam
// doesn't change size when you walk closer to a wall.
const TORCH_SCREEN_RADIUS_PX = 130;

// Fixed pixel size for the inner canvas — percent-positioned children
// (`MapNode`, `MapEdges`) need a parent with a known size for their
// percentages to resolve against. Wide, not tall: the map reads
// left-to-right (root → capstone, one column per topological tier), with
// parallel branches spread vertically as lanes within a tier — a
// side-scroller, not the earlier bottom-to-top layout.
//
// `MAP_HEIGHT` went 900 → 1300 specifically to shrink `MapNode`'s ~84px
// card height as a *percentage* of the canvas (9.4% → 6.5%) — every
// node's position and `MapEdges`' curves are in that same percent space
// (`mapLayout.ts`), so a taller canvas is "more breathing room between
// lanes" without touching a single coordinate. Bumped as part of fixing
// edges that read as running *through* unrelated cards — see
// `mapLayout.ts`'s "Delivery & Speed" tier comments and `MapEdges.tsx`'s
// `EDGE_BOW` for the rest of that fix.
const MAP_WIDTH = 2800;
const MAP_HEIGHT = 1300;

/**
 * The `/foundations` index, reimagined as a scrollable forest instead of a
 * flat grid — connected by `MapEdges`, laid out via `mapLayout.ts`.
 * Progress is `localStorage`-backed (`useFoundationsProgress`), so this
 * renders identically on a fresh visit and picks back up wherever a
 * returning reader left off. Batman-Mode-only now (see
 * `FoundationsIndexView`, this component's caller) — the default theme
 * gets `FoundationsJourney` instead.
 *
 * Pan/zoom/vignette/zoom-controls/loading-state mechanics live in
 * `PannableMapCanvas` (extracted here so `EntitiesMap`/`LLDMap`/
 * `AgenticMap` don't each reimplement them) — this component only
 * supplies the domain-specific parts: which lessons to draw, where
 * (`getMapNodePosition`), their status/completion, and the reveal-
 * transition/cave-glow state that decorates them.
 *
 * `headerSlot` (the page's title/tagline) renders *inside* the scrolling
 * canvas near the root, at a fixed pixel spot clear of every node's
 * position — not pinned to the viewport, so it scrolls away like
 * everything else once the reader pans past it.
 */
export function FoundationsMap({ lessons, headerSlot }: { lessons: FoundationLesson[]; headerSlot?: ReactNode }) {
  const completedSlugs = useFoundationsProgress();
  const completed = useMemo(() => new Set(completedSlugs), [completedSlugs]);

  // The cave treatment — Batman Mode's cosmetic dark/glow look — is gated
  // on the theme, not a separate setting of its own: `data-theme="night-
  // ops"` already *is* Batman Mode (see ThemeProvider), so there's nothing
  // to toggle beyond the existing theme switch. Drives `MapNode`/`MapEdges`'
  // glow classes on every lit card, and also which nodes get routed through
  // `CaveShroud` below.
  const { theme } = useTheme();
  const cave = theme === "night-ops";

  // The torch itself: on/off (persisted, see `torchMode.ts`) plus the two
  // DOM handoffs that let the pointer-move effect further down update
  // `CaveShroud`'s mask position and `TorchCursor`'s screen position every
  // frame without going through React state/re-renders.
  const torchOn = useTorchMode();
  const shroudRef = useRef<HTMLDivElement>(null);
  const torchCursorRef = useRef<HTMLDivElement>(null);

  // `useFoundationsProgress()` must render its first client pass as empty
  // to match the server (no `localStorage` during SSR), so nodes/edges/the
  // legend would otherwise flash "0/24 complete" for real returning
  // readers before self-correcting a moment later — a `docs/CLAUDE.md` §7
  // "every screen needs a loading state" case, not a bug to shrug off.
  // Deferring their render until after mount means the *first* time they
  // ever paint, `completedSlugs` has already settled — no wrong-then-right
  // flash. On its own this only covers "mounted or not," though — see
  // `ready` further down, which also waits on `reveal`. `useSyncExternalStore`
  // again rather than a plain `useState`+`useEffect(() => setMounted(true), [])`:
  // the latter calls `setState` synchronously inside an effect body, which
  // `eslint-plugin-react-hooks` flags (cascading-render anti-pattern) —
  // this is the same "subscribe to an external fact" shape as every other
  // store in this file, just with a no-op subscription (mount state never
  // changes again) and server/client snapshots that differ on purpose.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // The reveal for *this* visit specifically — which lessons finished
  // since the reader last looked at the map (`justCompleted`, yellow→green)
  // — as opposed to "every currently-available node," which is what an
  // earlier pass animated on every single mount regardless of whether
  // anything had actually changed. `justUnlocked` (dark→yellow, for a
  // lesson newly gated open) does the same diff against `getLessonStatus`'s
  // `"locked"` result — finishing a lesson can open up whichever of its
  // dependents just had every prerequisite met, and this is what lets that
  // dependent's very first paint play the "just lit up" pop instead of
  // rendering as though it had always been available.
  //
  // Computed in an effect (not a lazy `useState` initializer) for the same
  // hydration reason `PannableMapCanvas`'s mount-centering effect reads
  // localStorage directly: effects never run during SSR, so by the time
  // this fires the real completed/seen sets are always there, no server/
  // client snapshot race. Starts `null` (nothing animates) until this
  // resolves, which in practice is within the same tick.
  // Also gates first paint, alongside `mounted` (see `ready` below) — this
  // used to only gate *which* nodes get the `completing`/`unlocking`
  // transition prop, not *when* nodes first appear at all. That let
  // `MapNode` mount once `mounted` flipped true but before this effect had
  // resolved, i.e. with `transition` still `undefined` — a just-completed
  // lesson's very first paint rendered fully green, no `completing` prop,
  // because at that instant `reveal` didn't know it was just-completed yet.
  // Gating the map's entire first paint on `reveal` means `MapNode` never
  // mounts until its `transition` prop is already correct.
  const [reveal, setReveal] = useState<{
    justCompleted: ReadonlySet<string>;
    justUnlocked: ReadonlySet<string>;
  } | null>(null);
  // Guards against React Strict Mode's double effect-invocation on mount
  // (on by default for the App Router since Next 13.5) — this effect both
  // *reads* the "seen" snapshot and *writes* it back in the same pass;
  // with no guard, Strict Mode's second invocation reads the value the
  // first one just wrote, computes an empty diff, and silently overwrites
  // the correct one via `setReveal` before anything ever paints.
  const hasComputedRevealRef = useRef(false);
  useEffect(() => {
    if (hasComputedRevealRef.current) return;
    hasComputedRevealRef.current = true;
    const current = getCompletedFoundationSlugs();
    const currentSet = new Set(current);
    const lastSeenSet = new Set(getLastSeenFoundationSlugs());
    const justCompleted = new Set(current.filter((slug) => !lastSeenSet.has(slug)));
    const justUnlocked = new Set(
      lessons
        .filter(
          (lesson) =>
            getLessonStatus(lesson, lastSeenSet) === "locked" &&
            getLessonStatus(lesson, currentSet) === "available"
        )
        .map((lesson) => lesson.slug)
    );
    setReveal({ justCompleted, justUnlocked });
    markFoundationsMapSeen(current);
  }, [lessons]);

  // Drives the torch: listens on `document` (not just the map's own
  // scroll container) so the beam still tracks smoothly across its very
  // edge, then writes straight onto `shroudRef`/`torchCursorRef` via
  // imperative style/property mutation rather than React state — the same
  // zero-re-render-per-frame discipline `CaveShroud`'s and `TorchCursor`'s
  // own doc comments call for. Only attached while there's actually
  // something to light (`cave && torchOn`); everything else leaves the
  // native cursor and the map exactly as they'd otherwise be.
  //
  // `CaveShroud` sits inside the canvas's own `transform: scale(zoom)`
  // ancestor, so its `getBoundingClientRect()` already reflects the
  // current pan/zoom — the ratio of that rect's live width to `MAP_WIDTH`
  // *is* the current zoom factor, without this component needing to reach
  // into `usePannableCanvas`'s private state at all. Dividing the pointer
  // position (and the fixed on-screen radius) by that ratio converts them
  // into the shroud's own unscaled coordinate space, which is what
  // `--torch-x`/`--torch-y`/`--torch-radius` are read in.
  useEffect(() => {
    if (!cave || !torchOn) return;
    const shroudEl = shroudRef.current;
    const cursorEl = torchCursorRef.current;
    if (!shroudEl || !cursorEl) return;

    function handlePointerMove(event: PointerEvent) {
      const rect = shroudEl!.getBoundingClientRect();
      const withinBounds =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      cursorEl!.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursorEl!.style.opacity = withinBounds ? "1" : "0";

      if (withinBounds && rect.width > 0) {
        const scale = rect.width / MAP_WIDTH;
        const localX = (event.clientX - rect.left) / scale;
        const localY = (event.clientY - rect.top) / scale;
        shroudEl!.style.setProperty("--torch-x", `${localX}px`);
        shroudEl!.style.setProperty("--torch-y", `${localY}px`);
        shroudEl!.style.setProperty("--torch-radius", `${TORCH_SCREEN_RADIUS_PX / scale}px`);
      } else {
        shroudEl!.style.setProperty("--torch-radius", "0px");
      }
    }

    document.addEventListener("pointermove", handlePointerMove);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      // Fail safe to "nothing lit" on cleanup (torch switched off, cave
      // exited, or the map unmounting) rather than leaving a stale glow
      // frozen at wherever the pointer last was.
      cursorEl.style.opacity = "0";
      shroudEl.style.setProperty("--torch-radius", "0px");
    };
  }, [cave, torchOn]);

  // The map's actual content — regions/edges/nodes/legend — waits on both
  // "hydrated" (`mounted`) and "know the real completing/unlocking diff"
  // (`reveal`, see its own comment above for why this second gate is load-
  // bearing, not just belt-and-suspenders).
  const ready = mounted && reveal !== null;

  // One edge per `prerequisites` entry — every one of them, including a
  // locked target's incoming trail. `litEdges`/`lockedEdges` then split the
  // same way `litLessons`/`lockedLessons` do below: a locked edge rides
  // inside the same `CaveShroud` as its locked node, so the torch reveals
  // (and hides) a bit of trail leading up to a card exactly in step with
  // the card itself — no separate "revealed" state to keep in sync, the
  // mask alone decides what's paintable, every frame, for free.
  const { litEdges, lockedEdges } = useMemo(() => {
    const lit: MapEdge[] = [];
    const locked: MapEdge[] = [];
    for (const lesson of lessons) {
      const to = getMapNodePosition(lesson.slug);
      if (!to) continue;
      const targetStatus = getLessonStatus(lesson, completed);
      const justUnlocked = reveal?.justUnlocked.has(lesson.slug) ?? false;
      for (const prereq of lesson.prerequisites ?? []) {
        const from = getMapNodePosition(prereq);
        if (!from) continue;
        (targetStatus === "locked" ? locked : lit).push({ from, to, targetStatus, justUnlocked });
      }
    }
    return { litEdges: lit, lockedEdges: locked };
  }, [lessons, completed, reveal]);

  // The map's one root (no prerequisites) and its one true sink (no other
  // lesson names it as a prerequisite) get a callout badge — computed from
  // the DAG itself, not a hardcoded slug, so editing `prerequisites` later
  // can't silently leave the wrong node tagged "Start"/"Final challenge."
  const { rootSlug, capstoneSlug } = useMemo(() => {
    const referenced = new Set(lessons.flatMap((lesson) => lesson.prerequisites ?? []));
    const root = lessons.find((lesson) => (lesson.prerequisites ?? []).length === 0);
    const capstone = lessons.find((lesson) => lesson.slug !== root?.slug && !referenced.has(lesson.slug));
    return { rootSlug: root?.slug, capstoneSlug: capstone?.slug };
  }, [lessons]);

  // Where `PannableMapCanvas` centers the viewport on mount and on every
  // "Reset view" click — the frontier of the forest (the earliest, in
  // course order, lesson that's `available` but not yet completed) rather
  // than the canvas's literal top-left corner. Deliberately reads
  // `getCompletedFoundationSlugs()` (a plain synchronous localStorage
  // read) instead of the `completed` derived from `useFoundationsProgress()`
  // above — see `PannableMapCanvas`'s `getInitialFocus` doc for why this
  // needs to sidestep the hydration-snapshot rule the same way.
  const getInitialFocus = useCallback(() => {
    const completedNow = new Set(getCompletedFoundationSlugs());
    const target = lessons.find((lesson) => getLessonStatus(lesson, completedNow) === "available") ?? lessons[0];
    return (target && getMapNodePosition(target.slug)) ?? null;
  }, [lessons]);

  // Splits `lessons` into "always lit" (available/completed — rendered as
  // direct siblings) versus "locked" (routed through `CaveShroud`, so
  // they're literal darkness until the torch sweeps over them) — but only
  // in cave mode. Outside it (defensively; `FoundationsMap` only ever
  // mounts in night-ops today, see `FoundationsIndexView`) there's no
  // shroud to route anything through, so every lesson renders flat and a
  // locked one just falls back to its own dimmed, un-shrouded look.
  const { litLessons, lockedLessons } = useMemo(() => {
    if (!cave) return { litLessons: lessons, lockedLessons: [] as FoundationLesson[] };
    const lit: FoundationLesson[] = [];
    const locked: FoundationLesson[] = [];
    for (const lesson of lessons) {
      (getLessonStatus(lesson, completed) === "locked" ? locked : lit).push(lesson);
    }
    return { litLessons: lit, lockedLessons: locked };
  }, [lessons, completed, cave]);

  // Shared so there's exactly one place that turns a `FoundationLesson`
  // into a `MapNode`.
  function renderNode(lesson: FoundationLesson) {
    const position = getMapNodePosition(lesson.slug);
    if (!position) return null;
    return (
      <MapNode
        key={lesson.slug}
        lesson={lesson}
        x={position.x}
        y={position.y}
        status={getLessonStatus(lesson, completed)}
        emphasis={lesson.slug === rootSlug ? "start" : lesson.slug === capstoneSlug ? "capstone" : undefined}
        transition={
          reveal?.justCompleted.has(lesson.slug) ? "completing" : reveal?.justUnlocked.has(lesson.slug) ? "unlocking" : undefined
        }
        cave={cave}
      />
    );
  }

  return (
    <PannableMapCanvas
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      getInitialFocus={getInitialFocus}
      ready={ready}
      headerSlot={headerSlot}
      // Viewport-pinned HUD, not the scrolling/scaling canvas — `TorchCursor`
      // specifically needs this: mounting it inside the canvas's own
      // `transform: scale(zoom)` ancestor would make that ancestor the
      // containing block for its `position: fixed`, breaking the plain
      // client-coordinate math the pointer-move effect above does. See
      // `TorchCursor`'s own doc comment.
      legendSlot={
        <>
          <MapLegend completed={completedSlugs.length} total={lessons.length} />
          {cave && (
            <>
              <TorchToggle />
              <TorchCursor ref={torchCursorRef} />
            </>
          )}
        </>
      }
      // The torch replaces the native cursor with its own flame glow —
      // only while there's actually a torch lit to replace it with.
      hideCursor={cave && torchOn}
    >
      {/* Lit nodes/edges render as direct siblings, always painted. Locked
          nodes *and* their incoming trails route through the one shared
          `CaveShroud` instead — real darkness, not just a dim style, until
          the torch's mask cutout sweeps over them, and dark again the
          instant it moves on (there's no separate "revealed" flag to keep
          a trail pinned open past that — the mask alone is the only thing
          deciding what's paintable, so a trail can never outlive the beam
          that's lighting it). Outside cave mode `lockedLessons`/
          `lockedEdges` still exist but there's no shroud to route them
          through, so they're rendered flat right alongside everything
          else — the same degrade `MapNode`'s own `cave`-independent
          locked-button branch already handles. */}
      <MapRegions regions={FOUNDATIONS_MAP_REGIONS} getPosition={getMapNodePosition} />
      <MapEdges edges={cave ? litEdges : [...litEdges, ...lockedEdges]} cave={cave} />
      {litLessons.map(renderNode)}
      {cave ? (
        <CaveShroud ref={shroudRef}>
          <MapEdges edges={lockedEdges} cave={cave} />
          {lockedLessons.map(renderNode)}
        </CaveShroud>
      ) : (
        lockedLessons.map(renderNode)
      )}
    </PannableMapCanvas>
  );
}
