"use client";

import Link from "next/link";
import { useSession } from "@/components/auth/session";
import { UserMenu } from "@/components/auth/user-menu";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The right-hand end of the navbar: an account menu, or sign-in links.
 *
 * This used to be an async Server Component behind `<Suspense>`, which let the
 * session request stream in with the page. Now `/api/auth/me` is a browser
 * request like any other, so the skeleton stands in until it settles.
 */
export function AccountSection() {
  const { user, loading } = useSession();

  if (loading) {
    return <Skeleton className="ml-1 size-7 rounded-full" />;
  }

  if (user) {
    return <UserMenu user={user} />;
  }

  return (
    <div className="ml-1 flex items-center gap-2">
      <Link
        href="/login"
        className={
          "hidden h-8 items-center rounded-[7px] px-3 text-[13px] font-medium " +
          "text-ink-muted transition-colors duration-150 " +
          "hover:bg-surface-hover hover:text-ink sm:inline-flex"
        }
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className={
          "inline-flex h-8 items-center rounded-[7px] bg-accent px-3 text-[13px] font-medium " +
          "text-accent-ink shadow-[var(--bevel-accent),var(--shadow-sm)] " +
          "transition-[background-color,transform] duration-150 ease-[var(--ease-spring)] " +
          "hover:bg-accent-hover active:scale-[0.97]"
        }
      >
        Get started
      </Link>
    </div>
  );
}
