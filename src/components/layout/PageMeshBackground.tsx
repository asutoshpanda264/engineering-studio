import { SystemMeshBackground } from "@/components/learn/SystemMeshBackground";

/**
 * The shared "abstract background" — a scrolling dot-grid texture plus a
 * fixed `SystemMeshBackground` graph (with its traveling packet) pinned to
 * the viewport, at full strength in both themes. One shared component so
 * every page gets the exact same treatment — previously each page
 * re-derived this by hand and drifted apart: `/problems` dimmed the mesh
 * to 35% opacity and hid it entirely in light mode, `/login`, `/register`,
 * `/leaderboard`, `/daily-challenge`, `/progress`, `/contribute`, and
 * `/admin` never had it at all. Direct feedback: the moving dot read as
 * "very dim" where it existed and was simply missing everywhere else —
 * this is the fix, applied uniformly. Matches the full-strength treatment
 * `HomeView`/`LearnHubView` already used, rather than inventing a third
 * intensity.
 *
 * Deliberately NOT used by the four reading rooms (`/foundations`, `/lld`,
 * `/case-studies`, `/agentic`) — their light-mode "Journey" view omits
 * this background entirely on purpose (direct feedback that a graph-paper
 * texture behind bordered/shadowed white cards read as cluttered), a
 * different, already-settled design decision this component isn't meant
 * to override.
 *
 * Caller's `<main>` needs `relative isolate` for these `-z-20` layers to
 * stay trapped behind its own content instead of escaping to the document
 * root — see any existing caller (e.g. `problems/page.tsx`) for the shape.
 */
export function PageMeshBackground({ isLight }: { isLight: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className={`bg-blueprint-grid pointer-events-none absolute inset-0 -z-20 ${isLight ? "opacity-60" : "opacity-70"}`}
      />
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-20 h-screen overflow-hidden">
        <SystemMeshBackground />
      </div>
    </>
  );
}
