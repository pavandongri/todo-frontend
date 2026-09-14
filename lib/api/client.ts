import { publicEnv } from "@/lib/env";

/**
 * HTTP boundary for the Todo API (demo-backend).
 *
 * Every call in this app is made **by the browser, straight to the API** — they
 * show up in the Network panel as requests to the backend's origin. Nothing is
 * relayed through Next.js, which serves no API routes of its own.
 *
 * Conventions this file encodes, straight from the OpenAPI document:
 *   - success bodies wrap their payload in `data`, lists add a sibling `meta`
 *   - errors are always `{ error: { code, message, details?, requestId } }`
 *   - `code` is the stable identifier; `message` is for humans and may change
 *   - every response carries `x-request-id`, echoed as `error.requestId`
 */

/**
 * Backend origin. Read through `publicEnv()` so a missing or self-referential
 * value fails at start-up rather than silently producing a bad request URL.
 */
export function apiBaseUrl(): string {
  return publicEnv().API_BASE_URL;
}

/** Stable error identifiers. Branch on these, never on the message. */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "MALFORMED_JSON"
  | "REQUEST_ABORTED"
  | "FOREIGN_KEY_VIOLATION"
  | "INVALID_QUERY"
  | "UNAUTHORIZED"
  | "INVALID_SESSION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DUPLICATE_VALUE"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_ENCODING"
  | "UNPROCESSABLE_ENTITY"
  | "VALIDATION_ERROR"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR"
  | "DATABASE_UNAVAILABLE"
  /**
   * Not from the API — the request never reached it. Raised locally when
   * `fetch` itself rejects: the API is down, the network is offline, or the
   * browser blocked the response because this origin is missing from the API's
   * CORS allowlist. It has no HTTP status, so `status` is 0.
   */
  | "NETWORK_ERROR";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode | string;
  /** Per-field messages, keyed to match our form field names. */
  fieldErrors?: Record<string, string[]>;
  /** Problems with the request as a whole (the API's `(root)` field). */
  formErrors: string[];
  /** Quote this in bug reports — it maps straight to the server logs. */
  requestId?: string;

  constructor(init: {
    message: string;
    status: number;
    code: string;
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
    requestId?: string;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors;
    this.formErrors = init.formErrors ?? [];
    this.requestId = init.requestId;
  }

  /** True when the session is missing, expired, or points at a deleted account. */
  get isUnauthenticated() {
    return this.code === "UNAUTHORIZED" || this.code === "INVALID_SESSION";
  }

  /** True when the request never reached the API at all. */
  get isNetworkFailure() {
    return this.code === "NETWORK_ERROR";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  /** Plain objects are JSON-encoded. */
  body?: unknown;
  /** Appended as a query string, skipping undefined values. */
  query?: Record<string, string | number | undefined>;
};

/**
 * Calls the API directly from wherever this runs — in practice, the browser.
 *
 * `credentials: "include"` is what carries the session. The cookie was set by
 * the API on the API's own origin, so this is a cross-origin request and the
 * browser sends no cookies unless asked; without it every call comes back 401.
 * The flip side is that the API must name this app's exact origin in its
 * `CORS_ORIGIN` allowlist and answer with `Access-Control-Allow-Credentials:
 * true` — a wildcard `*` is not permitted alongside credentials.
 */
export async function apiRequest(
  path: string,
  { body, headers, query, ...init }: RequestOptions = {},
): Promise<Response> {
  const url = new URL(`${apiBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const hasJsonBody = body !== undefined && body !== null;

  try {
    return await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: hasJsonBody ? JSON.stringify(body) : undefined,
      // Send the API's session cookie on this cross-origin request.
      credentials: "include",
      // Session-scoped data must never be served from a stale cache.
      cache: "no-store",
    });
  } catch (cause) {
    // `fetch` rejects only when the request never completed. The distinction
    // matters to the developer, not the user, so the hint goes to the console
    // and the thrown message stays plain.
    console.error(
      `Could not reach the API at ${apiBaseUrl()}. Check that it is running, ` +
        `and that ${typeof window === "undefined" ? "this app's origin" : window.location.origin} ` +
        "is listed in its CORS_ORIGIN allowlist.",
      cause,
    );

    throw new ApiError({
      message: "We couldn't reach the server. Check your connection and retry.",
      status: 0,
      code: "NETWORK_ERROR",
    });
  }
}

/** `apiRequest` + unwrapping of the `data` envelope. Throws `ApiError` on failure. */
export async function apiData<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  const response = await apiRequest(path, options);
  const payload = await readJson(response);

  if (!response.ok) throw buildApiError(response, payload);

  // 204 No Content (logout, delete) has no envelope to unwrap.
  if (response.status === 204 || payload === null) return undefined as T;

  return (payload as { data: T }).data;
}

/** Like `apiData`, but also returns the `meta` block from a list response. */
export async function apiList<T>(
  path: string,
  options?: RequestOptions,
): Promise<{ data: T[]; meta: import("@/lib/types").PaginationMeta }> {
  const response = await apiRequest(path, options);
  const payload = await readJson(response);

  if (!response.ok) throw buildApiError(response, payload);

  return payload as { data: T[]; meta: import("@/lib/types").PaginationMeta };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Builds an `ApiError` from a response and its already-read body. */
export function buildApiError(response: Response, payload: unknown): ApiError {
  const error = (payload as { error?: Record<string, unknown> } | null)?.error;

  const requestId =
    (typeof error?.requestId === "string" ? error.requestId : undefined) ??
    response.headers.get("x-request-id") ??
    undefined;

  if (!error) {
    // A non-conforming body (a proxy error page, say) still has to surface.
    return new ApiError({
      message: `Request failed with status ${response.status}`,
      status: response.status,
      code: "INTERNAL_SERVER_ERROR",
      requestId,
    });
  }

  const { fieldErrors, formErrors } = splitValidationIssues(error.details);

  return new ApiError({
    message:
      typeof error.message === "string"
        ? error.message
        : `Request failed with status ${response.status}`,
    status: response.status,
    code: typeof error.code === "string" ? error.code : "INTERNAL_SERVER_ERROR",
    fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    formErrors,
    requestId,
  });
}

/**
 * Turns the API's `details: [{ field, message }]` into the shape our forms
 * render. `(root)` means the problem is with the object as a whole, so those
 * messages become form-level rather than field-level.
 */
function splitValidationIssues(details: unknown) {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];

  if (!Array.isArray(details)) return { fieldErrors, formErrors };

  for (const issue of details) {
    const field = (issue as { field?: unknown }).field;
    const message = (issue as { message?: unknown }).message;
    if (typeof message !== "string") continue;

    if (typeof field !== "string" || field === "(root)") {
      formErrors.push(message);
      continue;
    }

    // Nested paths ("user.email") key off the leaf, which is what inputs use.
    const key = field.split(".").pop() ?? field;
    (fieldErrors[key] ??= []).push(message);
  }

  return { fieldErrors, formErrors };
}
