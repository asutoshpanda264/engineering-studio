"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { BatMark } from "@/components/theme/icons/BatMark";
import { VILLAIN_SEQUENCE } from "@/content/lockIn/villains";
import { resetLockIn, useLockInState } from "@/lib/lockInMode";

/**
 * The one sanctioned exit from an active lock-in run. Reads state rather
 * than taking props since it's the destination `LockInChapterAction`
 * routes to after the 3rd chapter — there's no data to pass through a
 * route, only what's already in `localStorage`.
 *
 * Handles arriving here with nothing to show (state reset already, or
 * this URL was typed/bookmarked mid-run rather than reached by actually
 * finishing) as a plain, non-broken fallback rather than a blank screen.
 */
export function VictoryScreen() {
  const router = useRouter();
  const state = useLockInState();

  const isVictory = state.active && state.chapterIndex === 3;

  if (!isVictory) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
        <p className="text-sm text-text-muted">There&apos;s no lock-in victory to show right now.</p>
        <LinkButton href="/learn" variant="secondary">
          Back to Learn
        </LinkButton>
      </main>
    );
  }

  const handleReturn = () => {
    resetLockIn();
    router.push("/learn");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-16">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center">
        <BatMark className="size-10 text-signal" aria-hidden />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-text sm:text-3xl">Gotham is safe.</h1>
          <p className="text-text-muted">Batman Mode — all three chapters complete.</p>
        </div>

        <div className="flex w-full flex-col gap-3 bg-bg-panel p-5 text-left">
          {VILLAIN_SEQUENCE.map((villain) => (
            <div key={villain.id} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-healthy" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-text">
                  {villain.name} <span className="font-normal text-text-muted">— {villain.epithet}</span>
                </p>
                <p className="text-sm leading-relaxed text-text-muted">{villain.defeatLine}</p>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="primary" onClick={handleReturn}>
          Return to Gotham
        </Button>
      </div>
    </main>
  );
}
