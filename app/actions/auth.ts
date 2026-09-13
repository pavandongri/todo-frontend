"use server";

import { redirect } from "next/navigation";
import { loginRequest, logoutRequest, signupRequest } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { fieldErrors, LoginSchema, SignupSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

export async function login(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Echoed back on every failure path so the form can restore itself.
  const values = { email: String(formData.get("email") ?? "") };

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, values, fieldErrors: fieldErrors(parsed.error) };
  }

  const failure = await attempt(() => loginRequest(parsed.data));
  if (failure) return { ...failure, values };

  // `redirect` throws to unwind, so it must sit outside the try/catch above.
  redirect("/todos");
}

export async function signup(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  const parsed = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, values, fieldErrors: fieldErrors(parsed.error) };
  }

  const failure = await attempt(() => signupRequest(parsed.data));
  if (failure) return { ...failure, values };

  redirect("/todos");
}

export async function logout() {
  await logoutRequest();
  // The redirect re-renders from the server, so the navbar drops the user too.
  redirect("/login");
}

/**
 * Runs a backend call, converting a failure into `ActionState`.
 * Returns `null` on success so the caller can continue to its redirect.
 */
async function attempt(run: () => Promise<unknown>): Promise<ActionState> {
  try {
    await run();
    return null;
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        ok: false,
        // `(root)` issues have no field to attach to, so they lead the banner.
        message: error.formErrors[0] ?? error.message,
        fieldErrors: error.fieldErrors,
      };
    }

    console.error("Auth request failed:", error);
    return {
      ok: false,
      message: "Something went wrong. Please try again.",
    };
  }
}
