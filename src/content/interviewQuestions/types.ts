/**
 * A company-tagged interview question, sourced from a real, linkable
 * report (candidate post, question database, prep-guide) — never
 * invented or presented as a verbatim leak we can't back up. See
 * `docs/interview_exp.md` for the research process and the raw research
 * log each company's entries are drawn from.
 */

/** Where this question was pulled from — every question must cite one. */
export interface QuestionSource {
  /** Human-readable source name, e.g. "Exponent question DB", "LeetCode Discuss", "Blind". */
  name: string;
  url: string;
  /**
   * Approximate, human-readable reporting date (e.g. "~Aug 2026", "Jun 2020").
   * Sources like a rolling question DB only give a relative age ("N ago")
   * at fetch time — keep that imprecision visible rather than inventing
   * a false-precision date.
   */
  reportedDate?: string;
  /**
   * "high" — the source page was read in full and the text confirmed.
   * "medium" — came via a search-index snippet, or a page read that
   * didn't fully confirm exact wording. Never ship "low"/unverified
   * questions into this module — leave those in the tracker doc instead.
   */
  confidence: "high" | "medium";
  /** Extra caveat about the source, if any (e.g. "snippet only, direct fetch blocked"). */
  note?: string;
}

export type QuestionCategory =
  | "system-design"
  | "ml-ai-system-design"
  | "lld-ood"
  | "fde-agentic"
  | "scenario-operational";

export const QUESTION_CATEGORY_LABEL: Record<QuestionCategory, string> = {
  "system-design": "System Design",
  "ml-ai-system-design": "ML / AI System Design",
  "lld-ood": "LLD / OOD",
  "fde-agentic": "FDE / Agentic",
  "scenario-operational": "Scenario / Operational",
};

/**
 * Cross-company topic tags. `category` buckets a question by its round
 * format (system-design vs. LLD vs. behavioral); `tags` buckets it by
 * the underlying pattern being tested, which is what actually repeats
 * across companies — e.g. Google's, PayPal's, and Meta's ticketing
 * prompts are three differently-scoped, independently-sourced questions
 * (different constraints, different candidates, different interviewers),
 * so they stay three entries rather than being collapsed into one — but
 * they're all drilling "inventory contention under concurrent demand,"
 * so they all carry `ticketing-inventory` and the app can show them as
 * one filtered group. A question can carry more than one tag when it
 * genuinely spans two patterns (e.g. a messaging fanout question).
 */
export type QuestionTag =
  | "payments-idempotency"
  | "fanout-feed"
  | "messaging-chat"
  | "ticketing-inventory"
  | "notifications"
  | "file-system-lld"
  | "personalization-history"
  | "experimentation"
  | "capacity-scaling"
  | "behavioral"
  | "chess-lld"
  | "rules-engine-lld"
  | "caching"
  | "ota-rollout"
  | "ai-ml-infra"
  | "multi-region-failover"
  | "incident-response"
  | "top-k-streaming"
  | "metrics-observability"
  | "iot-integration"
  | "data-migration"
  | "lld-coding-exercise"
  | "search-indexing"
  | "auth-secrets"
  | "workflow-crud-system"
  | "media-storage"
  | "geospatial-tracking"
  | "social-graph"
  | "web-crawling"
  | "recommendation-ranking"
  | "parking-lot-lld"
  | "abuse-content-moderation";

