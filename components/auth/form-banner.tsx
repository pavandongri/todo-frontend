import { cn } from "@/lib/utils";

/** Form-level error, announced to assistive tech when it appears. */
export function FormBanner({
  message,
  tone = "danger",
}: {
  message: string;
  tone?: "danger" | "accent";
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-control border px-3 py-2.5 text-[13px]",
        tone === "danger"
          ? "border-danger/25 bg-danger-soft text-danger"
          : "border-accent/25 bg-accent-soft text-accent",
      )}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="mt-px size-4 shrink-0"
      >
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 5v3.5M8 10.8h.01"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}
