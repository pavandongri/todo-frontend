import Link from "next/link";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountSection } from "@/components/auth/account-section";

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/todos", label: "Tasks" },
];

export function Navbar() {
  return (
    <header className="material sticky top-0 z-50 border-b border-hairline">
      <div className="relative mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:px-6">
        <MobileNav items={NAV_ITEMS} />

        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-[8px] pr-1 font-semibold text-ink"
        >
          <LogoMark />
          <span className="text-[15px] tracking-[-0.01em]">Cadence</span>
        </Link>

        <NavLinks items={NAV_ITEMS} className="ml-3 hidden sm:flex" />

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {/* Reads the session from context, so the rest of the chrome paints
              immediately instead of waiting on the API. */}
          <AccountSection />
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 place-items-center rounded-[8px] shadow-[var(--bevel-accent),var(--shadow-xs)]"
      style={{
        backgroundImage:
          "linear-gradient(150deg, var(--accent-active), var(--accent))",
      }}
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
        <path
          d="M3.5 8.5L6.5 11.5L12.5 4.5"
          stroke="white"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
