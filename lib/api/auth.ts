import { apiData, ApiError } from "@/lib/api/client";
import type { User } from "@/lib/types";

/**
 * Auth operations, one per `operationId` in the OpenAPI document.
 *
 * There is no cookie handling here any more. Register, login and logout all
 * answer with `Set-Cookie`, and because the browser makes these requests itself
 * it applies those headers directly — the session cookie stays httpOnly and
 * never passes through JavaScript.
 */
const ENDPOINTS = {
  register: "/api/auth/register",
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
} as const;

export async function loginRequest(input: {
  email: string;
  password: string;
}): Promise<User> {
  return apiData<User>(ENDPOINTS.login, { method: "POST", body: input });
}

export async function signupRequest(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const name = input.name.trim();

  // Register signs the user in as well — no follow-up login call needed.
  return apiData<User>(ENDPOINTS.register, {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      // The API requires at least 1 character when present, so omit it
      // entirely rather than sending "".
      ...(name ? { name } : {}),
    },
  });
}

export async function logoutRequest(): Promise<void> {
  try {
    // Returns 204 even with no session, so it is safe to call unconditionally.
    await apiData<void>(ENDPOINTS.logout, { method: "POST" });
  } catch (error) {
    // Never block sign-out on a backend hiccup. The caller clears the session
    // it holds in memory either way; a cookie the API failed to expire is
    // rejected on its next use anyway.
    console.error("Logout request failed; signing out locally:", error);
  }
}

/**
 * Resolves the signed-in user, or `null` when there is no usable session.
 *
 * This always costs a round trip. The old server-side version could skip it by
 * looking for the session cookie first, but that cookie belongs to the API's
 * origin and is httpOnly, so the browser will not show it to us — asking the
 * API is the only way to know.
 */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await apiData<User>(ENDPOINTS.me);
  } catch (error) {
    // An expired or revoked session is a normal state, not a failure.
    if (error instanceof ApiError && error.isUnauthenticated) return null;
    throw error;
  }
}
