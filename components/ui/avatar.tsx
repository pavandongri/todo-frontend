import { cn } from "@/lib/utils";

/** Initials on a hue derived from the name, so each user is recognisable. */
export function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const hue = hashHue(name);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full",
        "font-semibold text-white shadow-[var(--bevel-accent)]",
        "ring-1 ring-black/5",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        backgroundImage: src
          ? undefined
          : `linear-gradient(145deg, hsl(${hue} 80% 62%), hsl(${(hue + 38) % 360} 78% 48%))`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

function hashHue(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}
