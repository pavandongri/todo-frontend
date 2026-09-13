/**
 * Mirrors the `User` and `Todo` schemas in the backend's OpenAPI document
 * (demo-backend/openapi/openapi.yaml). Keep these in step with that spec.
 */

export type User = {
  id: string;
  email: string;
  /** Optional at registration, so it really can be null. */
  name: string | null;
  createdAt: string;
};

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

export type TodoFilter = "all" | "active" | "completed";

/** Pagination envelope returned alongside a todo list. */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/**
 * Shape returned by every Server Action, consumed by `useActionState`.
 * `fieldErrors` keys match the form field names so inputs can render inline.
 */
export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /**
   * The submitted values, echoed back so the form can repopulate itself.
   * React resets an uncontrolled form once its action settles — including on
   * failure — so without this the user loses what they typed. Never carries
   * passwords.
   */
  values?: Record<string, string>;
} | null;
