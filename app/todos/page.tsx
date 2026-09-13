import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { listTodos } from "@/lib/api/todos";
import { TodoBoard } from "@/components/todos/todo-board";
import { displayName } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Your tasks in Cadence.",
};

export default async function TodosPage() {
  // Redirects to /login when there is no valid session.
  const user = await requireUser();
  // The API scopes todos to the session, so no user id is passed.
  const todos = await listTodos();

  const firstName = displayName(user).split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-6 animate-fade-up">
        <p className="text-[13px] font-medium text-ink-subtle">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold text-ink">
          Good {greeting()}, {firstName}
        </h1>
      </header>

      <div className="animate-fade-up [animation-delay:60ms]">
        <TodoBoard todos={todos} userId={user.id} />
      </div>
    </main>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
