"use client";

import {
  useActionState,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  addTodo,
  clearCompleted,
  removeTodo,
  renameTodo,
  setTodoCompleted,
  type MutationResult,
} from "@/app/actions/todos";
import { TodoItem } from "@/components/todos/todo-item";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FormBanner } from "@/components/auth/form-banner";
import { cn, toDueAtIso } from "@/lib/utils";
import type { Todo, TodoFilter } from "@/lib/types";

/**
 * Ids we mint client-side for rows the server hasn't acknowledged yet. The API
 * only accepts UUIDs, so these must never be sent back to it.
 */
const OPTIMISTIC_PREFIX = "optimistic-";

const isPending = (todo: Todo) => todo.id.startsWith(OPTIMISTIC_PREFIX);

type OptimisticAction =
  | { type: "add"; todo: Todo }
  | { type: "toggle"; id: string; completed: boolean }
  | { type: "rename"; id: string; title: string }
  | { type: "delete"; id: string }
  | { type: "clearCompleted" };

function reduce(todos: Todo[], action: OptimisticAction): Todo[] {
  switch (action.type) {
    case "add":
      return [action.todo, ...todos];
    case "toggle":
      return todos.map((todo) =>
        todo.id === action.id ? { ...todo, completed: action.completed } : todo,
      );
    case "rename":
      return todos.map((todo) =>
        todo.id === action.id ? { ...todo, title: action.title } : todo,
      );
    case "delete":
      return todos.filter((todo) => todo.id !== action.id);
    case "clearCompleted":
      return todos.filter((todo) => !todo.completed);
  }
}

