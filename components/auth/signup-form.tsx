"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { FormBanner } from "@/components/auth/form-banner";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, null);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state?.message && <FormBanner message={state.message} />}

      <Field label="Name" htmlFor="name" error={state?.fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Alex Rivera"
          defaultValue={state?.values?.name ?? ""}
          required
          invalid={Boolean(state?.fieldErrors?.name)}
          aria-describedby={state?.fieldErrors?.name ? "name-error" : undefined}
        />
      </Field>

      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
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
        hint="At least 8 characters, with a letter and a number."
        error={state?.fieldErrors?.password}
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          invalid={Boolean(state?.fieldErrors?.password)}
          aria-describedby={
            state?.fieldErrors?.password ? "password-error" : "password-hint"
          }
        />
      </Field>

      <Button type="submit" variant="primary" size="lg" loading={pending}>
        Create account
      </Button>

      <p className="text-center text-[13px] text-ink-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
