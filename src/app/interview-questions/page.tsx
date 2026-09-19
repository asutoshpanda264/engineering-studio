"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { PageMeshBackground } from "@/components/layout/PageMeshBackground";
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
      <PageMeshBackground isLight={isLight} />

      <AppHeader
        back={{ href: "/", label: "Engineering Studio" }}
        className="!bg-workspace-bg/90"
        maxWidthClassName="max-w-5xl"
      />

      <InterviewQuestionsBody />
    </main>
  );
}
