"use client";

import { cn } from "@/lib/utils";

/**
 * macOS segmented control. The selected pill is a single absolutely-positioned
 * element that slides between segments, rather than each segment toggling its
 * own background — that's what produces the continuous motion.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; count?: number }[];
  className?: string;
  label: string;
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "relative isolate inline-grid gap-0.5 rounded-[9px] p-0.5",
        "border border-hairline bg-surface-sunken",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0.5 -z-10 rounded-[7px] bg-surface-raised",
          "border border-hairline shadow-[var(--bevel),var(--shadow-xs)]",
          "transition-transform duration-300 ease-[var(--ease-spring)]",
        )}
        style={{
          width: `calc((100% - 0.25rem) / ${options.length})`,
          left: "0.125rem",
          transform: `translateX(calc(${activeIndex} * 100%))`,
        }}
      />

      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex h-7 items-center justify-center gap-1.5 rounded-[7px] px-3",
              "text-[13px] font-medium transition-colors duration-200",
              selected ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "text-[11px] tabular-nums transition-colors",
                  selected ? "text-ink-subtle" : "text-ink-subtle/70",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
