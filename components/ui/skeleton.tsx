import { cn } from "@/lib/utils";

/** Shimmering placeholder — a sweep, not a pulse, so it reads as loading. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-hover",
        "after:absolute after:inset-0 after:-translate-x-full",
        "after:bg-gradient-to-r after:from-transparent after:via-white/12 after:to-transparent",
        "after:animate-[shimmer_1.6s_infinite]",
        className,
      )}
      {...props}
    />
  );
}
