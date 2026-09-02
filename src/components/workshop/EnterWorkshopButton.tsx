"use client";

import { useRouter } from "next/navigation";
import { Hammer } from "lucide-react";
import { useWorkshopStore } from "@/store/workshopStore";

/**
 * Replaces the old scenario-picker dropdown that used to live here (see
 * `docs/BROWSER-CHECKS.md`/git history — it was briefly mislabeled
 * "Workshop" while still opening a list of scenarios, which read as "the
 * Workshop nav item shows problems"). Scenario browsing now lives entirely
 * on `/problems`; this is a plain "back to a blank Workshop" action —
 * same destination as the landing page's "Enter Workshop" button, reachable
 * from inside the app itself (`/tutorial`, or `/workshop` with a scenario
 * or in-progress build already on the canvas).
 *
 * Resets the store directly rather than relying on `ScenarioDeepLink`'s
 * mount-time reset (`src/app/workshop/page.tsx`) — that only fires on an
 * actual route change, so clicking this while already on `/workshop`
 * wouldn't clear anything without it.
 */
export function EnterWorkshopButton() {
  const router = useRouter();
  const reset = useWorkshopStore((s) => s.reset);

  const handleClick = () => {
    reset();
    router.push("/workshop");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-8 items-center justify-center gap-1.5 px-3 text-xs font-medium text-text-muted transition-colors duration-fast ease-standard hover:bg-bg-elevated hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      aria-label="Workshop — a fresh, blank canvas, discarding whatever's currently loaded"
      title="Fresh, blank canvas — discards whatever's currently loaded"
    >
      <Hammer className="size-4" aria-hidden />
      Workshop
    </button>
  );
}
