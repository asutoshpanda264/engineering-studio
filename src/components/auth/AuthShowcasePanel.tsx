import type { ReactNode } from "react";
import { Flame, Trophy, Workflow } from "lucide-react";

export interface AuthShowcasePanelProps {
  headline: ReactNode;
  subheadline: ReactNode;
}

const FEATURES = [
  {
    icon: Workflow,
    title: "Simulate real systems",
    description: "Build and break distributed architectures in the Workshop canvas before you're asked to in an interview.",
  },
  {
    icon: Trophy,
    title: "Points & leaderboard rank",
    description: "Every solved problem and verified attempt counts toward a real, server-tracked score.",
  },
  {
    icon: Flame,
    title: "Daily challenge streaks",
    description: "One new problem a day, tuned to keep momentum without burning you out.",
  },
];

/**
 * The right-hand branded half of the login/register split screen (hidden
 * below `lg`, see those pages) — the "modern SaaS onboarding" panel from
 * the auth redesign: headline + a short, honest feature list drawn from
 * real product surfaces (Workshop, points/leaderboard, daily challenge),
 * not fabricated stats. Its own gradient glow, independent of `--landing-*`
 * (which stays zeroed under the dark theme on purpose everywhere else —
 * see globals.css) since this pair of screens was deliberately carved out
 * to break from Trace's flat rule.
 */
export function AuthShowcasePanel({ headline, subheadline }: AuthShowcasePanelProps) {
  return (
    <div className="relative hidden overflow-hidden border-l border-border/60 bg-bg-panel/40 lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-signal/20 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 size-[24rem] rounded-full bg-status-healthy/10 blur-[110px]"
      />

      <div className="relative max-w-md">
        <h2 className="text-3xl font-semibold leading-tight text-text">{headline}</h2>
        <p className="mt-3 text-base leading-relaxed text-text-muted">{subheadline}</p>

        <ul className="mt-10 flex flex-col gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-signal-soft text-signal">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
