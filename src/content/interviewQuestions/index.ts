import { AIRBNB_QUESTIONS } from "./companies/airbnb";
import { AMAZON_QUESTIONS } from "./companies/amazon";
import { APPLE_QUESTIONS } from "./companies/apple";
import { BLOOMBERG_QUESTIONS } from "./companies/bloomberg";
import { GOOGLE_QUESTIONS } from "./companies/google";
import { LINKEDIN_QUESTIONS } from "./companies/linkedin";
import { META_QUESTIONS } from "./companies/meta";
import { MICROSOFT_QUESTIONS } from "./companies/microsoft";
import { NETFLIX_QUESTIONS } from "./companies/netflix";
import { PAYPAL_QUESTIONS } from "./companies/paypal";
import { STRIPE_QUESTIONS } from "./companies/stripe";
import { TWITTER_QUESTIONS } from "./companies/twitter";
import { UBER_QUESTIONS } from "./companies/uber";
import type { InterviewQuestion, QuestionTag } from "./types";

export type {
  InterviewQuestion,
  QuestionSource,
  QuestionCategory,
  QuestionTag,
  OptimalAnswer,
  RelatedLink,
} from "./types";
export { QUESTION_CATEGORY_LABEL, QUESTION_TAG_LABEL } from "./types";

/**
 * Every sourced interview question, across every researched company. Add
 * a new `companies/<name>.ts` array and spread it in here as each company
 * finishes its research pass — see `docs/interview_exp.md` for the queue
 * and workflow.
 */
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  ...GOOGLE_QUESTIONS,
  ...META_QUESTIONS,
  ...AMAZON_QUESTIONS,
  ...MICROSOFT_QUESTIONS,
  ...APPLE_QUESTIONS,
  ...NETFLIX_QUESTIONS,
  ...UBER_QUESTIONS,
  ...AIRBNB_QUESTIONS,
  ...LINKEDIN_QUESTIONS,
  ...TWITTER_QUESTIONS,
  ...STRIPE_QUESTIONS,
  ...PAYPAL_QUESTIONS,
  ...BLOOMBERG_QUESTIONS,
];

export const INTERVIEW_QUESTION_COMPANIES: string[] = Array.from(
  new Set(INTERVIEW_QUESTIONS.map((q) => q.company)),
).sort();

/** Every topic tag actually used, so the filter UI never lists an empty tag. */
export const INTERVIEW_QUESTION_TAGS: QuestionTag[] = Array.from(
  new Set(INTERVIEW_QUESTIONS.flatMap((q) => q.tags)),
);

export function getInterviewQuestion(id: string): InterviewQuestion | undefined {
  return INTERVIEW_QUESTIONS.find((q) => q.id === id);
}

/** Other questions that share at least one topic tag with this one — the same underlying pattern, asked by a different company. */
export function getRelatedQuestions(question: InterviewQuestion): InterviewQuestion[] {
  return INTERVIEW_QUESTIONS.filter(
    (q) => q.id !== question.id && q.tags.some((t) => question.tags.includes(t)),
  );
}
