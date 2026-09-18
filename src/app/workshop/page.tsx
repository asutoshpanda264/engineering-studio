"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { WorkshopShell } from "@/components/workshop/WorkshopShell";
import { useWorkshopStore } from "@/store/workshopStore";
import { useAuth } from "@/lib/auth/authStore";

/**
 * Reads `?scenario=<id>` (the landing page's scenario cards deep-link this
 * way) and loads it once on mount — the Workshop still opens blank by
 * default (WORKSHOP-UI.md §1a). Split out because useSearchParams forces
 * a Suspense boundary around whatever calls it.
 *
 * Without a `scenario` param, this resets the store instead of no-op'ing.
 * `workshopStore` is a module-level singleton, not tied to this page's own
 * lifecycle — landing on plain `/workshop` after a scenario was active in
 * an earlier visit (picked from the ScenariosMenu, or a previous deep
 * link) used to leave that scenario's problem statement and starting
 * architecture sitting on the canvas, contradicting "Workshop opens blank
 * by default." Resetting is harmless when the canvas is already blank.
 *
 * Waits for `useAuth()`'s bootstrap to settle (`status` past "idle"/
 * "loading") before firing — a real bug, caught during Increment 5's live
 * verification: on a genuine hard page load (a bookmarked or shared
 * `?scenario=...&timed=1` URL, or a plain refresh), this effect and
 * `AuthBootstrap`'s both fire in the same commit, but `loadScenario`'s
 * (and `startTimedChallenge`'s, and Increment 5's `startFreePlayAttempt`'s)
 * `getCurrentUser()` check reads a synchronous, point-in-time snapshot —
 * it always lost the race against the real `/me` network round-trip that
 * hadn't resolved yet, silently downgrading a genuinely signed-in student
 * to guest-like, local-only tracking with no error surfaced. Gated by a
 * ref rather than folded into the dependency array's own re-run guard, so
 * this still only ever actually loads once: `status` flips exactly once
 * per mount (idle/loading → ready), and re-running on a later, unrelated
 * status change (e.g. a sign-out) must not blow away in-progress work,
 * same reasoning the original "only consult the URL on initial load"
 * comment already established.
 */
function ScenarioDeepLink() {
  const searchParams = useSearchParams();
  const loadScenario = useWorkshopStore((s) => s.loadScenario);
  const reset = useWorkshopStore((s) => s.reset);
  const startTimedChallenge = useWorkshopStore((s) => s.startTimedChallenge);
  const authStatus = useAuth().status;
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (authStatus === "idle" || authStatus === "loading") return;
    hasLoadedRef.current = true;

    const id = searchParams.get("scenario");
    if (id) {
      loadScenario(id);
      // `/problems`' "Start Timed Challenge" action links here with
      // `&timed=1` — loadScenario() itself always clears timed mode (see
      // its own comment), so this has to run after, not be folded into it.
      if (searchParams.get("timed") === "1") startTimedChallenge();
    } else {
      reset();
    }
    // Only ever consult the URL on the initial load (once auth status is
    // known) — once a user starts editing, re-running this on an
    // unrelated param or auth-status change would silently blow away
    // their work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  return null;
}

/**
 * Workshop — the real thing. Layout lives in WorkshopShell, shared with
 * `/tutorial`; this page only owns what's specific to landing here
 * directly (the `?scenario=` deep link).
 */
export default function WorkshopPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ScenarioDeepLink />
      </Suspense>
      <WorkshopShell />
    </>
  );
}
