import { authenticatedRequest } from "@/lib/auth/authStore";
import type { ProblemProgressResponse } from "@/lib/api/types";

/** `GET /progress/scenarios` — self-only, requires a signed-in user (no public/guest variant exists on the backend). */
export function getMyProgress(): Promise<ProblemProgressResponse[]> {
  return authenticatedRequest<ProblemProgressResponse[]>("/progress/scenarios");
}
