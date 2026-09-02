import type { FoundationLesson } from "./types";

/**
 * Display-only grouping of the 24 Foundations lessons into five named
 * tracks — purely a `/foundations` index-page concern (which is why this
 * lives next to `index.ts` instead of on `FoundationLesson` itself: no
 * lesson file, `number`, or `prerequisites` chain changes because of this).
 * Exists so the index page can read as an intentional curriculum with a
 * beginning, a middle, and a capstone, instead of one flat 24-card grid —
 * `number` ranges are inclusive and must partition `FOUNDATION_LESSONS`
 * exactly (every lesson in exactly one track, in course order) — kept in
 * sync by hand when lessons are added, checked by
 * `__tests__/content.test.ts`'s `FOUNDATION_TRACKS` suite rather than
 * trusted silently.
 */
export interface FoundationTrack {
  title: string;
  description: string;
  /** Inclusive [first, last] `FoundationLesson.number` this track covers. */
  range: readonly [number, number];
}

export const FOUNDATION_TRACKS: readonly FoundationTrack[] = [
  {
    title: "Internet & Web Fundamentals",
    description: "How a request actually gets from a browser to a server and back.",
    range: [1, 7],
  },
  {
    title: "Data & Storage",
    description: "Where state lives, and the trade-offs baked into every place you could put it.",
    range: [8, 11],
  },
  {
    title: "Scale & Performance",
    description: "Spreading load, caching hot paths, and moving data before anyone asks for it.",
    range: [12, 18],
  },
  {
    title: "Distributed Systems Patterns",
    description: "The hard problems — partitioning, replication, and staying up when a piece of it fails.",
    range: [19, 23],
  },
  {
    title: "Interview Framework",
    description: "Turning all of the above into a structured answer under time pressure.",
    range: [24, 24],
  },
];

export interface FoundationTrackGroup {
  track: FoundationTrack;
  lessons: FoundationLesson[];
}

/** Buckets `lessons` (assumed already in course order) into `FOUNDATION_TRACKS`, preserving order both across and within tracks. */
export function groupLessonsByTrack(lessons: readonly FoundationLesson[]): FoundationTrackGroup[] {
  return FOUNDATION_TRACKS.map((track) => ({
    track,
    lessons: lessons.filter((lesson) => lesson.number >= track.range[0] && lesson.number <= track.range[1]),
  }));
}
