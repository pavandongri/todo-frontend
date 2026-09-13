# Where to look

A routing table from "the change I was asked to make" to "the files that change".
Read only the rows you need — that is the point of this file.

## By task

| Task | Read / edit, in order |
| --- | --- |
| Add or change a **backend call** | `lib/api/client.ts` (transport) → `lib/api/todos.ts` or `lib/api/auth.ts` (endpoint) → `lib/types.ts` (shape) |
| Add a **field to a todo** | `lib/types.ts` → `lib/validation.ts` → `lib/api/todos.ts` (`pruneEmpty`) → `app/actions/todos.ts` → `components/todos/todo-board.tsx` (composer + optimistic reducer) → `components/todos/todo-item.tsx` (render) |
| Add a **mutation** | `lib/api/*.ts` (HTTP) → `app/actions/todos.ts` (`run()` wrapper, returns `MutationResult`) → the client component that calls it |
| Add a **form** | `lib/validation.ts` (zod) → `app/actions/*.ts` (returns `ActionState`) → a `"use client"` form using `useActionState` + `Field` + `Input` + `Button` |
| Add a **route** | `app/<segment>/page.tsx`; add `loading.tsx` if it fetches; add the prefix to `PROTECTED_PREFIXES` in `proxy.ts` if signed-in-only |
| Gate a page on **auth** | `await requireUser()` at the top of the page/action. Never in a layout |
| Change **colours / spacing / shadows** | `app/globals.css` only — the two token blocks |
| Add a **UI primitive** | `components/ui/` — copy the shape of `button.tsx` (variant/size record + `cn`) |
| Change **auth / session** behaviour | `lib/dal.ts` → `lib/api/auth.ts` → `proxy.ts` (read its warning comment first) |
| Add an **env var** | `lib/env.ts` (schema + `ServerEnv`) → `.env.example` → `README.md` |
| Handle a new **error case** | `lib/api/client.ts` (`ApiErrorCode`, `buildApiError`) → wherever it is surfaced |
| Change **theming / dark mode** | `lib/theme.ts` (cookie + pre-paint script) → `components/theme-toggle.tsx` → `app/layout.tsx` |

## By file — one line each

**Routes**
- `app/layout.tsx` — root layout: fonts, pre-paint theme script, `<Navbar/>`. Statically prerenderable; do not add `cookies()` here.
- `app/page.tsx` — marketing page. Uses `getCurrentUserSafe()` so an API outage degrades to signed-out.
- `app/error.tsx` — route error boundary, `"use client"`. Main cause in practice: API unreachable.
- `app/(auth)/layout.tsx` — centred card shell. Route group, contributes no URL segment.
- `app/(auth)/login/page.tsx`, `signup/page.tsx` — redirect to `/todos` if already signed in.
- `app/todos/page.tsx` — `requireUser()` + `listTodos()`, renders `<TodoBoard/>`.
- `app/todos/loading.tsx` — skeleton matching the board's layout.

**Server Actions** (`"use server"`)
- `app/actions/auth.ts` — `login`, `signup`, `logout`. Return `ActionState`; `redirect()` sits outside the try/catch because it throws to unwind.
- `app/actions/todos.ts` — `addTodo` (`ActionState`) plus `setTodoCompleted` / `renameTodo` / `removeTodo` / `clearCompleted` (`MutationResult`). All call `requireUser()` then `revalidatePath("/todos")`.

**Data layer**
- `lib/api/client.ts` — the only `fetch` in the app. `apiRequest` forwards the browser's `Cookie` header; `relaySetCookies` copies `Set-Cookie` back; `apiData`/`apiList` unwrap the envelope; `ApiError` carries `code`/`fieldErrors`/`formErrors`/`requestId`.
- `lib/api/auth.ts` — register/login/logout/me, one function per OpenAPI `operationId`.
- `lib/api/todos.ts` — list (walks pages, 100/page, `MAX_PAGES` 10), create, update, delete, clear-completed (fans out DELETEs).
- `lib/dal.ts` — `getCurrentUser` (throws on API failure), `getCurrentUserSafe` (degrades to `null`; for chrome and public pages), `requireUser` (redirects to `/login`). All `React.cache`d, so one `/api/auth/me` per render pass.

**Support**
- `lib/env.ts` — zod-validated `API_BASE_URL` + `SESSION_COOKIE_NAME`. Lazy and memoised so importing never throws during `next build`.
- `lib/types.ts` — `User`, `Todo`, `TodoFilter`, `PaginationMeta`, `ActionState`.
- `lib/validation.ts` — `LoginSchema`, `SignupSchema`, `TodoSchema`, `fieldErrors()`. Bounds match the API's.
- `lib/utils.ts` — `cn`, `displayName`, `formatDueDate`, `isOverdue`, `toDateInputValue`, `toDueAtIso`. Dates are handled in **UTC** to avoid hydration mismatches.
- `lib/theme.ts` — `THEME_COOKIE`, `ThemePreference`, `THEME_SCRIPT` (inlined into `<head>`).
- `instrumentation.ts` — `register()` validates env at start-up and `process.exit(1)` on failure.
- `proxy.ts` — cookie-**presence** check only, no API call. Read its comment before adding a redirect.
- `eslint.config.mjs` — flat config; bans `fetch` outside `lib/api/`.

**Components** — see `docs/design-system.md` for props.
- `components/todos/todo-board.tsx` (356 lines) — the densest file: filter state, `useOptimistic` reducer, controlled composer, optimistic ids prefixed `optimistic-` that must never reach the API.
- `components/todos/todo-item.tsx` — row: toggle, inline rename, delete.
- `components/navbar.tsx` — server component; `<Suspense>` around the user menu.
- `components/theme-toggle.tsx`, `components/nav-links.tsx`, `components/mobile-nav.tsx` — client.

## Things that look like bugs but are not

- `proxy.ts` has **no** "signed-in users can't see `/login`" redirect. Adding one creates an infinite loop when a cookie outlives its session. The comment in the file explains it.
- Board mutations return errors instead of throwing — deliberate, see `app/actions/todos.ts`.
- `formatDueDate` uses UTC parts rather than `toLocaleDateString` — deliberate, prevents hydration mismatch.
- `app/layout.tsx` sets `data-theme="light"` with `suppressHydrationWarning` — the inline script corrects it before paint.
- `getCurrentUserSafe` calls `unstable_rethrow` first — Next signals `redirect()`/`notFound()` by throwing.
