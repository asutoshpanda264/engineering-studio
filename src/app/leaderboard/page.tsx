"use client";

import { useEffect, useState } from "react";
import { Crown, Gauge, Trophy } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel } from "@/components/ui/Panel";
import { useAuth } from "@/lib/auth/authStore";
import { getLeaderboard, getMyLeaderboardStanding } from "@/lib/api/leaderboards";
import type { LeaderboardEntryResponse, LeaderboardType, MyLeaderboardStandingResponse } from "@/lib/api/types";

const TABS: { type: LeaderboardType; label: string; icon: typeof Trophy; scoreLabel: string }[] = [
  { type: "best-solved", label: "Best Solved", icon: Trophy, scoreLabel: "points" },
  { type: "most-solved", label: "Most Solved", icon: Crown, scoreLabel: "solved" },
  { type: "fastest-solved", label: "Fastest Solved", icon: Gauge, scoreLabel: "speed" },
];

/** Tags a fetch result with the `activeType` it answers, so a stale
 *  in-flight request for the previously-selected tab can never render
 *  itself as if it belonged to the tab now on screen — comparing
 *  `.type` against `activeType` at render time does the job a
 *  cancellation flag alone can't quite cover once two effects
 *  (board + "my rank") race independently. Also sidesteps the
 *  `set-state-in-effect` lint rule entirely: neither effect below ever
 *  calls setState synchronously in its body, only from inside a
 *  resolved/rejected promise callback. */
type BoardResult =
  | { type: LeaderboardType; kind: "ok"; entries: LeaderboardEntryResponse[] }
  | { type: LeaderboardType; kind: "error" };

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeType, setActiveType] = useState<LeaderboardType>("best-solved");
  const [board, setBoard] = useState<BoardResult | null>(null);
  const [myStanding, setMyStanding] = useState<{ type: LeaderboardType; value: MyLeaderboardStandingResponse } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    getLeaderboard(activeType)
      .then((result) => {
        if (!cancelled) setBoard({ type: activeType, kind: "ok", entries: result });
      })
      .catch(() => {
        if (!cancelled) setBoard({ type: activeType, kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [activeType]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyLeaderboardStanding(activeType).then((result) => {
      if (!cancelled) setMyStanding({ type: activeType, value: result });
    });
    return () => {
      cancelled = true;
    };
  }, [activeType, user]);

  const activeTab = TABS.find((t) => t.type === activeType)!;
  const currentBoard = board?.type === activeType ? board : null;
  const currentStanding = user && myStanding?.type === activeType ? myStanding.value : null;

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <AppHeader back={{ href: "/problems", label: "Problems" }} maxWidthClassName="max-w-3xl" />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-medium text-text">Leaderboard</h1>
          <p className="mt-1 text-sm text-text-muted">
            Only real, timed, server-verified solves count here — practice-mode solves never appear on any board.
          </p>
        </div>

        <div className="flex gap-2">
          {TABS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              aria-pressed={activeType === type}
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors duration-fast ease-standard ${
                activeType === type
                  ? "border-signal/50 bg-signal/10 text-signal"
                  : "border-border text-text-muted hover:border-border-hover hover:text-text"
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {user && (
          <Panel className="p-4">
            {currentStanding === null ? (
              <p className="text-sm text-text-muted">Checking your rank…</p>
            ) : currentStanding.ranked ? (
              <p className="text-sm text-text">
                You&apos;re ranked <span className="font-medium text-signal">#{currentStanding.rank}</span> on{" "}
                {activeTab.label} with a score of{" "}
                <span className="font-medium">{formatScore(currentStanding.score!)}</span>.
              </p>
            ) : (
              <p className="text-sm text-text-muted">
                You don&apos;t have a ranked, timed solve on {activeTab.label} yet — solve a scenario in Timed
                Challenge mode to appear here.
              </p>
            )}
          </Panel>
        )}

        <Panel className="overflow-hidden">
          {currentBoard === null ? (
            <p className="p-6 text-center text-sm text-text-muted">Loading…</p>
          ) : currentBoard.kind === "error" ? (
            <p className="p-6 text-center text-sm text-status-critical">Couldn&apos;t load this leaderboard right now.</p>
          ) : currentBoard.entries.length === 0 ? (
            <p className="p-6 text-center text-sm text-text-muted">No one&apos;s on this leaderboard yet — be the first.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-subtle">
                  <th className="w-16 px-4 py-2 font-medium">Rank</th>
                  <th className="px-4 py-2 font-medium">Player</th>
                  <th className="px-4 py-2 text-right font-medium">{activeTab.scoreLabel}</th>
                </tr>
              </thead>
              <tbody>
                {currentBoard.entries.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={`border-b border-border last:border-b-0 ${
                      user && entry.userId === user.id ? "bg-signal/5" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-text-muted">#{entry.rank}</td>
                    <td className="px-4 py-2.5 text-text">{entry.displayName}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-text">{formatScore(entry.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </main>
  );
}

function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(3);
}