export const QUESTION_TAG_LABEL: Record<QuestionTag, string> = {
  "payments-idempotency": "Payments & Idempotency",
  "fanout-feed": "Fan-out & Feed Delivery",
  "messaging-chat": "Messaging & Real-Time Chat",
  "ticketing-inventory": "Ticketing & Inventory Contention",
  notifications: "Notification Systems",
  "file-system-lld": "File System (LLD)",
  "personalization-history": "Personalization & History",
  experimentation: "A/B Testing & Experimentation",
  "capacity-scaling": "Capacity & Traffic Scaling",
  behavioral: "Behavioral / Non-Technical",
  "chess-lld": "Chess (LLD)",
  "rules-engine-lld": "Rules Engines (LLD)",
  caching: "Caching & Eviction",
  "ota-rollout": "OTA Updates & Fleet Rollout",
  "ai-ml-infra": "AI/ML System Design",
  "multi-region-failover": "Multi-Region & Failover",
  "incident-response": "Incident Response",
  "top-k-streaming": "Top-K & Streaming Aggregation",
  "metrics-observability": "Metrics & Observability",
  "iot-integration": "IoT & Device Integration",
  "data-migration": "Data / System Migration",
  "lld-coding-exercise": "Pure LLD Coding Exercise",
  "search-indexing": "Search & Indexing",
  "auth-secrets": "Auth, Secrets & Access Control",
  "workflow-crud-system": "Workflow / CRUD System Design",
  "media-storage": "Media Storage & Sync",
  "geospatial-tracking": "Geospatial & Location Tracking",
  "social-graph": "Social Graph",
  "web-crawling": "Web Crawling",
  "recommendation-ranking": "Recommendation & Ranking",
  "parking-lot-lld": "Parking Lot (LLD)",
  "abuse-content-moderation": "Abuse Prevention & Content Moderation",
};

/** A pointer into this app's own content — Foundations, LLD, or a buildable Workshop scenario. */
export interface RelatedLink {
  label: string;
  href: string;
}

/**
 * A worked answer outline — not a transcript to memorize, the shape a
 * strong candidate's answer actually takes: clarify scope, lock in
 * requirements, state the approach, walk the key design decisions, then
 * defend the trade-offs and likely follow-ups. Kept as separate labeled
 * fields (not one prose block) so the UI can render it as scannable
 * sections, same reasoning as `LessonExercise.guidance` in
 * `src/content/shared/lesson.ts` using `LessonBlock[]` instead of a wall
 * of text — this is deliberately a lighter, answer-specific shape rather
 * than reusing that block system, since an interview answer isn't a
 * lesson section.
 */
export interface OptimalAnswer {
  /** What a strong candidate asks before designing anything — not asked of a real interviewer here, just what to think through. */
  clarifyingQuestions?: string[];
  /** The functional + non-functional requirements a strong answer locks in, from the prompt plus (assumed) clarifying answers. */
  requirements: string[];
  /** One short paragraph framing the overall strategy before the detailed points. */
  approach: string;
  /** The core design decisions, in the order a strong answer would present them. */
  keyPoints: string[];
  /** Alternatives considered and why this approach wins — the part interviewers actually probe. */
  tradeoffs?: string[];
  /** Where a sharp interviewer pushes next. */
  followUps?: string[];
  /** Where to go build/simulate/read more, if this pattern is covered elsewhere in the app. */
  relatedLinks?: RelatedLink[];
}

export interface InterviewQuestion {
  /** Stable, unique, kebab-case id — e.g. "google-translation-service". */
  id: string;
  company: string;
  title: string;
  /** The question as reported — as close to verbatim as the source allows. */
  prompt: string;
  category: QuestionCategory;
  /**
   * The underlying pattern(s) this question drills, shared across
   * companies — see the `QuestionTag` doc comment. At least one tag.
   */
  tags: QuestionTag[];
  /** Reported level/role, if known, e.g. "L4/L5", "Senior+ SWE", "ML Engineer". */
  level?: string;
  source: QuestionSource;
  /**
   * Extra context worth surfacing — follow-up asked, capacity numbers
   * given, why the question is notable. Not an answer outline (that's
   * `optimalAnswer`) — just what a candidate would have been told or
   * asked next, as reported.
   */
  context?: string;
  /** A worked answer outline, revealed on click rather than shown upfront (see `AnswerWorkspace`/the detail page). Optional — not every question has one authored yet. */
  optimalAnswer?: OptimalAnswer;
}
