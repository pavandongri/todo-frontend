"use client";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * The most likely cause in practice is the API being unreachable — a Server
 * Component awaiting `lib/dal.ts` throws, and without this the user gets a bare
 * framework error page. `reset()` re-renders the segment, which retries the
 * request, so recovering is a single click once the API is back.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-11 place-items-center rounded-full bg-danger-soft text-danger"
        >
          <svg viewBox="0 0 20 20" fill="none" className="size-5">
            <path
              d="M10 6.2v4.4M10 13.6h.01"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>

        <h1 className="mt-4 text-lg font-semibold text-ink">
          Something went wrong
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          We couldn&apos;t reach the server. Check that the API is running, then
          try again.
        </p>

        {/* Next.js replaces the message in production; the digest is the only
            reliable handle back to the server logs. */}
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-ink-subtle">
            Reference: {error.digest}
          </p>
        )}

        <Button variant="primary" className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
