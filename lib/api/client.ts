import "server-only";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

/**
 * HTTP boundary for the Todo API (demo-backend).
 *
 * Conventions this file encodes, straight from the OpenAPI document:
 *   - success bodies wrap their payload in `data`, lists add a sibling `meta`
 *   - errors are always `{ error: { code, message, details?, requestId } }`
 *   - `code` is the stable identifier; `message` is for humans and may change
 *   - every response carries `x-request-id`, echoed as `error.requestId`
 */

/**
 * Backend origin. Read through `serverEnv()` so a missing or self-referential
 * value fails at start-up rather than silently producing a bad request URL.
 */
export function apiBaseUrl(): string {
  return serverEnv().API_BASE_URL;
}

/** Session cookie issued by the API; `COOKIE_NAME` on the backend. */
export function sessionCookieName(): string {
  return serverEnv().SESSION_COOKIE_NAME;
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
  | "DATABASE_UNAVAILABLE";

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
}

type RequestOptions = Omit<RequestInit, "body"> & {
  /** Plain objects are JSON-encoded. */
  body?: unknown;
  /** Appended as a query string, skipping undefined values. */
  query?: Record<string, string | number | undefined>;
};

/**
 * Calls the API with the browser's cookies attached.
 *
 * Server-side `fetch` sends no cookies of its own, so the incoming request's
 * `Cookie` header is forwarded explicitly — that is what makes the httpOnly
 * session cookie work from Server Components and Server Actions. Because these
 * calls are server-to-server, CORS never enters into it; the API's
 * `CORS_ORIGIN` allowlist only matters for calls made from the browser.
 */
export async function apiRequest(
  path: string,
  { body, headers, query, ...init }: RequestOptions = {},
): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const url = new URL(`${apiBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const hasJsonBody = body !== undefined && body !== null;

  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...headers,
    },
    body: hasJsonBody ? JSON.stringify(body) : undefined,
    // Session-scoped data must never be shared between users.
    cache: "no-store",
  });
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

/**
 * Builds an `ApiError` from a response and its already-read body.
 * Exported because callers that need the raw `Response` (to relay cookies)
 * read the body themselves and can't go through `apiData`.
 */
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

/**
 * Copies `Set-Cookie` headers from an API response onto our own response.
 *
 * The API owns the session cookie, but its headers stop at this server — the
 * browser only sees what Next.js sends. Relaying them keeps the cookie httpOnly
 * end to end, with no token passing through client-side JavaScript.
 *
 * Only valid inside a Server Action or Route Handler.
 */
export async function relaySetCookies(response: Response): Promise<void> {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) return;

  const cookieStore = await cookies();

  for (const raw of setCookies) {
    const parsed = parseSetCookie(raw);
    if (parsed) cookieStore.set(parsed.name, parsed.value, parsed.options);
  }
}

type CookieOptions = Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2];

function parseSetCookie(
  raw: string,
): { name: string; value: string; options: CookieOptions } | null {
  const [pair, ...attributes] = raw.split(";");
  const separator = pair.indexOf("=");
  if (separator === -1) return null;

  const name = pair.slice(0, separator).trim();
  const value = decodeURIComponent(pair.slice(separator + 1).trim());
  if (!name) return null;

  const options: NonNullable<CookieOptions> = {};

  for (const attribute of attributes) {
    const index = attribute.indexOf("=");
    const key = (index === -1 ? attribute : attribute.slice(0, index))
      .trim()
      .toLowerCase();
    const attrValue = index === -1 ? "" : attribute.slice(index + 1).trim();

    switch (key) {
      case "path":
        options.path = attrValue;
        break;
      case "domain":
        options.domain = attrValue;
        break;
      case "max-age": {
        const maxAge = Number(attrValue);
        if (!Number.isNaN(maxAge)) options.maxAge = maxAge;
        break;
      }
      case "expires": {
        const expires = new Date(attrValue);
        if (!Number.isNaN(expires.getTime())) options.expires = expires;
        break;
      }
      case "httponly":
        options.httpOnly = true;
        break;
      case "secure":
        options.secure = true;
        break;
      case "samesite": {
        const sameSite = attrValue.toLowerCase();
        if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
          options.sameSite = sameSite;
        }
        break;
      }
    }
  }

  return { name, value, options };
}
