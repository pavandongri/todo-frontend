"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import {
  clearCompletedTodos,
  createTodo,
  deleteTodo,
  updateTodo,
} from "@/lib/api/todos";
import { ApiError } from "@/lib/api/client";
import { fieldErrors, TodoSchema } from "@/lib/validation";
import { toDueAtIso } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

const TODOS_PATH = "/todos";

export async function addTodo(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Authorise next to the data, not in a layout — see lib/dal.ts.
  await requireUser();

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

  try {
    await createTodo({
      title: parsed.data.title,
      description: parsed.data.description,
      dueAt: toDueAtIso(parsed.data.dueAt),
    });
  } catch (error) {
    return { ...failure(error, "We couldn't add that task."), values };
  }

  revalidatePath(TODOS_PATH);
  return { ok: true };
}

/**
 * Result of a board mutation.
 *
 * These return rather than throw: an exception escaping a Server Action called
 * from a transition takes the whole route down with it, and a single failed
 * toggle should never do that. The caller reverts its optimistic update and
 * shows `message`.
 */
export type MutationResult = { ok: true } | { ok: false; message: string };

export async function setTodoCompleted(
  id: string,
  completed: boolean,
): Promise<MutationResult> {
  return run(async () => {
    await updateTodo(id, { completed });
  }, "We couldn't update that task.");
}

export async function renameTodo(
  id: string,
  title: string,
): Promise<MutationResult> {
  const trimmed = title.trim();
  if (!trimmed) return { ok: true };

  return run(async () => {
    await updateTodo(id, { title: trimmed.slice(0, 200) });
  }, "We couldn't rename that task.");
}

export async function removeTodo(id: string): Promise<MutationResult> {
  return run(async () => {
    await deleteTodo(id);
  }, "We couldn't delete that task.");
}

export async function clearCompleted(): Promise<MutationResult> {
  return run(async () => {
    await clearCompletedTodos();
  }, "We couldn't clear the completed tasks.");
}

async function run(
  mutate: () => Promise<void>,
  fallback: string,
): Promise<MutationResult> {
  await requireUser();

  try {
    await mutate();
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, message: error.formErrors[0] ?? error.message };
    }
    console.error("Todo mutation failed:", error);
    return { ok: false, message: fallback };
  }

  revalidatePath(TODOS_PATH);
  return { ok: true };
}

function emptyToUndefined(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? undefined : text;
}

function failure(error: unknown, fallback: string): ActionState {
  if (error instanceof ApiError) {
    return {
      ok: false,
      message: error.formErrors[0] ?? error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  console.error("Todo request failed:", error);
  return { ok: false, message: fallback };
}
