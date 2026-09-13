"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import {
  DEFAULT_THEME,
  isThemePreference,
  THEME_COOKIE,
  type ThemePreference,
} from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] =
  [
    { value: "light", label: "Light", icon: <SunIcon /> },
    { value: "dark", label: "Dark", icon: <MoonIcon /> },
    { value: "system", label: "System", icon: <SystemIcon /> },
  ];

export function ThemeToggle() {
  // Lazy initializer reads the value the inline script already resolved, so
  // React's state agrees with the DOM from the very first render. Nothing this
  // value affects is rendered while the menu is closed, so server and client
  // markup still match.
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof document === "undefined") return DEFAULT_THEME;
    const stored = document.documentElement.dataset.themePreference;
    return isThemePreference(stored) ? stored : DEFAULT_THEME;
  });

  // Re-apply to the DOM after React's dev-only remount, which strips the
  // attributes the inline script set on <html>. A no-op in production.
  useLayoutEffect(() => {
    applyTheme(preference);
    // Intentionally on mount only — later changes go through `select`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (preference !== "system") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  function select(next: ThemePreference) {
    setPreference(next);
    applyTheme(next);
  }

  return (
    <DropdownMenu
      align="end"
      className="min-w-44"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label="Change theme"
          title="Change theme"
          className={cn(
            "grid size-9 place-items-center rounded-[9px] text-ink-muted",
            "transition-colors duration-150 hover:bg-surface-hover hover:text-ink",
            "data-open:bg-surface-active data-open:text-ink",
          )}
        >
          {/* Icon follows the resolved theme through CSS, so there is nothing
              for the server and client to disagree about. */}
          <span className="dark:hidden">
            <SunIcon />
          </span>
          <span className="hidden dark:block">
            <MoonIcon />
          </span>
        </button>
      )}
    >
      <DropdownMenuLabel className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
        Appearance
      </DropdownMenuLabel>
      <DropdownMenuSeparator />

      {OPTIONS.map((option) => (
        <DropdownMenuItem
          key={option.value}
          onClick={() => select(option.value)}
          className="group"
        >
          <span className="text-ink-muted group-hover:text-accent-ink">
            {option.icon}
          </span>
          <span className="flex-1">{option.label}</span>
          {preference === option.value && <CheckIcon />}
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  );
}

function applyTheme(preference: ThemePreference) {
  const resolved =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;

  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-preference", preference);
  document.cookie = `${THEME_COOKIE}=${preference}; path=/; max-age=31536000; SameSite=Lax`;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-[18px]" aria-hidden="true">
      <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.2v1.6M10 16.2v1.6M17.8 10h-1.6M3.8 10H2.2M15.5 4.5l-1.1 1.1M5.6 14.4l-1.1 1.1M15.5 15.5l-1.1-1.1M5.6 5.6L4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-[18px]" aria-hidden="true">
      <path
        d="M16.5 11.8A7 7 0 0 1 8.2 3.5a7 7 0 1 0 8.3 8.3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-[18px]" aria-hidden="true">
      <rect
        x="2.5"
        y="4"
        width="15"
        height="10"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 17h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden="true">
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
