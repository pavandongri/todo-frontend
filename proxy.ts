import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route guard (Next.js 16 renamed `middleware` to `proxy`).
 *
 * This only checks whether a session cookie is *present* — it deliberately does
 * no backend lookup, because proxy runs on every request including prefetches.
 * The real authorisation happens in `lib/dal.ts`, next to the data.
 *
 * Kept free of shared imports: proxy is invoked separately from render code and
 * may be deployed to the edge of your CDN.
 */

// Read directly rather than through `lib/env.ts`: proxy is invoked separately
// from render code and should not depend on shared modules. `instrumentation.ts`
// has already validated this at start-up, so it is guaranteed to be set.
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME;

/** Signed-out visitors are sent to /login. */
const PROTECTED_PREFIXES = ["/todos"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!SESSION_COOKIE) {
    throw new Error(
      "SESSION_COOKIE_NAME is not set. See .env.example.",
    );
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSession) {
    const url = new URL("/login", request.nextUrl);
    // Remember where they were headed so login can send them back.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Deliberately no "signed-in users can't see /login" redirect here.
  // A cookie can outlive the session it points at (expired, revoked, or a dev
  // server restart). Bouncing on mere cookie presence would fight the
  // authoritative check in the page — /login sends you to /todos, /todos finds
  // the session invalid and sends you back — an infinite loop that locks the
  // user out with no way to reach the sign-in form.
  // The login and signup pages call `getCurrentUser()` themselves, which
  // actually validates the session, so they handle that case correctly.

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, the image optimizer, and static assets — otherwise a
  // redirect here can block CSS, JS and images from loading.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
