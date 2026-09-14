"use client";

import Link from "next/link";
import { useSession } from "@/components/auth/session";
import { cn } from "@/lib/utils";

/**
 * The hero's call to action, which depends on whether anyone is signed in.
 *
 * The rest of the marketing page is static and server-rendered; only this strip
 * needs the session. While `/api/auth/me` is in flight it shows the signed-out
 * pair — the common case for this page, and the one that avoids a visible swap
 * for most visitors.
 */
export function HomeCta() {
  const { user, loading } = useSession();
  const signedIn = !loading && user !== null;

  return (
    <div className="mt-8 flex animate-fade-up flex-col gap-3 [animation-delay:180ms] sm:flex-row">
      <Link
        href={signedIn ? "/todos" : "/signup"}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-[11px] px-6",
          "bg-accent text-[15px] font-medium text-accent-ink",
          "shadow-[var(--bevel-accent),var(--shadow-sm)]",
          "transition-[background-color,transform] duration-150 ease-[var(--ease-spring)]",
          "hover:bg-accent-hover active:scale-[0.97]",
        )}
      >
        {signedIn ? "Open your tasks" : "Get started — it's free"}
      </Link>

      {!signedIn && (
        <Link
          href="/login"
          className={cn(
            "inline-flex h-11 items-center justify-center rounded-[11px] px-6",
            "border border-hairline-strong bg-surface-raised text-[15px] font-medium text-ink",
            "shadow-[var(--bevel),var(--shadow-sm)]",
            "transition-[background-color,transform] duration-150 ease-[var(--ease-spring)]",
            "hover:bg-surface-hover active:scale-[0.97]",
          )}
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
