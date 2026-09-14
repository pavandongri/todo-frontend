import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Cadence account.",
};

export default function LoginPage() {
  return (
    <Card className="shadow-modal">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-[22px]">Welcome back</CardTitle>
        <CardDescription>
          Sign in to pick up where you left off.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/*
          The form reads `?next=` with `useSearchParams`, which opts its subtree
          out of static prerendering unless it sits behind a Suspense boundary.
          The "already signed in? go to /todos" check lives in the form too —
          it needs the session, and the session now lives in the browser.
        */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
