import type { LLDLesson } from "./types";
import { WHAT_IS_LLD } from "./lessons/01-what-is-lld";
import { OOP_FUNDAMENTALS } from "./lessons/02-oop-fundamentals";
import { SOLID_PRINCIPLES } from "./lessons/03-solid-principles";
import { UML_CLASS_DIAGRAMS } from "./lessons/04-uml-class-diagrams";
import { LLD_INTERVIEW_APPROACH } from "./lessons/05-lld-interview-approach";
import { CREATIONAL_PATTERNS } from "./lessons/06-creational-patterns";
import { STRUCTURAL_PATTERNS } from "./lessons/07-structural-patterns";
import { BEHAVIORAL_PATTERNS } from "./lessons/08-behavioral-patterns";
import { PARKING_LOT } from "./lessons/09-parking-lot";
import { ELEVATOR_SYSTEM } from "./lessons/10-elevator-system";
import { TIC_TAC_TOE } from "./lessons/11-tic-tac-toe";
import { LRU_CACHE } from "./lessons/12-lru-cache";
import { SPLITWISE } from "./lessons/13-splitwise";
import { MOVIE_TICKET_BOOKING } from "./lessons/14-movie-ticket-booking";
import { RATE_LIMITER } from "./lessons/15-rate-limiter";

export type { LLDLesson, LLDCategory, LessonBlock, LessonExercise, LessonSection } from "./types";
export { LLD_CATEGORY_LABEL } from "./types";

/**
 * Every LLD lesson, in course order. `number` on each lesson is the source
 * of truth for ordering — this array's own order must match it (the
 * validator test checks this) since prev/next nav reads straight off array
 * position, same discipline `foundations/index.ts` already established.
 *
 * All 15 lessons complete: Fundamentals (1-5), Design Patterns (6-8),
 * Case Studies (9-15 — Parking Lot, Elevator System, Tic-Tac-Toe, LRU
 * Cache, Splitwise, Movie Ticket Booking, Rate Limiter).
 */
export const LLD_LESSONS: LLDLesson[] = [
  WHAT_IS_LLD,
  OOP_FUNDAMENTALS,
  SOLID_PRINCIPLES,
  UML_CLASS_DIAGRAMS,
  LLD_INTERVIEW_APPROACH,
  CREATIONAL_PATTERNS,
  STRUCTURAL_PATTERNS,
  BEHAVIORAL_PATTERNS,
  PARKING_LOT,
  ELEVATOR_SYSTEM,
  TIC_TAC_TOE,
  LRU_CACHE,
  SPLITWISE,
  MOVIE_TICKET_BOOKING,
  RATE_LIMITER,
];

export function getLLDLesson(slug: string): LLDLesson | undefined {
  return LLD_LESSONS.find((lesson) => lesson.slug === slug);
}
