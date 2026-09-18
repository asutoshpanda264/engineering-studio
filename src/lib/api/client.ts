import type { ApiErrorBody } from "./types";

// engineering-studio-backend's api/ service — see its own
// masterdoc/README.md. Overridable per-environment via
// NEXT_PUBLIC_API_BASE_URL (Next.js only inlines NEXT_PUBLIC_* vars into
// the client bundle, so this is the one env var name this module can
// actually read from the browser).
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/**
 * Thrown for every non-2xx response — carries the backend's real
 * `ApiError` shape (`status`, `message`, `fieldErrors`) instead of a bare
 * fetch `TypeError`, so a caller can show a field-level validation error
 * or a real "email already registered" message instead of a generic
 * "something went wrong." A response with no JSON body at all (Spring
 * Security's own 401/403 entry points return one before the request ever
 * reaches `GlobalExceptionHandler` — see engineering-studio-backend's
 * `SecurityConfig`) falls back to the HTTP status text instead.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.status;
    this.fieldErrors = body.fieldErrors;
  }
}

export interface ApiRequestOptions extends RequestInit {
  /** Attaches `Authorization: Bearer <accessToken>` — omit for public endpoints. See `auth/authStore.ts#authenticatedRequest` for the refresh-on-401 wrapper built on top of this. */
  accessToken?: string | null;
}

/**
 * One raw HTTP call to the backend. Deliberately has NO retry or
 * refresh-on-401 logic of its own — that's a stateful, auth-specific
 * concern layered on top in `auth/authStore.ts`, not something every
 * caller of a plain HTTP client should have to reason about.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { accessToken, headers, body, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (accessToken) {
    finalHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders, body });

  // 204 No Content (logout, admin actions) — nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    throw new ApiError(
      (data as ApiErrorBody | undefined) ?? {
        timestamp: new Date().toISOString(),
        status: response.status,
        error: response.statusText || "Request failed",
        message: response.statusText || `Request failed with status ${response.status}`,
        fieldErrors: {},
      },
    );
  }

  return data as T;
}
