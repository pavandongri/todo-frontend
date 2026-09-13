import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { getCurrentUserSafe } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Cadence account.",
};

export default async function LoginPage() {
  // Already signed in? Skip the form.
  if (await getCurrentUserSafe()) redirect("/todos");

  return (
    <Card className="shadow-modal">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-[22px]">Welcome back</CardTitle>
        <CardDescription>
          Sign in to pick up where you left off.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
