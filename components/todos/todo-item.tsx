"use client";

import { useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatDueDate, isOverdue } from "@/lib/utils";
import type { Todo } from "@/lib/types";

export function TodoItem({
  todo,
  pending = false,
  onToggle,
  onRename,
  onDelete,
}: {
  todo: Todo;
  /**
   * The row exists optimistically but the server hasn't confirmed it yet, so
   * it has no real id. Mutating it would send a non-UUID to the API, so every
   * control is held until the real row arrives — usually within a second.
   */
  pending?: boolean;
  onToggle: (completed: boolean) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const next = inputRef.current?.value.trim() ?? "";
    setEditing(false);
    if (next && next !== todo.title) onRename(next);
  }

  function startEditing() {
    if (!pending) setEditing(true);
  }

  const overdue = todo.dueAt && !todo.completed && isOverdue(todo.dueAt);

  return (
    <li
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3",
        "transition-colors duration-150 hover:bg-surface-hover",
        pending && "opacity-65",
      )}
    >
      <span className="pt-0.5">
        <Checkbox
          checked={todo.completed}
          onChange={onToggle}
          disabled={pending}
          label={`Mark "${todo.title}" as ${todo.completed ? "not done" : "done"}`}
        />
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            defaultValue={todo.title}
            maxLength={200}
            autoFocus
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") setEditing(false);
            }}
            className={cn(
              "w-full rounded-[6px] border border-accent bg-surface px-1.5 py-0.5",
              "text-sm text-ink shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none",
            )}
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            disabled={pending}
            className="block w-full text-left"
            title={pending ? "Saving…" : "Click to rename"}
          >
            <span
              className={cn(
                "text-sm transition-colors duration-200",
                todo.completed
                  ? "text-ink-subtle line-through decoration-ink-subtle/50"
                  : "text-ink",
              )}
            >
              {todo.title}
            </span>
          </button>
        )}

        {todo.description && !editing && (
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            {todo.description}
          </p>
        )}
      </div>

      {todo.dueAt && (
        <span
          className={cn(
            "mt-px shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
            "transition-opacity duration-200",
            overdue ? "bg-danger-soft text-danger" : "bg-surface-hover text-ink-muted",
            todo.completed && "opacity-45",
          )}
          title={overdue ? "Overdue" : "Due date"}
        >
          {formatDueDate(todo.dueAt)}
        </span>
      )}

      {pending ? (
        <span
          className="grid size-6 shrink-0 place-items-center text-ink-subtle"
          title="Saving…"
        >
          <Spinner className="size-3.5" />
        </span>
      ) : (
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete "${todo.title}"`}
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-[6px] text-ink-subtle opacity-0",
          "transition-[opacity,background-color,color] duration-150",
          "hover:bg-danger-soft hover:text-danger focus-visible:opacity-100",
          "group-hover:opacity-100",
        )}
      >
        <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
      )}
    </li>
  );
}
