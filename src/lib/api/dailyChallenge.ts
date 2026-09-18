import { apiRequest } from "@/lib/api/client";
import { authenticatedRequest } from "@/lib/auth/authStore";
import type {
  DailyChallengeCompletionResponse,
  DailyChallengeResponse,
  MyDailyChallengeStandingResponse,
} from "@/lib/api/types";

/** `GET /daily-challenge/today` — public, no auth needed. */
export function getTodayChallenge(): Promise<DailyChallengeResponse> {
  return apiRequest<DailyChallengeResponse>("/daily-challenge/today");
}

/** `GET /daily-challenge/{date}` (yyyy-MM-dd) — public; a future date 404s. */
export function getChallengeForDate(date: string): Promise<DailyChallengeResponse> {
  return apiRequest<DailyChallengeResponse>(`/daily-challenge/${date}`);
}

/** `GET /daily-challenge/today/me` — requires a signed-in user. */
export function getMyDailyChallengeStanding(): Promise<MyDailyChallengeStandingResponse> {
  return authenticatedRequest<MyDailyChallengeStandingResponse>("/daily-challenge/today/me");
}

/** `GET /daily-challenge/history` — requires a signed-in user; newest first. */
export function getDailyChallengeHistory(): Promise<DailyChallengeCompletionResponse[]> {
  return authenticatedRequest<DailyChallengeCompletionResponse[]>("/daily-challenge/history");
}
