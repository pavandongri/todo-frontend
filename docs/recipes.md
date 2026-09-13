# Recipes

Copy-the-shape instructions for the changes this codebase actually gets. Each
one lists the files in the order they should be edited.

## The API contract in one screen

- Success: `{ "data": … }`; lists add a sibling `"meta"` (`page`, `limit`, `total`, `totalPages`).
- Failure: `{ "error": { "code", "message", "details?", "requestId" } }`.
- `details` is `[{ field, message }]`. `lib/api/client.ts` splits it into
  `fieldErrors` (keyed by the leaf field name, so inputs render inline) and
  `formErrors` (the API's `(root)` issues, which lead the banner).
- **Branch on `code`, never on `message`.** `ApiError.isUnauthenticated` covers
  `UNAUTHORIZED` and `INVALID_SESSION`.
- Every response carries `x-request-id`, preserved as `ApiError.requestId`.

| Endpoint | Function in `lib/api/` |
| --- | --- |
| `POST /api/auth/register` | `signupRequest` (also signs in) |
| `POST /api/auth/login` | `loginRequest` |
| `POST /api/auth/logout` | `logoutRequest` (204 even with no session) |
| `GET /api/auth/me` | `fetchCurrentUser` → use via `lib/dal.ts` |
| `GET /api/todos` | `listTodos` (paginates, 100/page) |
| `POST /api/todos` | `createTodo` |
| `PATCH /api/todos/{id}` | `updateTodo` (422 on an empty patch) |
| `DELETE /api/todos/{id}` | `deleteTodo` |

Source of truth: `demo-backend/openapi/openapi.yaml`. Mirror changes into
`lib/types.ts` and `lib/validation.ts`.

## Add a field to Todo

1. `lib/types.ts` — add it to `Todo`.
2. `lib/validation.ts` — add it to `TodoSchema`, with bounds **identical** to the
   API's, so the form never rejects something the API would accept.
3. `lib/api/todos.ts` — add it to `TodoInput`, to `pruneEmpty` (empty optionals
   must be absent, not blank), and to `updateTodo`'s patch type.
4. `app/actions/todos.ts` — pull it from `FormData`, put it in `values` so it
   survives a failed submit, pass it to `createTodo`.
5. `components/todos/todo-board.tsx` — composer input + controlled state, and the
   optimistic `add` payload in `reduce`.
6. `components/todos/todo-item.tsx` — render it.

## Add a Server Action that mutates

```ts
// app/actions/todos.ts
export async function archiveTodo(id: string): Promise<MutationResult> {
  return run(async () => {
    await updateTodo(id, { archived: true });
  }, "We couldn't archive that task.");
}
```
`run()` already does `requireUser()`, `ApiError` → message, and
`revalidatePath("/todos")`. **Return** failures; do not throw — an exception
escaping an action called inside a transition takes the route down.

For a form-backed action use the `(previous, formData) => ActionState` shape
instead, and echo `values` back on every failure path.

## Add a form

1. Schema in `lib/validation.ts`.
2. Action in `app/actions/`: `safeParse` → on failure
   `{ ok: false, values, fieldErrors: fieldErrors(parsed.error) }` → call
   `lib/api/` → `redirect()` **outside** the try/catch (it throws to unwind).
3. Client component:

```tsx
"use client";
const [state, formAction, pending] = useActionState(login, null);
<form action={formAction}>
  {state?.message && <FormBanner>{state.message}</FormBanner>}
  <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
    <Input id="email" name="email" defaultValue={state?.values?.email}
           invalid={!!state?.fieldErrors?.email} />
  </Field>
  <Button type="submit" variant="primary" size="lg" loading={pending}>Sign in</Button>
</form>
```
Never echo a password back.

## Add a route

1. `app/<segment>/page.tsx`. Server Component by default; `export const metadata`
   (the root layout's title template appends `· Cadence`).
2. Signed-in only? `const user = await requireUser();` first, and add the prefix
   to `PROTECTED_PREFIXES` in `proxy.ts`.
3. Fetches data? Add `loading.tsx` with `Skeleton`s laid out like the real page.
4. Reading `params`/`searchParams`? They are **Promises** — `await props.params`.
   Type with `PageProps<'/your/[route]'>`.

## Add an optimistic interaction

The board's pattern, in `components/todos/todo-board.tsx`:
- `useOptimistic(todos, reduce)` with a discriminated-union action and a pure reducer.
- Client-minted ids use the `optimistic-` prefix. **They must never reach the
  API** — it only accepts UUIDs. `isPending()` gates a row's controls until the
  server confirms it.
- Apply the optimistic update inside a transition; form actions already are one.
- On `{ ok: false }`, surface `message` in a banner — the optimistic state
  reverts by itself when the action settles.

## Add an environment variable

`lib/env.ts` (`EnvSchema` + `ServerEnv`) → `.env.example` with a comment saying
why it's required → `README.md`. There are no defaults: `instrumentation.ts`
exits the process at start-up if anything is missing or malformed.

## Debug a failing request

1. `ApiError.requestId` maps straight to the backend logs — quote it.
2. Everyone looks signed out → `SESSION_COOKIE_NAME` doesn't match the backend's
   `COOKIE_NAME`.
3. Requests hang or 404 against this app → `API_BASE_URL` points at :3000
   instead of the backend's :5000 (`assertNotSelf` catches the loopback case).
4. `app/error.tsx` showing → usually the API is simply not running.
5. ESLint "Call the backend through lib/api" → a `fetch` crept outside `lib/api/`.
