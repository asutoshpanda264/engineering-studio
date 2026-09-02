import { useSyncExternalStore } from "react";

const EMPTY_SLUGS: readonly string[] = [];

/**
 * Factory for a plain-`localStorage` "read this lesson" tracker — the
 * same module-level-cache + listener-set + `useSyncExternalStore` shape
 * `foundationsProgress.ts` established first, generalized so `/lld` and
 * `/agentic` (which need the same "mark complete" progress marker for
 * their own arcade maps, minus any locking — see the "batman-only arcade
 * maps" change) don't each hand-roll a second/third copy of this
 * boilerplate. `foundationsProgress.ts` itself stays its own file rather
 * than getting rebuilt on top of this — it also carries the (disabled but
 * kept-for-later) prerequisite-gating logic this factory has no concept
 * of, and the "map seen" reveal-diff bookkeeping neither `/lld` nor
 * `/agentic`'s simpler maps need.
 *
 * Same stopgap framing as `foundationsProgress.ts`: no accounts exist
 * yet, this is superseded by server-side progress once the real-backend
 * pivot lands, and the shape here stays a plain slug array so that
 * migration is a data-source swap, not a rewrite of every call site.
 */
export function createProgressStore(storageKey: string) {
  const listeners = new Set<() => void>();
  let cache: string[] | null = null;

  function isValid(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  }

  function read(): string[] {
    if (cache) return cache;
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      cache = isValid(parsed) ? parsed : [];
    } catch {
      // Corrupt JSON or storage disabled — start fresh rather than throw.
      cache = [];
    }
    return cache;
  }

  function write(next: string[]) {
    cache = next;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Private browsing / storage disabled — progress just won't persist
      // across visits.
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(onStoreChange: () => void) {
    listeners.add(onStoreChange);
    return () => listeners.delete(onStoreChange);
  }

  return {
    getCompletedSlugs(): string[] {
      return read();
    },
    isComplete(slug: string): boolean {
      return read().includes(slug);
    },
    markComplete(slug: string): void {
      const current = read();
      if (current.includes(slug)) return;
      write([...current, slug]);
    },
    /** Powers a "Mark complete" toggle re-clicking itself off — a reader correcting a mistaken click, not a feature anyone needs to reach for often. */
    markIncomplete(slug: string): void {
      const current = read();
      if (!current.includes(slug)) return;
      write(current.filter((item) => item !== slug));
    },
    /** Reactive read for components — rerenders on any markComplete/markIncomplete call, same tab or not. */
    useProgress(): string[] {
      return useSyncExternalStore(subscribe, read, () => EMPTY_SLUGS as string[]);
    },
  };
}
