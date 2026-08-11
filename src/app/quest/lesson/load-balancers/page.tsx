"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mascot } from "@/components/quest/mascot/Mascot";
import type { MascotState } from "@/components/quest/mascot/mascotStates";
import { DialogueBox } from "@/components/quest/DialogueBox";
import { SystemDiagram } from "@/components/quest/SystemDiagram";
import type { SystemDiagramNode, SystemDiagramEdge } from "@/components/quest/SystemDiagram";
import { AnswerChoice } from "@/components/quest/AnswerChoice";
import { GameButton } from "@/components/quest/GameButton";
import { ProgressIndicator } from "@/components/quest/ProgressIndicator";
import { Celebration } from "@/components/quest/Celebration";
import { useSceneStage } from "@/components/quest/SceneStage";
import { useQuestProgressStore } from "@/store/questProgressStore";

const LESSON_ID = "load-balancers";
const STAGES = ["intro", "concept", "question", "feedback", "complete"] as const;

const PROBLEM_NODES: SystemDiagramNode[] = [
  { id: "u1", kind: "user", x: 20, y: 15 },
  { id: "u2", kind: "user", x: 40, y: 15 },
  { id: "u3", kind: "user", x: 60, y: 15 },
  { id: "u4", kind: "user", x: 80, y: 15 },
  { id: "server", kind: "server", label: "The one server", status: "overloaded", x: 50, y: 75 },
];

const PROBLEM_EDGES: SystemDiagramEdge[] = [
  { from: "u1", to: "server", status: "overloaded" },
  { from: "u2", to: "server", status: "overloaded" },
  { from: "u3", to: "server", status: "overloaded" },
  { from: "u4", to: "server", status: "overloaded" },
];

const SOLUTION_NODES: SystemDiagramNode[] = [
  { id: "u1", kind: "user", x: 20, y: 12 },
  { id: "u2", kind: "user", x: 40, y: 12 },
  { id: "u3", kind: "user", x: 60, y: 12 },
  { id: "u4", kind: "user", x: 80, y: 12 },
  { id: "lb", kind: "load_balancer", label: "Load balancer", x: 50, y: 45 },
  { id: "s1", kind: "server", label: "Server A", status: "healthy", x: 25, y: 82 },
  { id: "s2", kind: "server", label: "Server B", status: "healthy", x: 50, y: 82 },
  { id: "s3", kind: "server", label: "Server C", status: "healthy", x: 75, y: 82 },
];

const SOLUTION_EDGES: SystemDiagramEdge[] = [
  { from: "u1", to: "lb" },
  { from: "u2", to: "lb" },
  { from: "u3", to: "lb" },
  { from: "u4", to: "lb" },
  { from: "lb", to: "s1" },
  { from: "lb", to: "s2" },
  { from: "lb", to: "s3" },
];

interface QuestionChoice {
  id: string;
  label: string;
  correct: boolean;
  /** Shown on the feedback stage — praise for the right answer, a
      specific reason (not just "wrong!") for each wrong one. */
  explanation: string;
}

const QUESTION_CHOICES: QuestionChoice[] = [
  {
    id: "distribute",
    label: "Spread the requests across multiple servers",
    correct: true,
    explanation:
      "Exactly! Spreading requests across multiple servers means no single door can get overwhelmed — that's the whole job of a load balancer.",
  },
  {
    id: "bigger-server",
    label: "Buy one much bigger server",
    correct: false,
    explanation:
      "A bigger server raises the ceiling, but it's still ONE door. Enough traffic and you're right back here — you need more doors, not a taller one.",
  },
  {
    id: "cache-everything",
    label: "Cache every response forever",
    correct: false,
    explanation:
      "Caching helps with repeated reads, but it doesn't fix the actual problem: everyone is still funneling through the same single entrance.",
  },
];

const CORRECT_ADVANCE_DELAY_MS = 700;
const INCORRECT_ADVANCE_DELAY_MS = 1000;

/**
 * "The Load Balancer Gate" — the one real lesson in this slice, played
 * end to end: intro → concept → question → feedback → complete. See
 * docs-game/CLAUDE.md milestone 8 for what changed from milestone 7
 * (feedback used to be a silent auto-clear; completion didn't exist).
 */
