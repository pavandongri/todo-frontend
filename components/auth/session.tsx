"use client";

import { createContext, use, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api/auth";
import type { User } from "@/lib/types";

/**
 * Session state, held in the browser.
 *
 * This replaces the old server-side Data Access Layer. Authorization is still
 * the API's job — every `/api/todos` call is rejected without a valid session
 * cookie, and nothing here can change that. What this provides is the *UI's*
 * view of who is signed in, so the navbar and the route guards have something
 * to render from. Treat it as a cache of `GET /api/auth/me`, never as the
 * thing that grants access.
 *
 * One `/api/auth/me` request is made per page load, not per component: the
 * result lives in this context, which is the client-side equivalent of the
 * `React.cache` dedupe the DAL used to rely on.
 */
type SessionState = {
  user: User | null;
  /** True until the first `/api/auth/me` call settles. */
  loading: boolean;
  /**
   * Adopt a user the API just returned from login or signup, or `null` after
   * logout. Saves a second round trip to `/api/auth/me`, and is how the navbar
   * learns about a sign-in without a page reload.
   */
  setUser: (user: User | null) => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Runs in the browser only, so this `/api/auth/me` shows up in the Network
  // panel as a request to the API's own origin.
  useEffect(() => {
    // The response can outlive the mount that asked for it — React's strict
    // mode remounts in development, and the visitor may navigate away — so a
    // late reply is dropped rather than written into a stale tree.
    let cancelled = false;

    fetchCurrentUser()
      .then(
        (next) => {
          if (!cancelled) setUser(next);
        },
        (error) => {
          // An unreachable API is not a signed-in state, and throwing here
          // would take down the whole app rather than the part needing data.
          console.error(
            "Session lookup failed; treating as signed out:",
            error,
          );
          if (!cancelled) setUser(null);
        },
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SessionContext value={{ user, loading, setUser }}>
      {children}
    </SessionContext>
  );
}

export function useSession(): SessionState {
  const session = use(SessionContext);
  if (!session) {
    throw new Error("useSession must be used inside <SessionProvider>.");
  }
  return session;
}

/**
 * Client-side guard for a signed-in route.
 *
 * The old `proxy.ts` guard is gone: it worked by looking for the session cookie
 * on incoming requests, and that cookie now belongs to the API's origin, so
 * Next.js never sees it. Redirecting from the client is the honest replacement
 * — and it is only ever a convenience. The data itself is protected by the API,
 * which returns 401 to anyone without a session no matter what this renders.
 *
 * Callers must handle `loading` and a null `user` themselves; the redirect
 * takes a moment and the component keeps rendering until it lands.
 */
export function useRequireSession(): SessionState {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session.loading || session.user) return;

    const next = encodeURIComponent(pathname);
    router.replace(`/login?next=${next}`);
  }, [session.loading, session.user, pathname, router]);

  return session;
}

/** The mirror image, for `/login` and `/signup`: signed-in visitors move on. */
export function useRedirectWhenSignedIn(to = "/todos"): SessionState {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session.loading && session.user) router.replace(to);
  }, [session.loading, session.user, to, router]);

  return session;
}
