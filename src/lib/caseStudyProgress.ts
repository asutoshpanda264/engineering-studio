import { createProgressStore } from "./createProgressStore";

/**
 * "Read this case study" tracking for `/case-studies`' arcade map
 * (`CaseStudiesMap`, Batman Mode only) and its `MarkCompleteButton` — see
 * `createProgressStore`'s own doc comment for the shared shape. No
 * locking exists here (browsing is always free, same as every other
 * reading room) — this only drives the map's completed/green node
 * styling.
 */
const store = createProgressStore("engineering-studio:case-studies-progress");

export const getCompletedCaseStudySlugs = store.getCompletedSlugs;
export const isCaseStudyComplete = store.isComplete;
export const markCaseStudyComplete = store.markComplete;
export const markCaseStudyIncomplete = store.markIncomplete;
export const useCaseStudyProgress = store.useProgress;
