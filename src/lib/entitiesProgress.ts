import { useSyncExternalStore } from "react";

/**
 * Client-side "opened this entity's page" tracking for `/entities` — same
 * `localStorage` + module-level cache + listener set + `useSyncExternalStore`
 * convention as `foundationsProgress.ts`, but a deliberately smaller concept:
 * "viewed," not "completed." The catalog has no natural read-order or
 * "current entity" (`EntitiesList`'s own doc comment), so unlike Foundations
 * there's no Continue/Start-Here card built on top of this — just a plain
 * "X/Y components viewed" count, and marked automatically on page view
 * (`EntityViewTracker`) rather than requiring an explicit "mark complete"
 * click the way a lesson does. Same stopgap framing as `foundationsProgress.ts`:
 * no accounts exist yet, this is superseded by server-side progress once the
 * real-backend pivot lands.
 */

const STORAGE_KEY = "engineering-studio:entities-progress";

const EMPTY_SLUGS: readonly string[] = [];

const listeners = new Set<() => void>();
let cache: string[] | null = null;

function isValid(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function read(): string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / storage disabled — progress just won't persist
    // across visits, same tradeoff `foundationsProgress.ts` already accepts.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getViewedEntitySlugs(): string[] {
  return read();
}

export function isEntityViewed(slug: string): boolean {
  return read().includes(slug);
}

/** Idempotent — safe to call on every mount of an entity's page, not just the first. */
export function markEntityViewed(slug: string): void {
  const current = read();
  if (current.includes(slug)) return;
  write([...current, slug]);
}

/** Reactive read for `EntitiesIndexView`'s progress card — rerenders on any `markEntityViewed` call, same tab or not. */
export function useEntitiesProgress(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY_SLUGS as string[]);
}
