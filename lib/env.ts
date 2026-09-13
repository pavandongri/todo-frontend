import * as z from "zod";

/**
 * Server environment, validated once and loudly.
 *
 * Every variable here is **required** — there are no fallback defaults. A wrong
 * or missing value used to fail quietly and far from the cause: an unset
 * `API_BASE_URL` sent requests to the app itself, and a `SESSION_COOKIE_NAME`
 * that didn't match the backend's `COOKIE_NAME` made every visitor look signed
 * out. Both now stop the server before it accepts a single request.
 */

const EnvSchema = z.object({
  API_BASE_URL: z
    .url({ error: "must be an absolute URL, e.g. http://localhost:5000" })
    .refine((value) => /^https?:\/\//.test(value), {
      error: "must use http:// or https://",
    }),

  SESSION_COOKIE_NAME: z
    .string()
    .min(1, { error: "must not be empty" })
    .regex(/^[A-Za-z0-9!#$%&'*+\-.^_`|~]+$/, {
      error: "must be a valid cookie name (no spaces, commas or semicolons)",
    }),
});

export type ServerEnv = {
  /** Backend origin, never with a trailing slash. */
  API_BASE_URL: string;
  /** Must match the backend's `COOKIE_NAME`. */
  SESSION_COOKIE_NAME: string;
};

export class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentError";
  }
}

let cached: ServerEnv | null = null;

/**
 * Returns the validated environment, throwing `EnvironmentError` if anything is
 * missing or malformed.
 *
 * Validation is lazy and memoised rather than run at module scope: importing
 * this file must not throw, or `next build` would fail on machines that
 * legitimately have no runtime configuration. `instrumentation.ts` calls it
 * during server start-up so a misconfigured app never reaches a request.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse({
    API_BASE_URL: process.env.API_BASE_URL,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  });

  if (!parsed.success) {
    throw new EnvironmentError(formatIssues(z.flattenError(parsed.error).fieldErrors));
  }

  const apiBaseUrl = parsed.data.API_BASE_URL.replace(/\/$/, "");
  assertNotSelf(apiBaseUrl);

  cached = {
    API_BASE_URL: apiBaseUrl,
    SESSION_COOKIE_NAME: parsed.data.SESSION_COOKIE_NAME,
  };

  return cached;
}

/**
 * Guards against pointing the app at itself.
 *
 * Every API call must reach the backend; a base URL on this server's own port
 * would loop requests back into Next.js and fail in a way that looks like a
 * backend bug. Only checked when the port is known, so it never false-positives.
 */
function assertNotSelf(apiBaseUrl: string) {
  const ownPort = process.env.PORT;
  if (!ownPort) return;

  const url = new URL(apiBaseUrl);
  const isLoopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]" ||
    url.hostname === "::1";

  const port = url.port || (url.protocol === "https:" ? "443" : "80");

  if (isLoopback && port === ownPort) {
    throw new EnvironmentError(
      [
        "Invalid environment configuration:",
        "",
        `  API_BASE_URL  points at this app's own port (${ownPort}).`,
        "                It must point at the backend API, not at Next.js.",
        "",
        "The backend listens on its own PORT — see .env.example.",
      ].join("\n"),
    );
  }
}

function formatIssues(fieldErrors: Record<string, string[] | undefined>) {
  const width = Math.max(
    ...Object.keys(EnvSchema.shape).map((key) => key.length),
  );

  const lines = Object.entries(fieldErrors)
    .filter(([, messages]) => messages?.length)
    .map(([key, messages]) => {
      const reason = process.env[key] === undefined ? "is not set" : messages![0];
      return `  ${key.padEnd(width)}  ${reason}`;
    });

  return [
    "Invalid environment configuration:",
    "",
    ...lines,
    "",
    "Copy .env.example to .env and fill in the values.",
  ].join("\n");
}
