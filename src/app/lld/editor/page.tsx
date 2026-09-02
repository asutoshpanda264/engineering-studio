"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { EditorShell } from "@/components/lld/EditorShell";
import { useLldStore } from "@/store/lldStore";

/**
 * Reads `?challenge=<slug>` (the case-study lesson pages' "Build it" CTA
 * deep-links this way — Phase 4) and starts it once on mount, same
 * `?scenario=`/`ScenarioDeepLink` precedent `/workshop/page.tsx` sets.
 * Without the param, this still opens blank by default (nothing to reset
 * to, unlike Workshop — there's no scenario concept without a challenge
 * id, so a plain visit just leaves whatever's on the canvas alone).
 */
function ChallengeDeepLink() {
  const searchParams = useSearchParams();
  const startChallenge = useLldStore((s) => s.startChallenge);

  useEffect(() => {
    const slug = searchParams.get("challenge");
    if (slug) startChallenge(slug);
    // Only ever consult the URL on the initial load — same reasoning
    // `ScenarioDeepLink` documents: re-running this on an unrelated param
    // change would blow away in-progress work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * `/lld/editor` — the class-diagram canvas. Opens blank by default, same
 * "playground first" `/workshop` follows; a `?challenge=` deep link starts
 * a case-study challenge fresh (see `ChallengeDeepLink`/`startChallenge`).
 */
export default function LldEditorPage() {
  return (
    <>
      <Suspense fallback={null}>
        <ChallengeDeepLink />
      </Suspense>
      <EditorShell />
    </>
  );
}
