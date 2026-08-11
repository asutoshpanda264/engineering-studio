"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { WorkshopShell } from "@/components/workshop/WorkshopShell";
import { useWorkshopStore } from "@/store/workshopStore";

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
 */
function ScenarioDeepLink() {
  const searchParams = useSearchParams();
  const loadScenario = useWorkshopStore((s) => s.loadScenario);
  const reset = useWorkshopStore((s) => s.reset);

  useEffect(() => {
    const id = searchParams.get("scenario");
    if (id) loadScenario(id);
    else reset();
    // Only ever consult the URL on the initial load — once a user starts
    // editing, re-running this on an unrelated param change would silently
    // blow away their work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
