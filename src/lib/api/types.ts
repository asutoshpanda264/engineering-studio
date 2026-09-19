/**
 * Types mirroring the backend's actual response/request shapes
 * (`engineering-studio-backend/api`, `com.engineeringstudio.api.*`) —
 * field-for-field, so a shape drift on either side is a compile error
 * here, not a silent runtime mismatch. Kept in this one file rather than
 * scattered per-caller, the same reasoning `@/scenarios/types` already
 * follows for the frontend's own local content types.
 */

export type Role = "USER" | "CONTRIBUTOR" | "ADMIN";

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  currentStreak: number;
  longestStreak: number;
  /** ISO date (yyyy-MM-dd), or null if never solved a daily challenge. */
  lastSolveDate: string | null;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

/** The one error shape every backend error response takes — see `common.error.ApiError`. */
export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  fieldErrors: Record<string, string>;
}

// --- attempts (Frontend Integration, Increment 2) ---

/**
 * TIMED is the only mode this frontend actually creates attempts for so
 * far — mapped onto the Workshop's existing "Timed Challenge" feature
 * (`workshopStore.ts`'s `timedModeStartedAt`). NO_PRESSURE exists on the
 * backend (practice mode, still tracked, excluded from every
 * leaderboard) but isn't wired up yet — see
 * masterdoc/phase-frontend-integration/decisions.md.
 */
export type AttemptMode = "TIMED" | "NO_PRESSURE";

export type AttemptStatus = "IN_PROGRESS" | "PAUSED" | "SUBMITTED" | "VERIFY_FAILED" | "EXPIRED";

export interface StartAttemptRequest {
  scenarioId: string;
  mode: AttemptMode;
}

export interface AttemptResponse {
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  mode: AttemptMode;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  totalPausedSeconds: number;
  elapsedSeconds: number | null;
  verifyMetrics: Record<string, unknown> | null;
  verifyEvaluation: Record<string, unknown> | null;
  verifyScore: Record<string, unknown> | null;
}

/**
 * What `POST /attempts/{id}/submit` expects for `graph` — {nodes,
 * connections}, field-for-field the same shape
 * `engineering-studio-backend/verify/src/graphAdapter.ts`'s `ClientGraph`
 * already documents receiving from "the frontend's own Workshop canvas."
 * `@/lib/workshopSubmission.ts` is what actually builds one of these from
 * live `ArchitectureNode[]`/`ArchitectureEdge[]` canvas state.
 */
export interface ClientEntity {
  id: string;
  type: string;
  position?: { x: number; y: number };
  config?: Record<string, unknown>;
}

export interface ClientConnection {
  source: string;
  target: string;
  latencyMs?: number;
  protocol?: string;
}

export interface ClientGraph {
  nodes: ClientEntity[];
  connections: ClientConnection[];
}

export interface SubmitAttemptRequest {
  graph: ClientGraph;
}

// --- leaderboards + daily challenge (Frontend Integration, Increment 3) ---

/**
 * The URL slug form (`GET /leaderboards/{type}`) — matches
 * `LeaderboardType.slug()` on the backend exactly.
 * `most-solved`/`best-solved` are plain counts/point totals;
 * `fastest-solved`'s score is a speed FACTOR (bigger = faster), not raw
 * seconds — see `LeaderboardType`'s own Javadoc for why. NO_PRESSURE
 * solves never appear on any of these three.
 */
export type LeaderboardType = "most-solved" | "best-solved" | "fastest-solved";

/** One ranked row. `rank` is 1-based. */
export interface LeaderboardEntryResponse {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
}

/** `ranked: false` (rank/score both null) is normal — not an error — for a user with no leaderboard-eligible TIMED solve yet. */
export interface MyLeaderboardStandingResponse {
  type: LeaderboardType;
  ranked: boolean;
  rank: number | null;
  score: number | null;
}

export type DailyChallengeAssignedBy = "AUTO" | "ADMIN";

export interface DailyChallengeResponse {
  challengeDate: string;
  scenarioId: string;
  scenarioTitle: string;
  difficulty: number;
  assignedBy: DailyChallengeAssignedBy;
}