export default function LoadBalancersLessonPage() {
  const router = useRouter();
  const { stage, index, advance, goTo } = useSceneStage(STAGES);
  const [answerId, setAnswerId] = useState<string | null>(null);
  const markLessonComplete = useQuestProgressStore((state) => state.markLessonComplete);

  const selectedChoice = QUESTION_CHOICES.find((choice) => choice.id === answerId);

  // Let the AnswerChoice's own pop/shake play out, then move into the
  // real feedback stage — both branches go here now; milestone 7's
  // version silently reset wrong answers instead of explaining them.
  useEffect(() => {
    if (!selectedChoice) return;
    const delay = selectedChoice.correct ? CORRECT_ADVANCE_DELAY_MS : INCORRECT_ADVANCE_DELAY_MS;
    const id = window.setTimeout(() => advance(), delay);
    return () => window.clearTimeout(id);
  }, [selectedChoice, advance]);

  const retry = () => {
    setAnswerId(null);
    goTo("question");
  };

  const finish = () => {
    markLessonComplete(LESSON_ID);
    router.push("/quest/map");
  };

  const mascotState: MascotState =
    stage === "intro"
      ? "warning"
      : stage === "concept"
        ? "explaining"
        : stage === "question"
          ? selectedChoice
            ? selectedChoice.correct
              ? "happy"
              : "confused"
            : "thinking"
          : stage === "feedback"
            ? selectedChoice?.correct
              ? "celebrating"
              : "confused"
            : "celebrating"; // complete

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/quest/map"
          data-quest-display
          className="text-sm font-semibold text-[var(--quest-ink-on-dark-muted)] transition-colors hover:text-[var(--quest-ink-on-dark)]"
        >
          ← Map
        </Link>
        <h1 className="text-sm font-semibold uppercase tracking-wide">The Load Balancer Gate</h1>
        <span className="w-10" aria-hidden />
      </div>

      <ProgressIndicator value={index} max={STAGES.length} className="mx-auto w-full max-w-xs" />

      <Mascot state={mascotState} size={130} className="mx-auto" />

      {stage === "intro" && (
        <section className="flex flex-col gap-4">
          <DialogueBox
            speakerName="Sparky"
            text="Uh oh! Everyone is trying to enter through ONE door!"
            onAdvance={advance}
          />
          <SystemDiagram nodes={PROBLEM_NODES} edges={PROBLEM_EDGES} />
        </section>
      )}

      {stage === "concept" && (
        <section className="flex flex-col gap-4">
          <DialogueBox
            speakerName="Sparky"
            text="A load balancer spreads that same traffic across multiple servers instead — no single door, no collapse."
            onAdvance={advance}
          />
          <SystemDiagram nodes={SOLUTION_NODES} edges={SOLUTION_EDGES} />
        </section>
      )}

      {stage === "question" && (
        <section className="flex flex-col gap-4">
          <DialogueBox speakerName="Sparky" text="Quick check — if one server is getting crushed, what actually fixes it?">
            <div className="flex flex-col gap-3">
              {QUESTION_CHOICES.map((choice) => (
                <AnswerChoice
                  key={choice.id}
                  label={choice.label}
                  disabled={answerId !== null}
                  state={answerId === choice.id ? (choice.correct ? "correct" : "incorrect") : "default"}
                  onClick={() => setAnswerId(choice.id)}
                />
              ))}
            </div>
          </DialogueBox>
        </section>
      )}

      {stage === "feedback" && selectedChoice && (
        <section className="flex flex-col gap-4">
          <DialogueBox speakerName="Sparky" text={selectedChoice.explanation}>
            {selectedChoice.correct ? (
              <GameButton className="w-full" onClick={advance}>
                Continue
              </GameButton>
            ) : (
              <GameButton variant="secondary" className="w-full" onClick={retry}>
                Try Again
              </GameButton>
            )}
          </DialogueBox>
          {!selectedChoice.correct && <SystemDiagram nodes={PROBLEM_NODES} edges={PROBLEM_EDGES} />}
        </section>
      )}

      {stage === "complete" && (
        <section className="relative flex flex-col items-center gap-4 text-center">
          <Celebration />
          <DialogueBox speakerName="Sparky" text="Lesson complete! You just learned why load balancers exist." />
          <GameButton className="w-full max-w-xs" onClick={finish}>
            Return to Map
          </GameButton>
        </section>
      )}
    </main>
  );
}
