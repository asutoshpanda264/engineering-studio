"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";
import { InterviewQuestionsBody } from "@/components/interviewQuestions/InterviewQuestionsBody";

/**
 * The standalone, bookmarkable `/interview-questions` route — same content
 * as the "Interviews" tab on `/problems` (see the Sept 18 nav plan's item
 * 1), rendered here via the shared `InterviewQuestionsBody` rather than a
 * forked copy.
 */
export default function InterviewQuestionsPage() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <main className="relative isolate flex min-h-screen flex-col bg-workspace-bg">
      <div
        aria-hidden
        className={`bg-blueprint-grid pointer-events-none absolute inset-0 -z-20 ${isLight ? "opacity-60" : "opacity-70"}`}
      />
      {!isLight && (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-20 h-screen overflow-hidden opacity-[0.35]">
          <SystemMeshBackground />
        </div>
      )}

      <AppHeader
        back={{ href: "/", label: "Engineering Studio" }}
        className="!bg-workspace-bg/90"
        maxWidthClassName="max-w-5xl"
      />

      <InterviewQuestionsBody />
    </main>
  );
}
