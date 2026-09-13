"use client";

import { useState } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: InputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className={cn(
          "absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-control",
          "text-ink-subtle transition-colors hover:text-ink",
        )}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-[17px]" aria-hidden="true">
      <path
        d="M2.2 10S5 4.8 10 4.8 17.8 10 17.8 10 15 15.2 10 15.2 2.2 10 2.2 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-[17px]" aria-hidden="true">
      <path
        d="M7.9 5.2A7.6 7.6 0 0 1 10 4.8c5 0 7.8 5.2 7.8 5.2a14 14 0 0 1-2.4 3.1M5 6.6A14.3 14.3 0 0 0 2.2 10S5 15.2 10 15.2c.9 0 1.7-.2 2.4-.4M3 3l14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