/** Streak numbers themselves live on `UserResponse` (`GET /me`) — this is just "did I already complete today's." */
export interface MyDailyChallengeStandingResponse {
  challengeDate: string;
  completedToday: boolean;
}

export interface DailyChallengeCompletionResponse {
  challengeDate: string;
  scenarioId: string;
  mode: AttemptMode;
  completedAt: string;
}

// --- progress history (Frontend Integration, Increment 6) ---

/**
 * ATTEMPTED: at least one server-verified submit, none passed yet.
 * SOLVED: at least one did — a row never reverts to ATTEMPTED afterward
 * (upgrade-only `best_*`, see `phase-5-points-and-progress/decisions.md`
 * in the backend repo). A scenario with no server-tracked submit at all
 * simply has no row — `GET /progress/scenarios` never returns an
 * "unattempted" entry.
 */
export type ProblemProgressStatus = "ATTEMPTED" | "SOLVED";

/**
 * `GET /progress/scenarios` (list) / `GET /progress/scenarios/{id}`
 * (single) — self-only, authenticated-only (no guest/public variant
 * exists on the backend, unlike leaderboards/daily-challenge). Carries
 * no `scenarioTitle`/`difficulty` of its own — the frontend looks those
 * up from `@/scenarios` via `scenarioId`, same as every other page here.
 * `bestPoints`/`bestComposite`/`bestSpeedFactor` only ever reflect a
 * TIMED submit (NO_PRESSURE contributes 0 points and never upgrades
 * these) — see `phase-5-points-and-progress/explain_points.md`.
 */
export interface ProblemProgressResponse {
  scenarioId: string;
  status: ProblemProgressStatus;
  bestStars: number;
  bestPoints: number;
  bestComposite: number | null;
  bestSpeedFactor: number | null;
  firstSolvedAt: string | null;
  lastAttemptAt: string;
}

// --- contributions (Sept 18 nav plan, Phase B) ---

/** One generic contribution type with a category, not three separate DTOs — mirrors the backend's `ContributionCategory`. */
export type ContributionCategory = "QUESTION" | "POST" | "VLOG";

/** PENDING/APPROVED/REJECTED are all terminal except PENDING — mirrors `ContributionStatus`. */
export type ContributionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ContributionRequest {
  category: ContributionCategory;
  title: string;
  body: string;
  /** Optional — mainly for VLOG, where the content lives at an external URL. */
  link: string | null;
}

export interface ContributionResponse {
  id: string;
  contributorId: string;
  category: ContributionCategory;
  title: string;
  body: string;
  link: string | null;
  status: ContributionStatus;
  pointsAwarded: number;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One row of the admin queue — a pending contribution plus its submitter's total approved-contribution points, the queue's sort key. */
export interface PendingContributionResponse {
  contribution: ContributionResponse;
  contributorApprovedPoints: number;
}

// --- bug reports (Sept 18 nav plan, Phase C) ---

/** RESOLVED is the only status that sets `resolvedAt` — mirrors `BugReportStatus`. */
export type BugReportStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface BugReportRequest {
  description: string;
  /** The current route — auto-captured by the reporting UI, not typed in. */
  route: string;
  /** `navigator.userAgent` — auto-captured by the reporting UI, not typed in. */
  userAgent: string;
}

export interface BugReportReviewRequest {
  status: BugReportStatus;
  adminNote: string | null;
}

export interface BugReportResponse {
  id: string;
  reporterId: string;
  description: string;
  route: string;
  userAgent: string;
  status: BugReportStatus;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- contributor applications (2026-09-19 chat) ---

/** APPROVED flips the applicant's `role` to CONTRIBUTOR server-side — mirrors `ContributorApplicationStatus`. */
export type ContributorApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ContributorApplicationResponse {
  id: string;
  applicantId: string;
  status: ContributorApplicationStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * One row of the admin's top-5 view — the application plus the exact
 * stats that produced its `priorityScore` (solved count, total points,
 * daily streak), so the ranking isn't a trust-me number.
 */
export interface TopContributorApplicationResponse {
  application: ContributorApplicationResponse;
  applicantDisplayName: string;
  solvedCount: number;
  totalPoints: number;
  currentStreak: number;
  priorityScore: number;
}
