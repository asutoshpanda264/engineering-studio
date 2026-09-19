"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Flame } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/LinkButton";
import { DifficultyMeter } from "@/components/ui/DifficultyMeter";
import { PageMeshBackground } from "@/components/layout/PageMeshBackground";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/lib/auth/authStore";
import { getDailyChallengeHistory, getMyDailyChallengeStanding, getTodayChallenge } from "@/lib/api/dailyChallenge";
import type {
  DailyChallengeCompletionResponse,
  DailyChallengeResponse,
  MyDailyChallengeStandingResponse,
} from "@/lib/api/types";

/**
 * Reads `engineering-studio-backend`'s daily challenge (Phase 7) —
 * `GET /daily-challenge/today` is public, so guests see today's pick too;
 * completion state and history need a signed-in user. Solving it is just
 * solving the picked scenario in Timed Challenge mode — no separate
 * attempt-flow wiring exists or is needed, since
 * `DailyChallengeService.onScenarioSolved` (backend) already auto-detects
 * and credits a completion for any TIMED solve of today's scenario,
 * regardless of how the workshop was reached. See
 * masterdoc/phase-frontend-integration/decisions.md ("Increment 3").
 */
export default function DailyChallengePage() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<DailyChallengeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [standing, setStanding] = useState<MyDailyChallengeStandingResponse | null>(null);
  const [history, setHistory] = useState<DailyChallengeCompletionResponse[] | null>(null);

  useEffect(() => {
    getTodayChallenge()
      .then(setChallenge)
      .catch(() => setError("Couldn't load today's challenge right now."));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyDailyChallengeStanding().then((result) => {
      if (!cancelled) setStanding(result);
    });
    getDailyChallengeHistory().then((result) => {
      if (!cancelled) setHistory(result);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const completedToday = standing?.completedToday ?? false;

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-bg">
      <PageMeshBackground isLight={isLight} />

      <AppHeader back={{ href: "/problems", label: "Problems" }} maxWidthClassName="max-w-3xl" />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-medium text-text">Daily Challenge</h1>
          <p className="mt-1 text-sm text-text-muted">
            One scenario, picked for today. Solve it in Timed Challenge mode to keep your streak alive and appear on
            the leaderboards.
          </p>
        </div>

        {user && (
          <Panel className="flex items-center gap-2 p-4">
            <Flame className="size-4 shrink-0 text-status-degraded" aria-hidden />
            <p className="text-sm text-text">
              Current streak: <span className="font-medium">{user.currentStreak}</span> day
              {user.currentStreak === 1 ? "" : "s"}
              {user.longestStreak > user.currentStreak && (
                <span className="text-text-muted"> (best: {user.longestStreak})</span>
              )}
            </p>
          </Panel>
        )}

        <Panel className="p-6">
          {error ? (
            <p className="text-sm text-status-critical">{error}</p>
          ) : challenge === null ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wide text-text-subtle">{challenge.challengeDate}</p>
                <h2 className="mt-1 text-lg font-medium text-text">{challenge.scenarioTitle}</h2>
                <div className="mt-2">
                  <DifficultyMeter level={challenge.difficulty} />
                </div>
              </div>

              {user && completedToday ? (
                <div className="inline-flex w-fit items-center gap-1.5 border border-status-healthy/40 bg-status-healthy/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-status-healthy">
                  <CalendarCheck className="size-3.5" aria-hidden />
                  Completed today
                </div>
              ) : (
                <LinkButton
                  href={`/workshop?scenario=${challenge.scenarioId}&timed=1`}
                  className="w-fit"
                >
                  Solve it
                </LinkButton>
              )}
            </div>
          )}
        </Panel>

        {user && (
          <Panel className="overflow-hidden">
            <Panel.Header title="Your history" />
            {history === null ? (
              <p className="p-6 text-center text-sm text-text-muted">Loading…</p>
            ) : history.length === 0 ? (
              <p className="p-6 text-center text-sm text-text-muted">
                No completions yet — solve today&apos;s challenge to start your streak.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {history.map((entry) => (
                  <li key={entry.challengeDate} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-mono text-text-muted">{entry.challengeDate}</span>
                    <span className="text-text-subtle">
                      {new Date(entry.completedAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </main>
  );
}
