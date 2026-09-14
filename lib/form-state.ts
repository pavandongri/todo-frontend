import { ApiError } from "@/lib/api/client";
import type { ActionState } from "@/lib/types";

/**
 * Turns a failed API call into the shape `useActionState` renders.
 *
 * The API re-validates every request and returns `details[]` per field, so a
 * rejection usually carries more precise messages than our local zod schemas
 * could. `fallback` only covers the case where something other than an
 * `ApiError` escaped.
 */
export function toActionState(error: unknown, fallback: string): ActionState {
  if (error instanceof ApiError) {
    return {
      ok: false,
      // `(root)` issues have no field to attach to, so they lead the banner.
      message: error.formErrors[0] ?? error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  console.error(fallback, error);
  return { ok: false, message: fallback };
}

/** The same, reduced to a single line of prose for the board's error banner. */
export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.formErrors[0] ?? error.message;

  console.error(fallback, error);
  return fallback;
}
