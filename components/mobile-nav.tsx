"use client";

import { useEffect, useRef, useState } from "react";
import { MobileNavLinks, type NavItem } from "@/components/nav-links";
import { cn } from "@/lib/utils";

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "grid size-9 place-items-center rounded-[9px] text-ink-muted",
          "transition-colors hover:bg-surface-hover hover:text-ink",
          open && "bg-surface-active text-ink",
        )}
      >
        <svg viewBox="0 0 20 20" fill="none" className="size-[18px]" aria-hidden="true">
          <path
            d="M3.5 6h13M3.5 10h13M3.5 14h13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          // Every item inside navigates, so any activation should dismiss.
          onClick={() => setOpen(false)}
          className={cn(
            "material-thick absolute inset-x-3 top-[calc(100%+6px)] z-50",
            "rounded-[12px] border border-hairline p-2 shadow-popover animate-pop-in",
          )}
        >
          <MobileNavLinks items={items} />
        </div>
      )}
    </div>
  );
}
