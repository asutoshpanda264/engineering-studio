"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mascot } from "@/components/quest/mascot/Mascot";
import { GameButton } from "@/components/quest/GameButton";
import { DialogueBox } from "@/components/quest/DialogueBox";

/**
 * Landing — the game's cold open, not a marketing hero. One beat of
 * dialogue building up to the one primary action ("Begin Adventure"),
 * per docs-game/CLAUDE.md §3. This replaces the milestone 1–3 token/
 * component preview outright — see that doc's status log.
 */

const GREETING_LINES = [
  "Whoa — a new challenger approaches!",
  "I'm Sparky. There's a whole world of system design out there — ready to see why servers fall over, and how to stop it?",
];

export default function QuestLandingPage() {
  const router = useRouter();
  const [lineIndex, setLineIndex] = useState(0);
  const isLastLine = lineIndex >= GREETING_LINES.length - 1;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <BackgroundScenery />

      <div className="relative flex w-full max-w-lg flex-col items-center gap-8">
        <h1
          className="text-center text-4xl font-bold uppercase tracking-wide text-[var(--quest-yellow)] sm:text-5xl"
          style={{ textShadow: "3px 3px 0 var(--quest-ink)" }}
        >
          System Design Quest
        </h1>

        <Mascot state={isLastLine ? "excited" : "explaining"} size={180} />

        <DialogueBox
          key={lineIndex}
          speakerName="Sparky"
          text={GREETING_LINES[lineIndex]}
          onAdvance={isLastLine ? undefined : () => setLineIndex((i) => i + 1)}
          className="w-full"
        >
          {isLastLine && (
            <GameButton size="lg" className="w-full" onClick={() => router.push("/quest/map")}>
              Begin Adventure
            </GameButton>
          )}
        </DialogueBox>
      </div>
    </main>
  );
}

/** Purely decorative — a few static stars and a hill silhouette so the
    scene reads as "a world" rather than a plain navy rectangle. No
    twinkle/parallax animation: ambient motion here wouldn't communicate
    any state change, which the project's animation principle rules out
    (docs-game/CLAUDE.md §6). Kept local to this page rather than added
    to the shared component library — nothing else uses it yet. */
function BackgroundScenery() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 400 300"
    >
      <circle cx={40} cy={40} r={2} fill="var(--quest-cream)" opacity={0.5} />
      <circle cx={90} cy={70} r={1.5} fill="var(--quest-cream)" opacity={0.4} />
      <circle cx={140} cy={20} r={1} fill="var(--quest-cream)" opacity={0.3} />
      <circle cx={200} cy={35} r={1.5} fill="var(--quest-cream)" opacity={0.4} />
      <circle cx={280} cy={25} r={1} fill="var(--quest-cream)" opacity={0.3} />
      <circle cx={340} cy={50} r={2} fill="var(--quest-cream)" opacity={0.5} />
      <circle cx={370} cy={90} r={1.5} fill="var(--quest-cream)" opacity={0.35} />
      <path d="M0,300 L0,230 Q60,200 120,225 T240,215 T400,235 L400,300 Z" fill="var(--quest-navy-deep)" />
    </svg>
  );
}
