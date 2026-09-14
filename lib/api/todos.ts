import { apiData, apiList } from "@/lib/api/client";
import type { Todo } from "@/lib/types";

const ENDPOINTS = {
  list: "/api/todos",
  item: (id: string) => `/api/todos/${id}`,
} as const;

/** The API's maximum page size. */
const PAGE_LIMIT = 100;

/** Safety bound, so a runaway `totalPages` can't loop forever. */
const MAX_PAGES = 10;

export type TodoInput = {
  title: string;
  description?: string | null;
  dueAt?: string | null;
};

/**
 * Every todo for the signed-in user, newest first.
 *
 * The API paginates at 100 per page, but the board filters and counts across
 * the whole list, so pages are walked until exhausted. Beyond `MAX_PAGES` the
 * UI would need real pagination rather than a bigger bound.
 */
export async function listTodos(): Promise<Todo[]> {
  const todos: Todo[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, meta } = await apiList<Todo>(ENDPOINTS.list, {
      query: { page, limit: PAGE_LIMIT, sort: "createdAt", order: "desc" },
    });

    todos.push(...data);
    if (page >= meta.totalPages) break;
  }

  return todos;
}

export async function createTodo(input: TodoInput): Promise<Todo> {
  return apiData<Todo>(ENDPOINTS.list, {
    method: "POST",
    body: pruneEmpty(input),
  });
}

export async function updateTodo(
  id: string,
  patch: Partial<Pick<Todo, "title" | "description" | "completed" | "dueAt">>,
): Promise<Todo> {
  // The API rejects an empty patch with 422 rather than no-opping.
  return apiData<Todo>(ENDPOINTS.item(id), {
    method: "PATCH",
    body: patch,
  });
}

export async function deleteTodo(id: string): Promise<void> {
  await apiData<void>(ENDPOINTS.item(id), { method: "DELETE" });
}

/**
 * There is no bulk delete in the API, so this fans out one DELETE per todo.
 *
 * The ids are re-read from the server rather than taken from the client, so a
 * stale board can't ask for deletions the user didn't make. Deletes run in
 * parallel and a failure in one doesn't abandon the rest.
 */
export async function clearCompletedTodos(): Promise<void> {
  const { data } = await apiList<Todo>(ENDPOINTS.list, {
    query: { completed: "true", limit: PAGE_LIMIT },
  });

  if (data.length === 0) return;

  const results = await Promise.allSettled(
    data.map((todo) => deleteTodo(todo.id)),
  );

  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    throw failed[0].reason;
  }
}

/** Drops empty optional fields so the API sees them as absent, not blank. */
function pruneEmpty(input: TodoInput): Record<string, unknown> {
  const body: Record<string, unknown> = { title: input.title };

  if (input.description) body.description = input.description;
  if (input.dueAt) body.dueAt = input.dueAt;

  return body;
}
