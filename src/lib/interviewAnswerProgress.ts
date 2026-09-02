import { useSyncExternalStore } from "react";

/**
 * Client-side "did I work through this interview question" tracking —
 * same shape and reasoning as `problemProgress.ts` (module-level cache +
 * listener set + `useSyncExternalStore`, `localStorage` only, no
 * accounts yet). Just a done/not-done toggle: there's no grader here,
 * and no in-app writing surface either — you work the question out on
 * paper/a whiteboard and mark it when you're done.
 */

export type AnswerStatus = "unattempted" | "answered";

export interface AnswerEntry {
  markedComplete: boolean;
  lastEditedAt: number;
}

export type AnswerProgress = Record<string, AnswerEntry | undefined>;

const STORAGE_KEY = "engineering-studio:interview-answer-progress";

const listeners = new Set<() => void>();
let cache: AnswerProgress | null = null;

function read(): AnswerProgress {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as AnswerProgress) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: AnswerProgress) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / storage disabled — the toggle just won't persist.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

const EMPTY_PROGRESS: AnswerProgress = {};

export function getAnswerStatus(questionId: string): AnswerStatus {
  const entry = read()[questionId];
  return entry?.markedComplete ? "answered" : "unattempted";
}

export function setAnswerComplete(questionId: string, markedComplete: boolean): void {
  const current = read();
  write({
    ...current,
    [questionId]: {
      markedComplete,
      lastEditedAt: Date.now(),
    },
  });
}

/** Reactive read for components (e.g. the `/interview-questions` list) — rerenders on any toggle, same tab or not. */
export function useAnswerProgress(): AnswerProgress {
  return useSyncExternalStore(subscribe, read, () => EMPTY_PROGRESS);
}
