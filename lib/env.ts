import * as z from "zod";

/**
 * Public environment, validated once and loudly.
 *
 * There is exactly one variable, and it is deliberately **public**: the browser
 * calls the Todo API directly, so the API origin has to be inlined into the
 * client bundle. That is what the `NEXT_PUBLIC_` prefix does — and it only
 * happens when the reference is a literal `process.env.NEXT_PUBLIC_API_BASE_URL`,
 * which is why it is spelled out below rather than read through a variable.
 *
 * There is no `SESSION_COOKIE_NAME` any more. The session cookie is httpOnly and
 * belongs to the API's origin: the browser attaches it automatically and no code
 * in this app can read it, so knowing its name buys nothing.
 */

const EnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .url({ error: "must be an absolute URL, e.g. http://localhost:5000" })
    .refine((value) => /^https?:\/\//.test(value), {
      error: "must use http:// or https://",
    }),
});

export type PublicEnv = {
  /** Backend origin, never with a trailing slash. */
  API_BASE_URL: string;
};

export class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentError";
  }
}

let cached: PublicEnv | null = null;

/**
 * Returns the validated environment, throwing `EnvironmentError` if the API
 * origin is missing or malformed.
 *
 * Validation is lazy and memoised rather than run at module scope: importing
 * this file must not throw, or `next build` would fail on machines that
 * legitimately have no runtime configuration. `instrumentation.ts` calls it
 * during server start-up so a misconfigured app never reaches a request.
 */
export function publicEnv(): PublicEnv {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  if (!parsed.success) {
    throw new EnvironmentError(
      formatIssues(z.flattenError(parsed.error).fieldErrors),
    );
  }

  const apiBaseUrl = parsed.data.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  assertNotSelf(apiBaseUrl);

  cached = { API_BASE_URL: apiBaseUrl };

  return cached;
}

/**
 * Guards against pointing the app at itself.
 *
 * Every API call must reach the backend. This app serves no API routes at all,
 * so a base URL on its own origin produces 404s that read like backend bugs.
 */
function assertNotSelf(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl);

  // In the browser the app's own origin is known exactly.
  if (typeof window !== "undefined") {
    if (url.origin === window.location.origin) {
      throw selfError(`this app's own origin (${window.location.origin})`);
    }
    return;
  }

  // On the server only the port is known, and only when PORT is set.
  const ownPort = process.env.PORT;
  if (!ownPort) return;

  const isLoopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]" ||
    url.hostname === "::1";

  const port = url.port || (url.protocol === "https:" ? "443" : "80");

  if (isLoopback && port === ownPort) {
    throw selfError(`this app's own port (${ownPort})`);
  }
}

function selfError(what: string) {
  return new EnvironmentError(
    [
      "Invalid environment configuration:",
      "",
      `  NEXT_PUBLIC_API_BASE_URL  points at ${what}.`,
      "                            It must point at the backend API, not at Next.js.",
      "",
      "The backend listens on its own PORT — see .env.example.",
    ].join("\n"),
  );
}

function formatIssues(fieldErrors: Record<string, string[] | undefined>) {
  const width = Math.max(
    ...Object.keys(EnvSchema.shape).map((key) => key.length),
  );

  const lines = Object.entries(fieldErrors)
    .filter(([, messages]) => messages?.length)
    .map(([key, messages]) => {
      const reason =
        process.env[key] === undefined ? "is not set" : messages![0];
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
