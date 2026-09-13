import "server-only";
import { cookies } from "next/headers";
import {
  apiData,
  ApiError,
  apiRequest,
  buildApiError,
  relaySetCookies,
  sessionCookieName,
} from "@/lib/api/client";
import type { User } from "@/lib/types";

/** Auth operations, one per `operationId` in the OpenAPI document. */
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
  const response = await apiRequest(ENDPOINTS.login, {
    method: "POST",
    body: input,
  });

  return finishSession(response);
}

export async function signupRequest(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const name = input.name.trim();

  const response = await apiRequest(ENDPOINTS.register, {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      // The API requires at least 1 character when present, so omit it
      // entirely rather than sending "".
      ...(name ? { name } : {}),
    },
  });

  // Register signs the user in as well — no follow-up login call needed.
  return finishSession(response);
}

export async function logoutRequest(): Promise<void> {
  const cookieStore = await cookies();

  try {
    // Returns 204 even with no session, so it is safe to call unconditionally.
    const response = await apiRequest(ENDPOINTS.logout, { method: "POST" });
    // The API clears its own cookie; pass that instruction through.
    await relaySetCookies(response);
  } catch {
    // Never block sign-out on a backend hiccup — clear locally regardless.
  }

  cookieStore.delete(sessionCookieName());
}

/**
 * Resolves the signed-in user, or `null` when there is no usable session.
 * Call it through `getCurrentUser()` in `lib/dal.ts` so it is deduped per render.
 */
export async function fetchCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  // No cookie means no session; skip the round trip.
  if (!cookieStore.get(sessionCookieName())?.value) return null;

  try {
    return await apiData<User>(ENDPOINTS.me);
  } catch (error) {
    // An expired or revoked session is a normal state, not a failure.
    if (error instanceof ApiError && error.isUnauthenticated) return null;
    throw error;
  }
}

/** Reads the user out of a register/login response and relays its session cookie. */
async function finishSession(response: Response): Promise<User> {
  const payload = (await response.json().catch(() => null)) as {
    data?: User;
  } | null;

  if (!response.ok) {
    // Reuse the shared error path so validation details and requestId survive.
    throw buildApiError(response, payload);
  }

  await relaySetCookies(response);

  const user = payload?.data;
  if (!user?.id) {
    throw new ApiError({
      message: "The sign-in response did not include a user.",
      status: 502,
      code: "INTERNAL_SERVER_ERROR",
    });
  }

  return user;
}
