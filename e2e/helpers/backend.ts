import type { TestType } from "@playwright/test";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

/**
 * Every spec that needs the real backend stack (`docker compose up` from
 * `engineering-studio-backend/`) calls this in a `test.beforeAll` and
 * skips the whole file if it's not reachable — so `npx playwright test`
 * still runs cleanly frontend-only, rather than every auth-dependent spec
 * failing with a confusing connection-refused error.
 */
export async function skipUnlessBackendIsUp(test: TestType<object, object>) {
  try {
    const res = await fetch(`${API_BASE_URL}/actuator/health`, { signal: AbortSignal.timeout(3000) });
    test.skip(!res.ok, `Backend at ${API_BASE_URL} isn't healthy — start it with 'docker compose up' first.`);
  } catch {
    test.skip(true, `Backend at ${API_BASE_URL} isn't reachable — start it with 'docker compose up' first.`);
  }
}

export function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}
