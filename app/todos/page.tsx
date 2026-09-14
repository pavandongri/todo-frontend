import type { Metadata } from "next";
import { TodosView } from "@/components/todos/todos-view";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Your tasks in Cadence.",
};

/**
 * A static shell. Everything below it is a Client Component, because the tasks
 * themselves are fetched by the browser straight from the API — this server
 * never sees the session cookie and could not load them if it wanted to.
 *
 * The page still exists as a Server Component so `metadata` has somewhere to
 * live and the HTML shell stays prerenderable.
 */
export default function TodosPage() {
  return <TodosView />;
}
