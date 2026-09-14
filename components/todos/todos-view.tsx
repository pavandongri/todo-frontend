"use client";

import { useEffect, useState } from "react";
import { listTodos } from "@/lib/api/todos";
import { useRequireSession } from "@/components/auth/session";
import { TodoBoard } from "@/components/todos/todo-board";
import { TodosSkeleton } from "@/components/todos/todos-skeleton";
import { FormBanner } from "@/components/auth/form-banner";
import { Button } from "@/components/ui/button";
import { toErrorMessage } from "@/lib/form-state";
import { displayName } from "@/lib/utils";
import type { Todo } from "@/lib/types";

/**
 * Loads the task list in the browser and owns it from then on.
 *
 * There is no `revalidatePath` here any more — nothing on the server holds a
 * copy to invalidate. `todos` in this component *is* the list, and every
 * mutation updates it directly, which is why `setTodos` is handed down to the
 * board rather than kept private.
 */
export function TodosView() {
  // Redirects to /login when the session turns out to be missing or expired.
  const { user, loading: sessionLoading } = useRequireSession();

  const [todos, setTodos] = useState<Todo[]>([]);
  // `todos` starts as an empty array rather than null so the board can own a
  // plain `Todo[]` setter; `status` is what distinguishes "nothing yet" from
  // "nothing to show".
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  // Bumped by "Try again" to re-run the effect below.
  const [attempt, setAttempt] = useState(0);

  const userId = user?.id;

  // `GET /api/todos` from the browser to the API. There is no server-rendered
  // list behind this — what lands in `todos` is the only copy the app has.
  useEffect(() => {
    if (!userId) return;

    // A reply that arrives after an unmount, or after a retry superseded it,
    // is dropped rather than written into a stale tree.
    let cancelled = false;

    listTodos().then(
      (loaded) => {
        if (cancelled) return;
        setTodos(loaded);
        setStatus("ready");
      },
      (error) => {
        if (cancelled) return;
        setLoadError(toErrorMessage(error, "We couldn't load your tasks."));
        setStatus("error");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  function retry() {
    setStatus("loading");
    setLoadError(null);
    setAttempt((n) => n + 1);
  }

  // Either the session or the first task load is still outstanding.
  if (sessionLoading || !user || status === "loading") {
    return <TodosSkeleton />;
  }

  const firstName = displayName(user).split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-6 animate-fade-up">
        <p className="text-[13px] font-medium text-ink-subtle">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold text-ink">
          Good {greeting()}, {firstName}
        </h1>
      </header>

      <div className="animate-fade-up [animation-delay:60ms]">
        {status === "error" ? (
          <div className="flex flex-col items-start gap-3">
            <FormBanner message={loadError ?? "We couldn't load your tasks."} />
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        ) : (
          <TodoBoard todos={todos} setTodos={setTodos} userId={user.id} />
        )}
      </div>
    </main>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
