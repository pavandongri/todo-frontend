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
  `UNAUTHORIZED` and `INVALID_SESSION`; `ApiError.isNetworkFailure` covers
  `NETWORK_ERROR`, which this client raises locally when the request never
  reached the API.
- Every response carries `x-request-id`, preserved as `ApiError.requestId`.

| Endpoint                  | Function in `lib/api/`                      |
| ------------------------- | ------------------------------------------- |
| `POST /api/auth/register` | `signupRequest` (also signs in)             |
| `POST /api/auth/login`    | `loginRequest`                              |
| `POST /api/auth/logout`   | `logoutRequest` (204 even with no session)  |
| `GET /api/auth/me`        | `fetchCurrentUser` → use via `useSession()` |
| `GET /api/todos`          | `listTodos` (paginates, 100/page)           |
| `POST /api/todos`         | `createTodo`                                |
| `PATCH /api/todos/{id}`   | `updateTodo` (422 on an empty patch)        |
| `DELETE /api/todos/{id}`  | `deleteTodo`                                |

Source of truth: `demo-backend/openapi/openapi.yaml`. Mirror changes into
`lib/types.ts` and `lib/validation.ts`.

## How a request actually travels

```
component  →  lib/api/todos.ts  →  apiRequest()  →  fetch(API origin, credentials: "include")
                                                          │
                                                          ▼
                                        demo-backend :5000 (CORS: allow this origin + credentials)
```

There is no step on the Next.js server. If you find yourself wanting one, you
are about to reintroduce the hop this architecture removed.

## Add a field to Todo

1. `lib/types.ts` — add it to `Todo`.
2. `lib/validation.ts` — add it to `TodoSchema`, with bounds **identical** to the
   API's, so the form never rejects something the API would accept.
3. `lib/api/todos.ts` — add it to `TodoInput`, to `pruneEmpty` (empty optionals
   must be absent, not blank), and to `updateTodo`'s patch type.
4. `components/todos/todo-board.tsx` — composer input + controlled state; pull it
   from `FormData` in `submit`, put it in `values` so it survives a failed
   submit, and include it in the optimistic row.
5. `components/todos/todo-item.tsx` — render it.

## Add a mutation

Mutations live in the component that owns the state they change. The board's
`mutate` takes the change and its inverse:

```ts
function archive(todo: Todo) {
  void mutate(
    (list) => setField(list, todo.id, { archived: true }),
    (list) => setField(list, todo.id, { archived: todo.archived }),
    () => updateTodo(todo.id, { archived: true }),
    "We couldn't archive that task.",
  );
}
```

`mutate` paints `apply` immediately, sends the request, and on failure applies
`revert` and shows a banner. It never throws — an exception escaping an action
called inside a transition takes the route down.

Why an inverse rather than a snapshot of the whole list: a snapshot taken before
a slow request would, on revert, also erase anything added while it was in
flight.

## Add a form

1. Schema in `lib/validation.ts`.
2. A `"use client"` component. The action is a plain async function —
   `useActionState` accepts either that or a Server Action, and this app has no
   Server Actions:

```tsx
"use client";
async function submit(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = { email: String(formData.get("email") ?? "") };

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, values, fieldErrors: fieldErrors(parsed.error) };
  }

  try {
    setUser(await loginRequest(parsed.data)); // tells the navbar too
  } catch (error) {
    return { ...toActionState(error, "Something went wrong."), values };
  }

  router.replace("/todos"); // not `redirect()` — that is server-side
  return { ok: true };
}

const [state, formAction, pending] = useActionState(submit, null);
```

3. Render with `Field` + `Input` + `Button`, echoing `state.values` back through
   `defaultValue`. **Never echo a password back.**

## Add a route

1. `app/<segment>/page.tsx`. Keep it a Server Component holding `export const
metadata` (the root layout's title template appends `· Cadence`).
2. Needs data or the session? It cannot fetch here — this server has no session
   cookie. Render a `"use client"` view that fetches for itself, the way
   `app/todos/page.tsx` renders `<TodosView/>`.
3. Signed-in only? Call `useRequireSession()` in that client view and render a
   skeleton while `loading` is true. This is a **UX** redirect; the API is what
   actually refuses unauthorized reads.
4. Reading `params`/`searchParams`? They are **Promises** — `await props.params`.
   Type with `PageProps<'/your/[route]'>`. Reading them from the client with
   `useSearchParams` needs a `<Suspense>` boundary, as `/login` shows.

## Add an optimistic interaction

The board's pattern, in `components/todos/todo-board.tsx`:

- Paint the change, send the request, undo exactly that change on failure — see
  "Add a mutation" above.
- For a **create**, mint a temporary id with the `optimistic-` prefix, then swap
  the placeholder for the row the API returns. Those ids **must never reach the
  API** — it only accepts UUIDs — so `isPending()` gates a row's controls until
  the real row arrives.
- Surface the failure message in a `FormBanner`. Nothing reverts by itself any
  more; there is no server state to fall back to.

## Add an environment variable

`lib/env.ts` (`EnvSchema` + `PublicEnv`) → `.env.example` with a comment saying
why it's required → `README.md`. There are no defaults: `instrumentation.ts`
exits the process at start-up if anything is missing or malformed.

Anything the browser needs must be prefixed `NEXT_PUBLIC_`, which compiles it
into the client bundle — so it **must not be a secret**. Reference it as a
literal `process.env.NEXT_PUBLIC_FOO`; a computed lookup is not substituted and
comes out `undefined` in the browser. This app has no server-only secrets, and
adding one would mean adding a server that holds it.

## Debug a failing request

1. Open the Network panel. Every `/api/*` row should show the **API's** origin.
   One pointing at `:3000` means a `fetch` escaped `lib/api/` with a relative URL.
2. `ApiError.requestId` maps straight to the backend logs — quote it.
3. **CORS error in the console, or a `NETWORK_ERROR` banner.** The API must have
   this app's exact origin in `CORS_ORIGIN` and send
   `Access-Control-Allow-Credentials: true`. Check with:

   ```bash
   curl -i -X OPTIONS http://localhost:5000/api/auth/login \
     -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST"
   ```

4. **Everyone looks signed out, but `/api/auth/me` returns 200 in curl.** The
   cookie is not being sent: either the call skipped `credentials: "include"`,
   or the cookie's `SameSite`/`Secure` attributes don't fit the deployment. Across
   two different sites in production that means `SameSite=None; Secure`, which
   requires HTTPS on both.
5. Requests 404 against this app → `NEXT_PUBLIC_API_BASE_URL` points at :3000
   instead of the backend's :5000 (`assertNotSelf` catches the obvious cases).
6. Changed `.env` but the browser still calls the old origin → `NEXT_PUBLIC_*` is
   baked in at build time. Restart `next dev`.
7. ESLint "Call the API through lib/api" → a `fetch` crept outside `lib/api/`.
