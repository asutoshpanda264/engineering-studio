import { authenticatedRequest } from "@/lib/auth/authStore";
import type { BugReportRequest, BugReportResponse, BugReportReviewRequest } from "@/lib/api/types";

/** `POST /bug-reports` — any authenticated role. */
export function fileBugReport(request: BugReportRequest): Promise<BugReportResponse> {
  return authenticatedRequest<BugReportResponse>("/bug-reports", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

/** `GET /bug-reports` — ADMIN only, newest first. */
export function getAllBugReports(): Promise<BugReportResponse[]> {
  return authenticatedRequest<BugReportResponse[]>("/bug-reports");
}

/** `POST /bug-reports/{id}/review` — ADMIN only. A POST, not PATCH, mirroring `/contributions/{id}/approve`'s action-suffix convention. */
export function reviewBugReport(id: string, request: BugReportReviewRequest): Promise<BugReportResponse> {
  return authenticatedRequest<BugReportResponse>(`/bug-reports/${id}/review`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}
