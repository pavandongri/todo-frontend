"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { FormBanner } from "@/components/auth/form-banner";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);

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
          aria-describedby={state?.fieldErrors?.email ? "email-error" : undefined}
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
