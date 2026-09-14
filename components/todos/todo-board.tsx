"use client";

import {
  useActionState,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  clearCompletedTodos,
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
} from "@/lib/api/todos";
import { TodoItem } from "@/components/todos/todo-item";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FormBanner } from "@/components/auth/form-banner";
import { fieldErrors, TodoSchema } from "@/lib/validation";
import { toActionState, toErrorMessage } from "@/lib/form-state";
import { cn, toDueAtIso } from "@/lib/utils";
import type { ActionState, Todo, TodoFilter } from "@/lib/types";

/**
 * Ids we mint client-side for rows the API hasn't acknowledged yet. The API
 * only accepts UUIDs, so these must never be sent back to it.
 */
const OPTIMISTIC_PREFIX = "optimistic-";

const isPending = (todo: Todo) => todo.id.startsWith(OPTIMISTIC_PREFIX);

/**
 * The task list and its composer.
 *
 * The list is owned by `TodosView` and passed in with its setter, because it is
 * the only copy that exists: with the browser calling the API directly there is
 * no server-rendered list to revalidate. Each mutation therefore comes in two
 * halves — `apply` paints the change immediately, and `revert` undoes exactly
 * that change if the request fails. Reverting the *change* rather than
 * restoring a whole snapshot is what keeps a failed toggle from also wiping out
 * a task added while it was in flight.
 */
export function TodoBoard({
  todos,
  setTodos,
  userId,
}: {
  todos: Todo[];
  setTodos: Dispatch<SetStateAction<Todo[]>>;
  userId: string;
}) {
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [mutationError, setMutationError] = useState<string | null>(null);
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

  /**
   * Adds a task. A plain async function, not a Server Action: `useActionState`
   * takes either, and this one's `POST /api/todos` goes straight to the API.
   */
  async function submit(
    _previous: ActionState,
    formData: FormData,
  ): Promise<ActionState> {
    const values = {
      title: String(formData.get("title") ?? ""),
      dueAt: String(formData.get("dueAt") ?? ""),
    };

    const parsed = TodoSchema.safeParse({
      title: formData.get("title"),
      description: emptyToUndefined(formData.get("description")),
      dueAt: emptyToUndefined(formData.get("dueAt")),
    });

    if (!parsed.success) {
      return { ok: false, values, fieldErrors: fieldErrors(parsed.error) };
    }

    const { title: submitted, description } = parsed.data;
    const dueAtIso = toDueAtIso(parsed.data.dueAt);
    const now = new Date().toISOString();
    const temporaryId = `${OPTIMISTIC_PREFIX}${Date.now()}`;

    // Paint the row and free the composer before the request goes out, so the
    // next task can be typed while this one is still saving.
    setTodos((list) => [
      {
        id: temporaryId,
        title: submitted,
        description: description ?? null,
        completed: false,
        dueAt: dueAtIso ?? null,
        createdAt: now,
        updatedAt: now,
        userId,
      },
      ...list,
    ]);
    setTitle("");
    setDueAt("");

    try {
      const created = await createTodo({
        title: submitted,
        description,
        dueAt: dueAtIso,
      });
      // Swap the placeholder for the real row, which has the id every
      // subsequent mutation needs.
      setTodos((list) =>
        list.map((todo) => (todo.id === temporaryId ? created : todo)),
      );
      return { ok: true };
    } catch (error) {
      setTodos((list) => list.filter((todo) => todo.id !== temporaryId));
      return { ...toActionState(error, "We couldn't add that task."), values };
    }
  }

  const [state, formAction, adding] = useActionState(submit, null);

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
   * Applies a change locally, sends it, and undoes it if the API refuses.
   *
   * These never throw: a rejected toggle should show a message, not tear down
   * the route.
   */
  async function mutate(
    apply: (list: Todo[]) => Todo[],
    revert: (list: Todo[]) => Todo[],
    run: () => Promise<unknown>,
    fallback: string,
  ) {
    setMutationError(null);
    setTodos(apply);

    try {
      await run();
    } catch (error) {
      setTodos(revert);
      setMutationError(toErrorMessage(error, fallback));
    }
  }

  function toggle(todo: Todo, completed: boolean) {
    void mutate(
      (list) => setField(list, todo.id, { completed }),
      (list) => setField(list, todo.id, { completed: todo.completed }),
      () => updateTodo(todo.id, { completed }),
      "We couldn't update that task.",
    );
  }

  function rename(todo: Todo, nextTitle: string) {
    const trimmed = nextTitle.trim().slice(0, 200);
    if (!trimmed || trimmed === todo.title) return;

    void mutate(
      (list) => setField(list, todo.id, { title: trimmed }),
      (list) => setField(list, todo.id, { title: todo.title }),
      () => updateTodo(todo.id, { title: trimmed }),
      "We couldn't rename that task.",
    );
  }

  function remove(todo: Todo) {
    // Captured now so a failure can put the row back where it was.
    const index = todos.findIndex((item) => item.id === todo.id);

    void mutate(
      (list) => list.filter((item) => item.id !== todo.id),
      (list) => insertAt(list, index, todo),
      () => deleteTodo(todo.id),
      "We couldn't delete that task.",
    );
  }

  async function clearCompleted() {
    const removed = todos
      .map((todo, index) => ({ todo, index }))
      .filter(({ todo }) => todo.completed);

    setMutationError(null);
    setTodos((list) => list.filter((todo) => !todo.completed));

    try {
      await clearCompletedTodos();
    } catch (error) {
      setMutationError(
        toErrorMessage(error, "We couldn't clear the completed tasks."),
      );

      // This one fans out a DELETE per task, so a failure can leave some of
      // them gone and others not. Guessing would put deleted rows back on
      // screen, so ask the API what actually survived; only if that fails too
      // do we fall back to restoring what we removed.
      try {
        setTodos(await listTodos());
      } catch {
        setTodos((list) =>
          removed.reduce(
            (acc, { todo, index }) => insertAt(acc, index, todo),
            list,
          ),
        );
      }
    }
  }

  const active = todos.filter((todo) => !todo.completed);
  const completed = todos.filter((todo) => todo.completed);

  const visible =
    filter === "active" ? active : filter === "completed" ? completed : todos;

  const progress =
    todos.length === 0
      ? 0
      : Math.round((completed.length / todos.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Composer */}
      <form
        action={formAction}
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
            { value: "all", label: "All", count: todos.length },
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
                onToggle={(next) => toggle(todo, next)}
                onRename={(next) => rename(todo, next)}
                onDelete={() => remove(todo)}
              />
            ))}
          </ul>
        )}

        {todos.length > 0 && (
          <div className="flex items-center justify-between border-t border-hairline bg-surface-sunken/50 px-4 py-2.5">
            <span className="text-xs text-ink-muted">
              {active.length} {active.length === 1 ? "task" : "tasks"} left
            </span>

            {completed.length > 0 && (
              <button
                type="button"
                onClick={() => void clearCompleted()}
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

/** Replaces one todo's fields, leaving the rest of the list untouched. */
function setField(list: Todo[], id: string, patch: Partial<Todo>): Todo[] {
  return list.map((todo) => (todo.id === id ? { ...todo, ...patch } : todo));
}

/** Puts a todo back at the position it was removed from. */
function insertAt(list: Todo[], index: number, todo: Todo): Todo[] {
  const next = [...list];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, todo);
  return next;
}

function emptyToUndefined(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? undefined : text;
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
