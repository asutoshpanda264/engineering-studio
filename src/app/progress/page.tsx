"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/LinkButton";
import { DifficultyMeter } from "@/components/ui/DifficultyMeter";
import { PageMeshBackground } from "@/components/layout/PageMeshBackground";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/lib/auth/authStore";
import { getMyProgress } from "@/lib/api/progress";
import { getScenario } from "@/scenarios";
import type { ProblemProgressResponse, ProblemProgressStatus } from "@/lib/api/types";

const STATUS_LABEL: Record<ProblemProgressStatus, string> = {
  ATTEMPTED: "Attempted",
  SOLVED: "Solved",
};

const STATUS_BADGE_VARIANT: Record<ProblemProgressStatus, "warning" | "success"> = {
  ATTEMPTED: "warning",
  SOLVED: "success",
};

type LoadState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; rows: ProblemProgressResponse[] };

/**
 * Reads `engineering-studio-backend`'s `GET /progress/scenarios` (Phase
 * 5) — self-only, authenticated-only; no public/guest variant exists on
 * the backend (unlike leaderboards/daily-challenge), so this page is
 * signed-in-only throughout, not "guest-visible, auth-gated-extra" like
 * `/leaderboard`/`/daily-challenge`. Distinct from `/problems`' own local
 * per-scenario badges (`@/lib/problemProgress`, `localStorage`-only,
 * works for guests) — this shows the SERVER's view: real points/stars
 * from a genuinely verified TIMED submit, plus every NO_PRESSURE solve
 * too (marked solved, 0 points — see `ProblemProgressResponse`'s own
 * doc). See masterdoc/phase-frontend-integration/ (backend repo),
 * Increment 6.
 */
export default function ProgressPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { user, status: authStatus } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyProgress()
      .then((rows) => {
        if (!cancelled) setState({ kind: "ready", rows });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sortedRows =
    state.kind === "ready"
      ? [...state.rows].sort((a, b) => new Date(b.lastAttemptAt).getTime() - new Date(a.lastAttemptAt).getTime())
      : [];
  const solvedCount = state.kind === "ready" ? state.rows.filter((row) => row.status === "SOLVED").length : 0;
  const totalPoints = state.kind === "ready" ? state.rows.reduce((sum, row) => sum + row.bestPoints, 0) : 0;

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-bg">
      <PageMeshBackground isLight={isLight} />

      <AppHeader back={{ href: "/problems", label: "Problems" }} maxWidthClassName="max-w-3xl" />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-medium text-text">My Progress</h1>
          <p className="mt-1 text-sm text-text-muted">
            Every scenario the server has a real, verified attempt for. Points and stars only count a Timed Challenge
            submission — a free-play solve still marks a scenario solved, just at 0 points.
          </p>
        </div>

        {authStatus !== "ready" ? null : !user ? (
          <Panel className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-sm text-text-muted">Sign in to see your solved scenarios, points, and stars.</p>
            <LinkButton href="/login">Sign In</LinkButton>
          </Panel>
        ) : (
          <>
            {state.kind === "ready" && state.rows.length > 0 && (
              <Panel className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm text-text">
                <span>
                  <span className="font-medium text-signal">{solvedCount}</span> solved
                </span>
                <span>
                  <span className="font-medium text-signal">{state.rows.length}</span> attempted
                </span>
                <span>
                  <span className="font-medium text-signal">{totalPoints}</span> points
                </span>
              </Panel>
            )}

            <Panel className="overflow-hidden">
              {state.kind === "loading" ? (
                <p className="p-6 text-center text-sm text-text-muted">Loading…</p>
              ) : state.kind === "error" ? (
                <p className="p-6 text-center text-sm text-status-critical">
                  Couldn&apos;t load your progress right now.
                </p>
              ) : sortedRows.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-muted">
                  No scenarios attempted yet — solve one (Timed Challenge or free play) to see it here.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-subtle">
                      <th className="px-4 py-2 font-medium">Scenario</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 text-right font-medium">Stars</th>
                      <th className="px-4 py-2 text-right font-medium">Points</th>
                      <th className="px-4 py-2 text-right font-medium">Last attempt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => {
                      const scenario = getScenario(row.scenarioId);
                      return (
                        <tr key={row.scenarioId} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/workshop?scenario=${row.scenarioId}`}
                              className="text-text underline decoration-border underline-offset-2 transition-colors duration-fast ease-standard hover:text-signal hover:decoration-signal"
                            >
                              {scenario?.title ?? row.scenarioId}
                            </Link>
                            {scenario && (
                              <div className="mt-1">
                                <DifficultyMeter level={scenario.difficulty} showLabel={false} />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={STATUS_BADGE_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-text-muted">
                            {row.bestStars > 0 ? "★".repeat(row.bestStars) + "☆".repeat(3 - row.bestStars) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-text">
                            {row.bestPoints > 0 ? row.bestPoints : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right text-text-subtle">
                            {new Date(row.lastAttemptAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>
          </>
        )}
      </div>
    </main>
  );
}
