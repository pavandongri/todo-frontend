import Link from "next/link";
import { getCurrentUserSafe } from "@/lib/dal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const user = await getCurrentUserSafe();

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-8 sm:px-6 sm:pt-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="absolute top-[-30%] left-1/2 size-[44rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-3xl"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--accent) 0%, transparent 65%)",
            }}
          />
        </div>

        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <Badge tone="accent" className="animate-fade-up">
            Built with Next.js 16
          </Badge>

          <h1 className="mt-5 animate-fade-up text-[34px] leading-[1.1] font-semibold text-ink [animation-delay:60ms] sm:text-[52px]">
            A calmer way to keep
            <br className="hidden sm:block" /> your work moving.
          </h1>

          <p className="mt-4 max-w-lg animate-fade-up text-[15px] leading-relaxed text-ink-muted [animation-delay:120ms] sm:text-base">
            Cadence is a task manager that gets out of the way — quick to
            capture, quiet to look at, and just as comfortable at midnight as at
            midday.
          </p>

          <div className="mt-8 flex animate-fade-up flex-col gap-3 [animation-delay:180ms] sm:flex-row">
            <Link
              href={user ? "/todos" : "/signup"}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-[11px] px-6",
                "bg-accent text-[15px] font-medium text-accent-ink",
                "shadow-[var(--bevel-accent),var(--shadow-sm)]",
                "transition-[background-color,transform] duration-150 ease-[var(--ease-spring)]",
                "hover:bg-accent-hover active:scale-[0.97]",
              )}
            >
              {user ? "Open your tasks" : "Get started — it's free"}
            </Link>

            {!user && (
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
        </div>

        {/* Product preview */}
        <div className="relative mx-auto mt-14 max-w-3xl animate-fade-up [animation-delay:240ms]">
          <WindowPreview />
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-panel border border-hairline bg-surface p-5 shadow-sm"
            >
              <span className="grid size-9 place-items-center rounded-[9px] bg-accent-soft text-accent">
                {feature.icon}
              </span>
              <h2 className="mt-3.5 text-sm font-semibold text-ink">
                {feature.title}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-hairline px-4 py-8 sm:px-6">
        <p className="mx-auto max-w-4xl text-xs text-ink-subtle">
          Cadence — a demo application.
        </p>
      </footer>
    </main>
  );
}

/** A still-life of the app, rendered from the same tokens as the real UI. */
function WindowPreview() {
  const rows = [
    {
      title: "Review the Q3 design system audit",
      done: false,
      tone: "bg-danger",
    },
    {
      title: "Ship the onboarding empty states",
      done: false,
      tone: "bg-accent",
    },
    {
      title: "Reply to the vendor questionnaire",
      done: true,
      tone: "bg-ink-subtle",
    },
  ];

  return (
    <div className="overflow-hidden rounded-window border border-hairline bg-surface shadow-modal">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-sunken/60 px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="mx-auto text-[11px] font-medium text-ink-subtle">
          Today
        </span>
      </div>

      <ul className="divide-y divide-hairline">
        {rows.map((row) => (
          <li key={row.title} className="flex items-center gap-3 px-4 py-3.5">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-5 place-items-center rounded-full border",
                row.done ? "border-accent bg-accent" : "border-hairline-strong",
              )}
            >
              {row.done && (
                <svg viewBox="0 0 16 16" fill="none" className="size-3">
                  <path
                    d="M3.5 8.5L6.5 11.5L12.5 4.5"
                    stroke="white"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              className={cn(
                "flex-1 text-sm",
                row.done ? "text-ink-subtle line-through" : "text-ink",
              )}
            >
              {row.title}
            </span>
            <span
              className={cn("size-1.5 rounded-full", row.tone)}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

const FEATURES = [
  {
    title: "Capture in a keystroke",
    body: "The composer is always the first thing in reach. Type, press enter, move on.",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="size-[18px]"
        aria-hidden="true"
      >
        <path
          d="M10 4.2v11.6M4.2 10h11.6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    title: "Light and dark, properly",
    body: "One token set drives both themes, applied before the first paint — no flash.",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="size-[18px]"
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="10"
          r="6.2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M10 3.8v12.4a6.2 6.2 0 0 0 0-12.4Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Instant by default",
    body: "Changes land in the UI the moment you make them, then settle with the server.",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="size-[18px]"
        aria-hidden="true"
      >
        <path
          d="M11 2.5 4.5 11h4l-.5 6.5L15.5 9h-4l-.5-6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];