export function TodoBoard({
  todos,
  userId,
}: {
  todos: Todo[];
  userId: string;
}) {
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [optimisticTodos, applyOptimistic] = useOptimistic(todos, reduce);
  const [, startTransition] = useTransition();

  const [state, formAction, adding] = useActionState(addTodo, null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * The composer is controlled rather than relying on `defaultValue`.
   *
   * React resets a form once its action settles, which with a real API is a
   * second or two after submit — long enough for someone to start typing the
   * next task. Uncontrolled inputs lose that text when the reset lands.
   */
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");

  // Adjust state during render (not in an effect) when an add settles: on
  // failure put back what was typed, but only if the field is still empty, so
  // anything typed since is never clobbered.
  const [settled, setSettled] = useState(state);
  if (state !== settled) {
    setSettled(state);
    if (state && !state.ok) {
      setTitle((current) => current || (state.values?.title ?? ""));
      setDueAt((current) => current || (state.values?.dueAt ?? ""));
    }
  }

  /**
   * Wraps the action from `useActionState` so the new task paints immediately.
   * React runs form actions inside a transition, which is what lets the
   * optimistic entry survive until the server response replaces it.
   */
  function handleSubmit(formData: FormData) {
    const submitted = String(formData.get("title") ?? "").trim();

    if (submitted) {
      const now = new Date().toISOString();

      applyOptimistic({
        type: "add",
        todo: {
          id: `${OPTIMISTIC_PREFIX}${Date.now()}`,
          title: submitted,
          description: null,
          completed: false,
          dueAt: toDueAtIso(String(formData.get("dueAt") ?? "")) ?? null,
          createdAt: now,
          updatedAt: now,
          userId,
        },
      });

      // The optimistic row is already on screen, so free the composer for the
      // next task straight away. `formData` is captured, so this is safe.
      setTitle("");
      setDueAt("");
    }

    formAction(formData);
  }

  function mutate(
    action: OptimisticAction,
    run: () => Promise<MutationResult>,
  ) {
    startTransition(async () => {
      applyOptimistic(action);
      const result = await run();
      // A failure leaves the server state untouched, so ending the transition
      // reverts the optimistic change on its own; we only report why.
      setMutationError(result.ok ? null : result.message);
    });
  }

  const active = optimisticTodos.filter((todo) => !todo.completed);
  const completed = optimisticTodos.filter((todo) => todo.completed);

  const visible =
    filter === "active"
      ? active
      : filter === "completed"
        ? completed
        : optimisticTodos;

  const progress =
    optimisticTodos.length === 0
      ? 0
      : Math.round((completed.length / optimisticTodos.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Composer */}
      <form
        action={handleSubmit}
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-panel border border-hairline bg-surface p-2",
          "shadow-panel transition-shadow duration-200",
          "focus-within:border-accent/40 focus-within:shadow-[0_0_0_3.5px_var(--accent-soft),var(--shadow-panel)]",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center text-ink-subtle">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="size-[18px]"
            aria-hidden="true"
          >
            <path
              d="M10 4.2v11.6M4.2 10h11.6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <input
          ref={inputRef}
          name="title"
          placeholder="What needs doing?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
          maxLength={200}
          aria-label="Task title"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm text-ink",
            "placeholder:text-ink-subtle focus:outline-none",
          )}
        />

        <label className="sr-only" htmlFor="dueAt">
          Due date (optional)
        </label>
        <input
          id="dueAt"
          name="dueAt"
          type="date"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className={cn(
            "h-8 rounded-[7px] border border-hairline bg-surface-raised px-2",
            "text-[13px] text-ink-muted shadow-[var(--bevel)]",
            "transition-colors hover:bg-surface-hover focus:outline-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
            // Narrow screens: drop to its own row so the title keeps the width
            // it needs. Inline with everything else from `sm` up.
            "order-last w-full shrink-0 sm:order-none sm:w-auto",
          )}
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={adding}
          disabled={title.trim() === ""}
        >
          Add
        </Button>
      </form>

      {mutationError && <FormBanner message={mutationError} />}
      {state?.message && <FormBanner message={state.message} />}
      {state?.fieldErrors?.title && (
        <FormBanner message={state.fieldErrors.title[0]} />
      )}
      {state?.fieldErrors?.dueAt && (
        <FormBanner message={state.fieldErrors.dueAt[0]} />
      )}

      {/* Filters + progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Filter tasks"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: optimisticTodos.length },
            { value: "active", label: "Active", count: active.length },
            { value: "completed", label: "Done", count: completed.length },
          ]}
        />

        <div className="flex items-center gap-2.5">
          <div
            className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tasks completed"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[var(--ease-out-quint)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-ink-subtle">
            {progress}%
          </span>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-panel border border-hairline bg-surface shadow-panel">
        {visible.length === 0 ? (
          <EmptyState
            filter={filter}
            onCompose={() => inputRef.current?.focus()}
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {visible.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                pending={isPending(todo)}
                onToggle={(next) =>
                  mutate({ type: "toggle", id: todo.id, completed: next }, () =>
                    setTodoCompleted(todo.id, next),
                  )
                }
                onRename={(title) =>
                  mutate({ type: "rename", id: todo.id, title }, () =>
                    renameTodo(todo.id, title),
                  )
                }
                onDelete={() =>
                  mutate({ type: "delete", id: todo.id }, () =>
                    removeTodo(todo.id),
                  )
                }
              />
            ))}
          </ul>
        )}

        {optimisticTodos.length > 0 && (
          <div className="flex items-center justify-between border-t border-hairline bg-surface-sunken/50 px-4 py-2.5">
            <span className="text-xs text-ink-muted">
              {active.length} {active.length === 1 ? "task" : "tasks"} left
            </span>

            {completed.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  mutate({ type: "clearCompleted" }, () => clearCompleted())
                }
                className="text-xs font-medium text-ink-muted transition-colors hover:text-danger"
              >
                Clear completed
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  filter,
  onCompose,
}: {
  filter: TodoFilter;
  onCompose: () => void;
}) {
  const copy = {
    all: {
      title: "Nothing here yet",
      body: "Add your first task and it'll show up right here.",
    },
    active: {
      title: "All clear",
      body: "Every task is done. Enjoy the quiet.",
    },
    completed: {
      title: "No completed tasks",
      body: "Finish something and it'll land here.",
    },
  }[filter];

  return (
    <div className="flex flex-col items-center gap-1 px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="mb-2 grid size-11 place-items-center rounded-full bg-surface-sunken text-ink-subtle"
      >
        <svg viewBox="0 0 20 20" fill="none" className="size-5">
          <path
            d="M5 10.5l3 3 7-7"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="text-sm font-medium text-ink">{copy.title}</p>
      <p className="max-w-xs text-[13px] text-ink-muted">{copy.body}</p>
      {filter === "all" && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onCompose}
          className="mt-3"
        >
          Add a task
        </Button>
      )}
    </div>
  );
}
