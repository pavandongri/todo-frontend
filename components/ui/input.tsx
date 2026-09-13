import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input"> & {
  invalid?: boolean;
};

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-control border bg-surface px-3 text-sm text-ink",
        "placeholder:text-ink-subtle",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]",
        "transition-[border-color,box-shadow] duration-150 ease-[var(--ease-spring)]",
        "focus:outline-none focus:border-accent focus:shadow-[0_0_0_3.5px_var(--accent-soft)]",
        "disabled:opacity-50",
        invalid
          ? "border-danger focus:border-danger focus:shadow-[0_0_0_3.5px_var(--danger-soft)]"
          : "border-hairline-strong",
        className,
      )}
      {...props}
    />
  );
}
