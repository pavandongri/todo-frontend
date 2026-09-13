import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCurrentUserSafe } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Cadence account.",
};

export default async function SignupPage() {
  if (await getCurrentUserSafe()) redirect("/todos");

  return (
    <Card className="shadow-modal">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-[22px]">Create your account</CardTitle>
        <CardDescription>Start organising your work in a minute.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
