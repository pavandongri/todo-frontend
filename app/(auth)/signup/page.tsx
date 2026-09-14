import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Cadence account.",
};

export default function SignupPage() {
  return (
    <Card className="shadow-modal">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-[22px]">Create your account</CardTitle>
        <CardDescription>
          Start organising your work in a minute.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Redirects an already-signed-in visitor to /todos from the client. */}
        <SignupForm />
      </CardContent>
    </Card>
  );
}
