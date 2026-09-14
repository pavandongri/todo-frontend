"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginRequest } from "@/lib/api/auth";
import { useRedirectWhenSignedIn } from "@/components/auth/session";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { FormBanner } from "@/components/auth/form-banner";
import { fieldErrors, LoginSchema } from "@/lib/validation";
import { toActionState } from "@/lib/form-state";
import { safeNextPath } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Sends an already-signed-in visitor straight to their tasks.
  const { setUser } = useRedirectWhenSignedIn();

  /**
   * A plain async function, not a Server Action — `useActionState` accepts
   * either. The `POST /api/auth/login` it makes goes from this browser to the
   * API, and the `Set-Cookie` that comes back is applied by the browser itself.
   */
  async function submit(
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

    try {
      // Adopting the user the API just returned saves a second /me round trip.
      setUser(await loginRequest(parsed.data));
    } catch (error) {
      return {
        ...toActionState(error, "Something went wrong. Please try again."),
        values,
      };
    }

    // `replace`, not `push`: the sign-in form should not sit in the back stack.
    router.replace(safeNextPath(searchParams.get("next"), "/todos"));
    return { ok: true };
  }

  const [state, formAction, pending] = useActionState(submit, null);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state?.message && <FormBanner message={state.message} />}

      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          // Restores what was typed after React resets the form on failure.
          defaultValue={state?.values?.email ?? ""}
          required
          invalid={Boolean(state?.fieldErrors?.email)}
          aria-describedby={
            state?.fieldErrors?.email ? "email-error" : undefined
          }
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state?.fieldErrors?.password}
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          invalid={Boolean(state?.fieldErrors?.password)}
          aria-describedby={
            state?.fieldErrors?.password ? "password-error" : undefined
          }
        />
      </Field>

      <Button type="submit" variant="primary" size="lg" loading={pending}>
        Sign in
      </Button>

      <p className="text-center text-[13px] text-ink-muted">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
