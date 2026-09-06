import { HomeView } from "./HomeView";

/**
 * The landing page. A server component purely as a thin wrapper — no
 * `metadata` export of its own (the root layout's already matches: same
 * title/description) — the actual body is `HomeView` (a client component,
 * needs `useTheme()` to pick the right `trackAccent` palette for the
 * process-step and scenario-card icon chips), same split every other
 * index page (`/learn`, `/foundations`, `/agentic`, ...) already uses. See
 * `HomeView`'s own doc comment for what changed and why.
 */
export default function Home() {
  return <HomeView />;
}
