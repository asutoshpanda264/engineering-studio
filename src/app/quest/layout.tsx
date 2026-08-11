import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "@/styles/quest.css";

// Quest's own type voices — a rounded display face for titles/game
// labels, a rounded/legible body face for explanations and questions.
// Both variable fonts, so weight is left unspecified (same pattern the
// root layout uses for Source_Serif_4) rather than pinned to one static
// cut. Deliberately not Trace's Source Serif 4 / IBM Plex Mono — see
// docs-game/CLAUDE.md §5.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quest — Engineering Studio",
  description: "A JRPG-style prototype for learning system design.",
};

/**
 * Nested layout under the root layout — `<html>`/`<body>` (and Trace's
 * body-wide `font-sans`/`bg-bg`) are already set by `app/layout.tsx`.
 * This wraps every `/quest/*` route in `.quest-root`, which resets
 * background/text/font-family to the Quest tokens (quest.css) so none of
 * Trace's body styles leak in. No `ThemeProvider` here — Quest doesn't
 * have a light/dark toggle, it has one bright palette.
 */
export default function QuestLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${fredoka.variable} ${nunito.variable} quest-root`}>{children}</div>;
}
