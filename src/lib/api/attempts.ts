import { authenticatedRequest } from "@/lib/auth/authStore";
import type { AttemptMode, AttemptResponse, ClientGraph } from "@/lib/api/types";

/** `POST /attempts` — requires a signed-in user (see `authenticatedRequest`); throws `ApiError` if not. */
export function startAttempt(scenarioId: string, mode: AttemptMode): Promise<AttemptResponse> {
  return authenticatedRequest<AttemptResponse>("/attempts", {
    method: "POST",
    body: JSON.stringify({ scenarioId, mode }),
  });
}

/** `POST /attempts/{id}/submit` — the real, server-verified score comes back as `verifyScore`/`verifyEvaluation` on the returned AttemptResponse. */
export function submitAttempt(attemptId: string, graph: ClientGraph): Promise<AttemptResponse> {
  return authenticatedRequest<AttemptResponse>(`/attempts/${attemptId}/submit`, {
    method: "POST",
    body: JSON.stringify({ graph }),
  });
}
