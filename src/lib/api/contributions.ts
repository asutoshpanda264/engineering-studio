import { authenticatedRequest } from "@/lib/auth/authStore";
import type { ContributionRequest, ContributionResponse, PendingContributionResponse } from "@/lib/api/types";

/** `POST /contributions` — CONTRIBUTOR/ADMIN only; throws `ApiError` otherwise. */
export function submitContribution(request: ContributionRequest): Promise<ContributionResponse> {
  return authenticatedRequest<ContributionResponse>("/contributions", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/** `GET /contributions/mine` — the calling contributor's own submissions, any status. */
export function getMyContributions(): Promise<ContributionResponse[]> {
  return authenticatedRequest<ContributionResponse[]>("/contributions/mine");
}

/** `GET /contributions/pending` — ADMIN only. Already sorted by each submitter's total approved points, descending. */
export function getPendingContributions(): Promise<PendingContributionResponse[]> {
  return authenticatedRequest<PendingContributionResponse[]>("/contributions/pending");
}

/** `POST /contributions/{id}/approve` — ADMIN only. Awards the fixed points for that contribution's category. */
export function approveContribution(id: string): Promise<ContributionResponse> {
  return authenticatedRequest<ContributionResponse>(`/contributions/${id}/approve`, { method: "POST" });
}

/** `POST /contributions/{id}/reject` — ADMIN only. */
export function rejectContribution(id: string): Promise<ContributionResponse> {
  return authenticatedRequest<ContributionResponse>(`/contributions/${id}/reject`, { method: "POST" });
}
