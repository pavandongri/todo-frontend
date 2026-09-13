"use client";

import { cn } from "@/lib/utils";

/**
 * Circular check in the style of Reminders — the tick draws itself in rather
 * than snapping, which is most of what makes the interaction feel considered.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group grid size-5 shrink-0 place-items-center rounded-full border",
        "transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-spring)]",
        "active:scale-90 disabled:opacity-50",
        checked
          ? "border-accent bg-accent"
          : "border-hairline-strong bg-surface hover:border-ink-subtle",
        className,
      )}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="size-3"
      >
        <path
          d="M3.5 8.5L6.5 11.5L12.5 4.5"
          stroke="var(--accent-ink)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={checked ? 0 : 1}
          className="transition-[stroke-dashoffset] duration-250 ease-[var(--ease-out-quint)]"
        />
      </svg>
    </button>
  );
}
