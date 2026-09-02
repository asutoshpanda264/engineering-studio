import { useSyncExternalStore } from "react";

/**
 * On/off state for the `/foundations` map's cave torch (Batman Mode only
 * — see `FoundationsMap`'s `cave` flag) — whether locked lessons render as
 * true darkness with the reader's cursor as a small revealing light, versus
 * their normal dim-but-visible look. Same module-level-cache +
 * listener-set + `useSyncExternalStore` convention as `foundationsProgress.ts`/
 * `lockInMode.ts`, persisted for the same reason `lockInMode.ts` gives:
 * flipping the torch on is a deliberate choice, and a page refresh (or
 * leaving the map and coming back) shouldn't silently drop it.
 */

const STORAGE_KEY = "engineering-studio:foundations-torch";

const listeners = new Set<() => void>();
let cache: boolean | null = null;

function read(): boolean {
  if (cache !== null) return cache;
  if (typeof window === "undefined") return false;
  try {
    cache = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private browsing / storage disabled — default to off.
    cache = false;
  }
  return cache;
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function setTorchOn(on: boolean): void {
  cache = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Same tradeoff as every other store here — the toggle still works
    // for this session, it just won't persist to the next visit.
  }
  listeners.forEach((listener) => listener());
}

/** Reactive read — `false` on the server and on first client paint (no
 *  `localStorage` during SSR), same hydration contract as `useFoundationsProgress`:
 *  a returning reader with the torch saved on sees it self-correct to `true`
 *  a moment after mount rather than the app trying to read storage during SSR. */
export function useTorchMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
