import { createProgressStore } from "./createProgressStore";

/**
 * "Read this lesson" tracking for `/agentic`'s arcade map (`AgenticMap`,
 * Batman Mode only) and its `MarkCompleteButton` — see
 * `createProgressStore`'s own doc comment for the shared shape. No
 * locking exists on `/agentic` (browsing is always free, per
 * `AgenticLesson.number`'s own doc comment) — this only drives the map's
 * completed/green node styling.
 */
const store = createProgressStore("engineering-studio:agentic-progress");

export const getCompletedAgenticSlugs = store.getCompletedSlugs;
export const isAgenticLessonComplete = store.isComplete;
export const markAgenticLessonComplete = store.markComplete;
export const markAgenticLessonIncomplete = store.markIncomplete;
export const useAgenticProgress = store.useProgress;
