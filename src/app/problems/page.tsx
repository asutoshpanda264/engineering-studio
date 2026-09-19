"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, History, Trophy } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { PageMeshBackground } from "@/components/layout/PageMeshBackground";
import { useAuth } from "@/lib/auth/authStore";
import { ProblemsBody } from "@/components/problems/ProblemsBody";
import { InterviewQuestionsBody } from "@/components/interviewQuestions/InterviewQuestionsBody";

type ProblemsTab = "problems" | "interviews";

/**
 * The "Problems" section home — everything a signed-out visitor can reach
 * (Problems, Interviews) plus, once signed in, Leaderboard/Daily/Progress
 * (Sept 18 nav plan, item 1). The two tabs render `ProblemsBody`/
 * `InterviewQuestionsBody` — the same content the standalone
 * `/interview-questions` route renders — behind a plain client-side tab
 * switch rather than a route change, so this page owns both.
 */
export default function ProblemsPage() {
  const [tab, setTab] = useState<ProblemsTab>("problems");
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { user, status } = useAuth();
  const signedIn = status === "ready" && user !== null;

  return (
    <main className="relative isolate flex min-h-screen flex-col bg-workspace-bg">
      <PageMeshBackground isLight={isLight} />

      <AppHeader
        back={{ href: "/", label: "Engineering Studio" }}
        className="!bg-workspace-bg/90"
        maxWidthClassName="max-w-5xl"
        right={
          signedIn && (
            <>
              <Link
                href="/leaderboard"
                className="hidden items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-workspace-text-muted transition-colors duration-fast ease-standard hover:text-workspace-accent sm:inline-flex"
              >
                <Trophy className="size-4" aria-hidden />
                Leaderboard
              </Link>
              <Link
                href="/daily-challenge"
                className="hidden items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-workspace-text-muted transition-colors duration-fast ease-standard hover:text-workspace-accent sm:inline-flex"
              >
                <CalendarCheck className="size-4" aria-hidden />
                Daily
              </Link>
              <Link
                href="/progress"
                className="hidden items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-workspace-text-muted transition-colors duration-fast ease-standard hover:text-workspace-accent sm:inline-flex"
              >
                <History className="size-4" aria-hidden />
                Progress
              </Link>
            </>
          )
        }
      />

      <div className="relative mx-auto flex w-full max-w-5xl justify-center px-6 pt-6" role="tablist" aria-label="Problems section">
        <div className="inline-flex items-center gap-1 rounded-full border border-workspace-border bg-workspace-surface p-1">
          <ProblemsTabButton active={tab === "problems"} onClick={() => setTab("problems")}>
            Problems
          </ProblemsTabButton>
          <ProblemsTabButton active={tab === "interviews"} onClick={() => setTab("interviews")}>
            Interviews
          </ProblemsTabButton>
        </div>
      </div>

      {tab === "problems" ? <ProblemsBody /> : <InterviewQuestionsBody />}
    </main>
  );
}

function ProblemsTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors duration-fast ease-standard ${
        active ? "bg-workspace-accent-soft text-workspace-accent" : "text-workspace-text-muted hover:text-workspace-text"
      }`}
    >
      {children}
    </button>
  );
}
