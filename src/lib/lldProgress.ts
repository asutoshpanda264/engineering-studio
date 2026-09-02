import { createProgressStore } from "./createProgressStore";

/**
 * "Read this lesson" tracking for `/lld`'s arcade map (`LLDMap`, Batman
 * Mode only) and its `MarkCompleteButton` — see `createProgressStore`'s
 * own doc comment for the shared shape. No locking exists on `/lld`
 * (browsing is always free, per `LLDLesson.number`'s own doc comment) —
 * this only drives the map's completed/green node styling.
 */
const store = createProgressStore("engineering-studio:lld-progress");

export const getCompletedLLDSlugs = store.getCompletedSlugs;
export const isLLDLessonComplete = store.isComplete;
export const markLLDLessonComplete = store.markComplete;
export const markLLDLessonIncomplete = store.markIncomplete;
export const useLLDProgress = store.useProgress;
