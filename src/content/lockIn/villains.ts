/**
 * Content for "Batman Mode" lock-in — see `src/lib/lockInMode.ts` for the
 * state machine this drives. No curated trilogy anymore (that version —
 * one fixed 3-lesson bundle, only startable from its own chapter 1 — was
 * reworked after real use turned up two problems: it wasn't available
 * from most lessons, and getting off-track left no way back to a working
 * "Defeat" action; see conversation for the full story). A run can now
 * start from *any* lesson: chapters 2 and 3 are just whatever comes next
 * in that lesson's own course sequence — see `resolveLockInChapters`.
 *
 * The 3 villains are a fixed, reusable pack rather than tied to specific
 * lesson content, since which 3 lessons make up a run is now dynamic.
 * Order mirrors the Nolan trilogy's own structure (Begins → The Dark
 * Knight → The Dark Knight Rises), which is also why the taunts escalate
 * in tone chapter to chapter even though they no longer reference any
 * particular lesson's material.
 */

export type LockInLessonRef =
  | { readonly courseModule: "foundations"; readonly slug: string }
  | { readonly courseModule: "lld"; readonly slug: string };

export interface LockInVillain {
  readonly id: string;
  readonly name: string;
  readonly epithet: string;
  /** Shown when the chapter opens, before the student has read anything. */
  readonly taunt: string;
  /** Shown as a recap on the next chapter (or the victory screen for chapter 3), since the defeat itself happens on the page being left. */
  readonly defeatLine: string;
}

export const VILLAIN_SEQUENCE: readonly [LockInVillain, LockInVillain, LockInVillain] = [
  {
    id: "ras-al-ghul",
    name: "Ra's al Ghul",
    epithet: "The Demon's Head",
    taunt:
      "Every discipline starts the same way — with something you'd rather skip. Prove you didn't skip this one.",
    defeatLine: "Ra's al Ghul falls. The foundation holds.",
  },
  {
    id: "joker",
    name: "The Joker",
    epithet: "The Clown Prince of Crime",
    taunt:
      "You made it past the easy part. Now let's see if you actually get the joke, or just laughed along.",
    defeatLine: "The Joker's chaos meets a mind that was actually paying attention.",
  },
  {
    id: "bane",
    name: "Bane",
    epithet: "The Man Who Broke the Bat",
    taunt:
      "Anyone can nod along to a lesson when nothing's asked of them. I want proof it stuck — under real pressure. Let's see if the knowledge breaks first, or you do.",
    defeatLine: "Bane falls. Not by strength, but by three lessons that actually stuck.",
  },
];

export function villainForChapter(chapterIndex: 0 | 1 | 2): LockInVillain {
  return VILLAIN_SEQUENCE[chapterIndex];
}

export function lessonHref(lesson: LockInLessonRef): string {
  return `/${lesson.courseModule}/${lesson.slug}`;
}
