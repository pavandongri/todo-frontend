import * as z from "zod";

/**
 * Client-side mirrors of the API's request schemas.
 *
 * These exist to give fast, inline feedback — the API re-validates everything
 * and its `details[]` are surfaced the same way. Bounds are kept identical to
 * the OpenAPI document so the form never rejects something the API would accept.
 */

export const LoginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z.string().min(1, { error: "Enter your password." }),
});

export const SignupSchema = z.object({
  // Optional in the API; required here so every account has something to
  // display. `signupRequest` omits it entirely when blank.
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter your name." })
    .max(80, { error: "Name must be 80 characters or fewer." }),
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .max(128, { error: "Password must be 128 characters or fewer." }),
});

export const TodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Give the task a title." })
    .max(200, { error: "Keep the title under 200 characters." }),
  description: z
    .string()
    .trim()
    .max(2000, { error: "Keep the description under 2000 characters." })
    .optional(),
  /** From an `<input type="date">`, so `YYYY-MM-DD` or empty. */
  dueAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Enter a valid date." })
    .optional(),
});

/** zod v4's field-error shape, ready for `ActionState.fieldErrors`. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
