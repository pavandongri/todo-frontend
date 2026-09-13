"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DropdownContext = createContext<{ close: () => void } | null>(null);

/** Lets items inside the panel dismiss it on their own terms. */
export function useDropdownMenu() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdownMenu must be used inside a <DropdownMenu>.");
  }
  return context;
}

type DropdownMenuProps = {
  /** Receives the props the trigger must spread onto its button. */
  trigger: (props: {
    "aria-expanded": boolean;
    "aria-haspopup": "menu";
    "aria-controls": string;
    onClick: () => void;
    "data-open": boolean | undefined;
  }) => React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
};

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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
    <div ref={containerRef} className="relative">
      {trigger({
        "aria-expanded": open,
        "aria-haspopup": "menu",
        "aria-controls": menuId,
        onClick: () => setOpen((value) => !value),
        "data-open": open || undefined,
      })}

      {open && (
        // Deliberately no blanket onClick-to-close here: unmounting the panel
        // during a click would cancel the `submit` the browser fires next,
        // which would break any form inside (such as sign out).
        <DropdownContext.Provider value={{ close: () => setOpen(false) }}>
          <div
            id={menuId}
            role="menu"
            className={cn(
              "material-thick absolute top-[calc(100%+6px)] z-50 min-w-56",
              "origin-top rounded-[11px] border border-hairline p-1 shadow-popover",
              "animate-pop-in",
              align === "end" ? "right-0" : "left-0",
              className,
            )}
          >
            {children}
          </div>
        </DropdownContext.Provider>
      )}
    </div>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("px-2.5 py-2", className)} {...props} />;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      className={cn("-mx-1 my-1 h-px bg-hairline", className)}
    />
  );
}

const itemStyles =
  "flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-left text-[13px] " +
  "text-ink transition-colors duration-100 " +
  "hover:bg-accent hover:text-accent-ink focus-visible:bg-accent focus-visible:text-accent-ink " +
  "focus-visible:outline-none disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink";

/** A menu entry that performs an action and dismisses the menu. */
export function DropdownMenuItem({
  className,
  destructive,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { destructive?: boolean }) {
  const { close } = useDropdownMenu();

  return (
    <button
      type="button"
      role="menuitem"
      onClick={(event) => {
        onClick?.(event);
        close();
      }}
      className={cn(
        itemStyles,
        destructive && "text-danger hover:bg-danger hover:text-white",
        className,
      )}
      {...props}
    />
  );
}

/** A menu entry that navigates, dismissing the menu as it goes. */
export function DropdownMenuLink({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Link>) {
  const { close } = useDropdownMenu();

  return (
    <Link
      role="menuitem"
      onClick={(event) => {
        onClick?.(event);
        close();
      }}
      className={cn(itemStyles, className)}
      {...props}
    />
  );
}

/**
 * Shared item styling for entries that aren't plain buttons — notably a submit
 * button whose form must outlive the click.
 */
export function dropdownMenuItemClassName(className?: string) {
  return cn(itemStyles, className);
}
