import "server-only";
import { cache } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api/auth";
import type { User } from "@/lib/types";

/**
 * Data Access Layer.
 *
 * Every read of the current user goes through here so the auth check sits next
 * to the data rather than in a layout — layouts don't re-render on navigation,
 * so they can't be relied on to gate anything.
 *
 * `cache` dedupes the call across a single render pass, so a page and the navbar
 * asking for the user costs one backend request.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  return fetchCurrentUser();
});

/**
 * Like `getCurrentUser`, but treats an unreachable API as "signed out" instead
 * of throwing.
 *
 * For chrome and public pages: the navbar renders in the root layout, and an
 * error there escapes the route's own `error.tsx` all the way to the global
 * fallback — so an API outage would replace the entire app rather than just the
 * part that actually needed data.
 */
export const getCurrentUserSafe = cache(async (): Promise<User | null> => {
  try {
    return await fetchCurrentUser();
  } catch (error) {
    // Next.js signals control flow by throwing — `redirect()`, `notFound()`,
    // and the dynamic-rendering marker that `cookies()` and no-store fetches
    // raise. Swallowing those breaks the framework, so hand them back first.
    unstable_rethrow(error);

    console.error("Session lookup failed; rendering as signed out:", error);
    return null;
  }
});

/** Same as `getCurrentUser`, but sends unauthenticated visitors to the login page. */
export const requireUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});
