import { authenticatedRequest } from "@/lib/auth/authStore";
import type { ContributorApplicationResponse, TopContributorApplicationResponse } from "@/lib/api/types";

/** `POST /contributor-applications` — plain USER only; no body, nothing to fill in. */
export function applyToContribute(): Promise<ContributorApplicationResponse> {
  return authenticatedRequest<ContributorApplicationResponse>("/contributor-applications", { method: "POST" });
}

/** `GET /contributor-applications/mine` — the calling user's own application history. */
export function getMyContributorApplications(): Promise<ContributorApplicationResponse[]> {
  return authenticatedRequest<ContributorApplicationResponse[]>("/contributor-applications/mine");
}

/** `GET /contributor-applications/top` — ADMIN only. Already capped at 5 and sorted by priority score, descending. */
export function getTopContributorApplications(): Promise<TopContributorApplicationResponse[]> {
  return authenticatedRequest<TopContributorApplicationResponse[]>("/contributor-applications/top");
}

/** `POST /contributor-applications/{id}/approve` — ADMIN only. Promotes the applicant to CONTRIBUTOR. */
export function approveContributorApplication(id: string): Promise<ContributorApplicationResponse> {
  return authenticatedRequest<ContributorApplicationResponse>(`/contributor-applications/${id}/approve`, {
    method: "POST",
  });
}

/** `POST /contributor-applications/{id}/reject` — ADMIN only. */
export function rejectContributorApplication(id: string): Promise<ContributorApplicationResponse> {
  return authenticatedRequest<ContributorApplicationResponse>(`/contributor-applications/${id}/reject`, {
    method: "POST",
  });
}
