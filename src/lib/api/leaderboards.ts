import { apiRequest } from "@/lib/api/client";
import { authenticatedRequest } from "@/lib/auth/authStore";
import type { LeaderboardEntryResponse, LeaderboardType, MyLeaderboardStandingResponse } from "@/lib/api/types";

/** `GET /leaderboards/{type}` — public, no auth needed. `limit` defaults to the backend's own default (20) if omitted. */
export function getLeaderboard(type: LeaderboardType, limit?: number): Promise<LeaderboardEntryResponse[]> {
  const query = limit ? `?limit=${limit}` : "";
  return apiRequest<LeaderboardEntryResponse[]>(`/leaderboards/${type}${query}`);
}

/** `GET /leaderboards/{type}/me` — requires a signed-in user. */
export function getMyLeaderboardStanding(type: LeaderboardType): Promise<MyLeaderboardStandingResponse> {
  return authenticatedRequest<MyLeaderboardStandingResponse>(`/leaderboards/${type}/me`);
}
