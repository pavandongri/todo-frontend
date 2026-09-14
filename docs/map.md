# Where to look

A routing table from "the change I was asked to make" to "the files that change".
Read only the rows you need — that is the point of this file.

> Every `/api/*` request in this app is made **by the browser, straight to the
> API**. Nothing is proxied through Next.js. See `AGENTS.md` for what that rules
> out.

## By task

| Task                                   | Read / edit, in order                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add or change an **API call**          | `lib/api/client.ts` (transport) → `lib/api/todos.ts` or `lib/api/auth.ts` (endpoint) → `lib/types.ts` (shape)                                                                               |
| Add a **field to a todo**              | `lib/types.ts` → `lib/validation.ts` → `lib/api/todos.ts` (`pruneEmpty`) → `components/todos/todo-board.tsx` (composer + the optimistic row in `submit`) → `components/todos/todo-item.tsx` |
| Add a **mutation**                     | `lib/api/*.ts` (HTTP) → `components/todos/todo-board.tsx`: a handler that calls `mutate(apply, revert, run, fallback)`                                                                      |
| Add a **form**                         | `lib/validation.ts` (zod) → a `"use client"` component whose `useActionState` action calls `lib/api/` and maps failures with `toActionState` from `lib/form-state.ts`                       |
| Add a **route**                        | `app/<segment>/page.tsx` (Server Component shell) + a client view if it needs data                                                                                                          |
| Gate a page on **auth**                | `useRequireSession()` in the route's client view. It is a UX redirect only — the API is what actually refuses                                                                               |
| Change **colours / spacing / shadows** | `app/globals.css` only — the two token blocks                                                                                                                                               |
| Add a **UI primitive**                 | `components/ui/` — copy the shape of `button.tsx` (variant/size record + `cn`)                                                                                                              |
| Change **auth / session** behaviour    | `components/auth/session.tsx` → `lib/api/auth.ts`                                                                                                                                           |
| Add an **env var**                     | `lib/env.ts` (schema + `PublicEnv`) → `.env.example` → `README.md`. Anything the browser needs must be `NEXT_PUBLIC_`, so it must not be secret                                             |
| Handle a new **error case**            | `lib/api/client.ts` (`ApiErrorCode`, `buildApiError`) → wherever it is surfaced                                                                                                             |
| Change **theming / dark mode**         | `lib/theme.ts` (cookie + pre-paint script) → `components/theme-toggle.tsx` → `app/layout.tsx`                                                                                               |

## By file — one line each

**Routes** — all five are statically prerendered; none of them fetch on the server.

- `app/layout.tsx` — root layout: fonts, pre-paint theme script, `<SessionProvider>`, `<Navbar/>`. Statically prerenderable; do not add `cookies()` here.
- `app/page.tsx` — marketing page. Server Component; only `<HomeCta/>` is a client island.
- `app/error.tsx` — route error boundary, `"use client"`.
- `app/(auth)/layout.tsx` — centred card shell. Route group, contributes no URL segment.
- `app/(auth)/login/page.tsx` — static shell; `<LoginForm/>` sits behind `<Suspense>` because it reads `?next=` with `useSearchParams`.
- `app/(auth)/signup/page.tsx` — static shell around `<SignupForm/>`.
- `app/todos/page.tsx` — nothing but `metadata` and `<TodosView/>`. The server cannot load todos; it has no session.
- `app/todos/loading.tsx` — renders the shared `<TodosSkeleton/>`.

**Data layer**

- `lib/api/client.ts` — the only `fetch` in the app. Sets the API origin, `credentials: "include"` (this is what carries the cookie cross-origin) and `cache: "no-store"`; `apiData`/`apiList` unwrap the envelope; `ApiError` carries `code`/`fieldErrors`/`formErrors`/`requestId`. A rejected `fetch` becomes `ApiError` with code `NETWORK_ERROR` and status 0.
- `lib/api/auth.ts` — register/login/logout/me, one function per OpenAPI `operationId`. No cookie handling: the browser applies `Set-Cookie` itself.
- `lib/api/todos.ts` — list (walks pages, 100/page, `MAX_PAGES` 10), create, update, delete, clear-completed (fans out DELETEs).
- `components/auth/session.tsx` — `SessionProvider` (one `/api/auth/me` per page load, held in context), `useSession`, `useRequireSession` (redirects signed-out visitors), `useRedirectWhenSignedIn` (for `/login` and `/signup`).

**Support**

- `lib/env.ts` — zod-validated `NEXT_PUBLIC_API_BASE_URL`, the only variable. Lazy and memoised so importing never throws during `next build`. `assertNotSelf` rejects a URL pointing at this app.
- `lib/types.ts` — `User`, `Todo`, `TodoFilter`, `PaginationMeta`, `ActionState`.
- `lib/validation.ts` — `LoginSchema`, `SignupSchema`, `TodoSchema`, `fieldErrors()`. Bounds match the API's.
- `lib/form-state.ts` — `toActionState` (for `useActionState`) and `toErrorMessage` (for a plain banner).
- `lib/utils.ts` — `cn`, `displayName`, `formatDueDate`, `isOverdue`, `toDateInputValue`, `toDueAtIso`, `safeNextPath`. Dates are handled in **UTC**.
- `lib/theme.ts` — `THEME_COOKIE`, `ThemePreference`, `THEME_SCRIPT` (inlined into `<head>`).
- `instrumentation.ts` — `register()` validates env at start-up and `process.exit(1)` on failure.
- `eslint.config.mjs` — flat config; bans `fetch` outside `lib/api/`.

**Components** — see `docs/design-system.md` for props.

- `components/todos/todos-view.tsx` — fetches the list in an effect and owns it. Passes `todos` **and `setTodos`** to the board, because that state is the only copy of the list in existence.
- `components/todos/todo-board.tsx` — the densest file: filter state, controlled composer, `mutate(apply, revert, …)`, optimistic ids prefixed `optimistic-` that must never reach the API.
- `components/todos/todo-item.tsx` — row: toggle, inline rename, delete.
- `components/todos/todos-skeleton.tsx` — shared by `loading.tsx` and `TodosView`.
- `components/auth/account-section.tsx` — navbar's right-hand end; renders from `useSession()`.
- `components/home-cta.tsx` — the marketing hero's buttons, the only part of `/` that needs the session.
- `components/navbar.tsx` — Server Component; the session-dependent part is `<AccountSection/>`.

## Things that look like bugs but are not

- **`setTodos` is passed down into `TodoBoard`.** Lifting it would be tidier if a server copy existed to revalidate against — none does.
- **Mutations revert the specific change rather than restoring a snapshot.** A snapshot revert would also wipe out a task added while the failed request was in flight.
- **`clearCompleted` refetches on failure instead of reverting.** It fans out one DELETE per task, so a partial failure leaves some genuinely deleted; guessing would put dead rows back on screen.
- **You see an `OPTIONS` request before every mutation.** That is the CORS preflight, and it is required.
- **Two of each request in `npm run dev`.** React strict mode double-invokes effects in development only.
- **`todos` starts as `[]`, not `null`.** `status` is what distinguishes "not loaded" from "empty", which lets the board take a plain `Todo[]` setter.
- `formatDueDate` uses UTC parts rather than `toLocaleDateString` — deliberate, prevents hydration mismatch.
- `app/layout.tsx` sets `data-theme="light"` with `suppressHydrationWarning` — the inline script corrects it before paint.
- `SessionProvider` swallows a failed `/api/auth/me` and renders signed-out — an API outage should not blank the whole app.
