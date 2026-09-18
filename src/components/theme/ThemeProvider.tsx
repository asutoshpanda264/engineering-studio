"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { getLockInState } from "@/lib/lockInMode";

export type Theme = "dark" | "light" | "night-ops";

// Order the toggle cycles through. "light" (Paper) and "night-ops" are both
// PREVIEW themes (see globals.css) — dark ships as the default, so this
// cycles default -> Paper -> Night Ops -> default.
const THEME_CYCLE: readonly Theme[] = ["dark", "light", "night-ops"];

const STORAGE_KEY = "theme";

const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "night-ops" || attr === "light" ? attr : "dark";
}

// SSR has no `document` and no saved preference to read — "dark" matches
// the no-attribute default both `globals.css` and the blocking script in
// layout.tsx assume, so this is also what a first client render must
// return (React requires client and server snapshots to agree on the very
// first pass). `useSyncExternalStore` then reconciles automatically against
// the real snapshot right after hydration — no manual effect/setState
// needed, and nothing to flash: the CSS theme itself already switched the
// instant the blocking script ran, well before this ever runs. Only a
// theme-dependent icon (see ThemeToggle) can lag a frame behind that.
function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function applyThemeAttribute(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function setTheme(theme: Theme) {
  applyThemeAttribute(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing / storage disabled — the toggle still works for
    // this session, it just won't persist across visits.
  }
  listeners.forEach((listener) => listener());
}

interface ThemeContextValue {
  theme: Theme;
  /** The value react-flow's `colorMode` prop expects — "light" under Paper,
   *  "dark" everywhere else (including night-ops, which is its own darker
   *  theme, not a third canvas mode react-flow needs to know about). Kept
   *  as its own field rather than passing `theme` straight through so
   *  canvas consumers don't need their own `theme === "light" ? ... :
   *  ...` and so a future theme doesn't silently need a matching
   *  react-flow mode of its own. React Flow's built-in node/handle/
   *  minimap/selection defaults only matter for whatever we don't
   *  already override with our own tokens (`ComponentNode`/`ClassNode`,
   *  `AnimatedEdge`/`RelationshipEdge`, `ArchitectureCanvas`/
   *  `DiagramCanvas`'s `Background`/`Controls`) — all of those were
   *  already built fully token-driven with no hardcoded-dark literals,
   *  so flipping this was the one remaining piece, not a redesign. */
  colorMode: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Wraps the whole app (see layout.tsx). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Cross-tab sync: `setTheme` above only notifies this tab's own
  // `listeners`, so a theme change made in another tab never reached an
  // already-open tab (its `data-theme` attribute and React state both
  // just sat stale) — only a fresh page load re-read `localStorage`. The
  // browser's own `storage` event fires in every *other* tab the instant
  // one tab's `localStorage.setItem` runs, which is exactly what's needed
  // here; it deliberately never fires in the tab that made the change, so
  // this can't double-apply a theme that tab already set directly.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      const next: Theme =
        event.newValue === "night-ops" || event.newValue === "light" ? event.newValue : "dark";
      // Same lock-in guard `toggleTheme` applies — a Batman Mode run
      // active in this tab must survive a theme change made elsewhere,
      // same as it survives this tab's own toggle click.
      if (getSnapshot() === "night-ops" && next !== "night-ops" && getLockInState().active) return;
      applyThemeAttribute(next);
      listeners.forEach((listener) => listener());
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    // Batman Mode's whole point is committing to night-ops for the run
    // (see lockInMode.ts) — enforced here, centrally, rather than by
    // hiding the toggle per-page. `LockInHeaderNav` only wraps the
    // `/foundations/[slug]` and `/lld/[slug]` headers; every other route
    // (`/workshop`, `/entities/*`, `/learn`, the landing page, ...) renders
    // a plain `<ThemeToggle />`, so a page-level hide alone left the
    // browser Back button (or any of those routes) a one-click way out of
    // night-ops mid-run. Gating the actual state transition closes that
    // regardless of which page the toggle is clicked from.
    if (theme === "night-ops" && getLockInState().active) return;
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, colorMode: theme === "light" ? ("light" as const) : ("dark" as const), toggleTheme }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
