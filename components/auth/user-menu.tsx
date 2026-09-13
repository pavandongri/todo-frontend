"use client";

import { logout } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuLink,
  DropdownMenuSeparator,
  dropdownMenuItemClassName,
} from "@/components/ui/dropdown-menu";
import { cn, displayName } from "@/lib/utils";
import type { User } from "@/lib/types";

export function UserMenu({ user }: { user: User }) {
  const name = displayName(user);

  return (
    <DropdownMenu
      align="end"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`Account menu for ${name}`}
          className={cn(
            "flex items-center gap-2 rounded-full p-0.5 pr-2",
            "transition-colors duration-150 hover:bg-surface-hover",
            "data-open:bg-surface-active",
          )}
        >
          <Avatar name={name} size={28} />
          <svg
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className="size-2.5 text-ink-subtle"
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    >
      <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2">
        <Avatar name={name} size={36} />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-ink">
            {name}
          </span>
          <span className="block truncate text-xs text-ink-muted">
            {user.email}
          </span>
        </span>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      <DropdownMenuLink href="/todos">
        <ListIcon />
        My tasks
      </DropdownMenuLink>

      <DropdownMenuSeparator />

      {/* Left as a real form: the menu must not unmount before the browser
          fires `submit`, so this entry dismisses via the redirect instead. */}
      <form action={logout}>
        <button
          type="submit"
          role="menuitem"
          className={dropdownMenuItemClassName(
            "text-danger hover:bg-danger hover:text-white",
          )}
        >
          <SignOutIcon />
          Sign out
        </button>
      </form>
    </DropdownMenu>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M5.5 4.5h7M5.5 8h7M5.5 11.5h7M3 4.5h.01M3 8h.01M3 11.5h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6M10.5 11 14 8l-3.5-3M14 8H6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
