import type { FoundationLesson } from "./types";
import { WHAT_IS_SYSTEM_DESIGN } from "./lessons/01-what-is-system-design";
import { HOW_THE_INTERNET_WORKS } from "./lessons/02-how-the-internet-works";
import { BROWSER_REQUEST_LIFECYCLE } from "./lessons/03-browser-request-lifecycle";
import { CLIENT_SERVER_ARCHITECTURE } from "./lessons/04-client-server-architecture";
import { DNS_DEEP_DIVE } from "./lessons/05-dns-deep-dive";
import { HTTP_AND_HTTPS } from "./lessons/06-http-and-https";
import { REST_APIS } from "./lessons/07-rest-apis";
import { DATABASES_THE_BIG_PICTURE } from "./lessons/08-databases-the-big-picture";
import { SQL_DEEP_DIVE } from "./lessons/09-sql-deep-dive";
import { NOSQL_DEEP_DIVE } from "./lessons/10-nosql-deep-dive";
import { DATABASE_INDEXING_DEEP_DIVE } from "./lessons/11-database-indexing-deep-dive";
import { VERTICAL_VS_HORIZONTAL_SCALING } from "./lessons/12-vertical-vs-horizontal-scaling";
import { LOAD_BALANCERS } from "./lessons/13-load-balancers";
import { CACHING } from "./lessons/14-caching";
import { REDIS_DEEP_DIVE } from "./lessons/15-redis-deep-dive";
import { MESSAGE_QUEUES } from "./lessons/16-message-queues";
import { KAFKA_DEEP_DIVE } from "./lessons/17-kafka-deep-dive";
import { CDN } from "./lessons/18-cdn";
import { CONSISTENT_HASHING } from "./lessons/19-consistent-hashing";
import { ESTIMATION_AND_INTERVIEW_FRAMEWORK } from "./lessons/20-estimation-and-interview-framework";

export type { FoundationLesson, LessonBlock, LessonExercise, LessonSection } from "./types";

/**
 * Every Foundations lesson, in course order. `number` on each lesson is the
 * source of truth for ordering — this array's own order must match it (the
 * validator test checks this) since prev/next nav and the index page both
 * read straight off array position.
 */
export const FOUNDATION_LESSONS: FoundationLesson[] = [
  WHAT_IS_SYSTEM_DESIGN,
  HOW_THE_INTERNET_WORKS,
  BROWSER_REQUEST_LIFECYCLE,
  CLIENT_SERVER_ARCHITECTURE,
  DNS_DEEP_DIVE,
  HTTP_AND_HTTPS,
  REST_APIS,
  DATABASES_THE_BIG_PICTURE,
  SQL_DEEP_DIVE,
  NOSQL_DEEP_DIVE,
  DATABASE_INDEXING_DEEP_DIVE,
  VERTICAL_VS_HORIZONTAL_SCALING,
  LOAD_BALANCERS,
  CACHING,
  REDIS_DEEP_DIVE,
  MESSAGE_QUEUES,
  KAFKA_DEEP_DIVE,
  CDN,
  CONSISTENT_HASHING,
  ESTIMATION_AND_INTERVIEW_FRAMEWORK,
];

export function getFoundationLesson(slug: string): FoundationLesson | undefined {
  return FOUNDATION_LESSONS.find((lesson) => lesson.slug === slug);
}

/**
 * The reverse of `relatedEntitySlugs`: every Foundations lesson whose
 * `relatedEntitySlugs` names this `/entities/[slug]` page — powers the
 * "Read the theory" cross-link on the entity deep-dive page, the missing
 * direction of the link Foundations lessons already have via their own
 * "See this simulated in the Workshop" card.
 */
export function getFoundationLessonsForEntitySlug(entitySlug: string): FoundationLesson[] {
  return FOUNDATION_LESSONS.filter((lesson) => lesson.relatedEntitySlugs?.includes(entitySlug));
}
