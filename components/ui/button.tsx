import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none " +
  "transition-[background-color,box-shadow,transform,color,opacity] duration-150 ease-[var(--ease-spring)] " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

const variants: Record<ButtonVariant, string> = {
  // Filled accent with a lit top edge — the macOS default-button look.
  primary:
    "bg-accent text-accent-ink shadow-[var(--bevel-accent),var(--shadow-sm)] " +
    "hover:bg-accent-hover active:bg-accent-active",
  // Raised neutral control sitting on the window surface.
  secondary:
    "bg-surface-raised text-ink border border-hairline-strong " +
    "shadow-[var(--bevel),var(--shadow-sm)] hover:bg-surface-hover",
  ghost: "text-ink-muted hover:bg-surface-hover hover:text-ink",
  subtle: "bg-surface-hover text-ink hover:bg-surface-active",
  danger:
    "bg-danger text-white shadow-[var(--bevel-accent),var(--shadow-sm)] " +
    "hover:opacity-90 active:opacity-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-[7px] px-3 text-[13px]",
  md: "h-9.5 rounded-[9px] px-4 text-sm",
  lg: "h-11 rounded-[11px] px-5 text-[15px]",
  icon: "size-9 rounded-[9px]",
};

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {/* Keep the label in flow while loading so the button doesn't resize. */}
      <span
        className={cn(
          "inline-flex items-center gap-2",
          loading && "invisible",
        )}
      >
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner className="size-4" />
        </span>
      )}
    </button>
  );
}
