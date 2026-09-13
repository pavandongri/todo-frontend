import { cn } from "@/lib/utils";

/** Label + control + inline error, wired up for screen readers. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-medium text-ink-muted"
      >
        {label}
      </label>

      {children}

      {hint && !error?.length && (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}

      {error?.length ? (
        <ul id={errorId} className="flex flex-col gap-0.5">
          {error.map((message) => (
            <li key={message} className="text-xs text-danger">
              {message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
