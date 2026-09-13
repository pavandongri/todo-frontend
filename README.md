# Cadence

A todo app built on Next.js 16 (App Router, Turbopack) with Tailwind CSS v4 and
a centrally themed light/dark design system. It talks to the Todo API in
`demo-backend` using that service's httpOnly session cookie.

## Working on this codebase

Condensed, task-oriented references live in [`docs/`](docs/) — read the one you
need rather than all of them:

- [`docs/map.md`](docs/map.md) — which files a given kind of change touches. Start here.
- [`docs/next-16.md`](docs/next-16.md) — what Next.js 16 changed, and where the bundled docs are.
- [`docs/design-system.md`](docs/design-system.md) — token names and primitive props.
- [`docs/recipes.md`](docs/recipes.md) — step-by-step for the common changes.

`AGENTS.md` (imported by `CLAUDE.md`) and `.cursor/rules/` carry the same rules
for coding agents. This README remains the narrative "why".

## Running it

The backend listens on **5000**; this app runs on **3000**.

```bash
# terminal 1 — the API
cd ../demo-backend && npm start     # http://localhost:5000

# terminal 2 — this app
npm run dev                         # http://localhost:3000
```

```bash
npm run build
npm start
npm run lint          # eslint (--fix via npm run lint:fix)
npm run format        # prettier --write .  (check only: npm run format:check)
```

## Configuration

Both variables are **required** and have no defaults. Put them in `.env`
(copy `.env.example`):

```bash
API_BASE_URL="http://localhost:5000"   # the backend's PORT
SESSION_COOKIE_NAME="todo_session"     # must match the backend's COOKIE_NAME
```

`instrumentation.ts` validates them in `register()`, which Next.js runs once per
server instance before any request is handled. Anything missing or malformed
prints what's wrong and exits — `next dev` and `next start` both refuse to come
up rather than booting and failing on every request:

```
Invalid environment configuration:

  SESSION_COOKIE_NAME  is not set

Copy .env.example to .env and fill in the values.
```

`API_BASE_URL` is also rejected if it points at this app's own port, which would
loop requests back into Next.js instead of reaching the backend.

Validation is lazy and memoised, so importing `lib/env.ts` never throws and
`next build` still succeeds on machines with no runtime configuration.

There are no seeded accounts — register through the UI.

---

## How the integration is wired

This app has **no API routes of its own**. Every HTTP call goes to the backend
through `lib/api/client.ts`, which is the single place that touches the network —
so cookie forwarding, the `data` envelope and `ApiError` handling are applied
uniformly. An ESLint rule (`no-restricted-globals` on `fetch`, scoped to `app/`,
`components/` and `lib/` outside `lib/api/`) keeps it that way; a stray `fetch`
would bypass all three, and from a Client Component it would hit this app's
origin rather than the backend.

Every operation maps to one `operationId` in
`demo-backend/openapi/openapi.yaml`:

| API operation             | Frontend                          |
| ------------------------- | --------------------------------- |
| `POST /api/auth/register` | `signupRequest`                   |
| `POST /api/auth/login`    | `loginRequest`                    |
| `POST /api/auth/logout`   | `logoutRequest`                   |
| `GET /api/auth/me`        | `fetchCurrentUser` → `lib/dal.ts` |
| `GET /api/todos`          | `listTodos`                       |
| `POST /api/todos`         | `createTodo`                      |
| `PATCH /api/todos/{id}`   | `updateTodo`                      |
| `DELETE /api/todos/{id}`  | `deleteTodo`                      |

`lib/types.ts` mirrors the spec's `User` and `Todo` schemas. If the spec
changes, start there.

### Cookie auth across two servers

Server-side `fetch` sends no cookies of its own, so `lib/api/client.ts` does two
things that make the session work end to end:

- **`apiRequest`** forwards the browser's `Cookie` header upstream on every call.
- **`relaySetCookies`** copies the API's `Set-Cookie` headers onto our own
  response, so the cookie stays httpOnly the whole way and no token ever passes
  through client-side JavaScript.

Because every call is server-to-server, CORS never applies — the backend's
`CORS_ORIGIN` allowlist only matters for requests made from the browser, and
this app makes none. (It is currently set to `http://localhost:5173`; that only
needs changing if you ever call the API directly from client-side code.)

### Errors

The API returns `{ error: { code, message, details?, requestId } }`. `ApiError`
carries all of it:

- **`code`** is the stable identifier — branch on it, never on `message`.
  `isUnauthenticated` covers `UNAUTHORIZED` and `INVALID_SESSION`.
- **`details[]`** is split into `fieldErrors` (keyed to match form field names,
  so inputs render them inline) and `formErrors` (the API's `(root)` issues,
  which surface in the banner).
- **`requestId`** is preserved. Quote it in bug reports — it maps directly to
  the server logs.

### Where authorization happens

`proxy.ts` (Next.js 16 renamed `middleware` → `proxy`) does an **optimistic**
check only: is a session cookie present? It deliberately makes no API call,
because proxy runs on every request including prefetches.

The real check lives in `lib/dal.ts` — `getCurrentUser()` and `requireUser()`,
both wrapped in React `cache` so a page and the navbar cost one `/api/auth/me`
between them. Pages and Server Actions call the DAL, never the layout, because
layouts don't re-render on navigation and can't reliably gate anything.

> **Don't add a "signed-in users can't see /login" redirect to `proxy.ts`.**
> A cookie can outlive the session it points at — expired, revoked, or a
> restarted server. Redirecting on mere cookie presence fights the authoritative
> check in the page: `/login` sends you to `/todos`, `/todos` finds the session
> invalid and sends you back, and the user is locked out of the sign-in form by
> an infinite loop. `/login` and `/signup` call `getCurrentUser()` themselves,
> which validates the session and handles that case correctly.

---

## Where the UI departs from the API

Three places where the spec and the UI didn't line up, and what was decided:

- **No `priority` field.** The UI previously had low/normal/high with coloured
  dots. Nothing in the API can store it, so it was removed and replaced with
  **`dueAt`**, which the API does support (including `sort=dueAt`). Restoring
  priority would need a backend migration, not a frontend change.
- **No bulk delete.** "Clear completed" fans out one `DELETE /api/todos/{id}`
  per task. The ids are re-read from the API first, so a stale board can't ask
  for deletions the user didn't make, and one failure doesn't abandon the rest.
- **Pagination isn't surfaced.** The board filters and counts across the whole
  list, so `listTodos` walks pages at the API's 100-item maximum up to
  `MAX_PAGES` (1,000 todos). Past that the UI would need real pagination rather
  than a larger bound.

### Optimistic updates and a slow API

The board shows new tasks immediately, under a client-minted id
(`optimistic-…`). The API only accepts UUIDs, so until the server confirms a row
its controls are held and a spinner replaces the delete button — otherwise
ticking off a task you just added would send that fake id and get a 422.

Board mutations (`setTodoCompleted`, `renameTodo`, `removeTodo`,
`clearCompleted`) **return** a `MutationResult` rather than throwing. An
exception escaping a Server Action called from a transition takes the whole
route down; a single failed toggle should never do that. On failure the
optimistic change reverts on its own and the reason appears in a banner.

The composer is controlled rather than using `defaultValue`. React resets a form
once its action settles, which against a real API is a second or two after
submit — long enough to have started typing the next task, which an uncontrolled
input would then lose.

### When the API is unreachable

`app/error.tsx` catches it and offers a retry. The navbar and the public pages
use `getCurrentUserSafe()` from `lib/dal.ts`, which degrades to "signed out"
instead of throwing — the navbar renders in the root layout, and an error there
escapes past the route's own boundary to the global fallback, replacing the whole
app rather than just the part that needed data. That helper calls
`unstable_rethrow` first, because Next.js signals `redirect()`, `notFound()` and
dynamic rendering by throwing, and swallowing those breaks the framework.

`name` is nullable in the API, so `displayName()` in `lib/utils.ts` falls back to
the email's local part. Due dates are stored at **midday UTC** and rendered from
their UTC parts — a locale- or timezone-dependent format would differ between
the server and client renders and trip a hydration error.

---

## Theming

`app/globals.css` is the single source of truth. Every colour, shadow, radius and
easing is a CSS variable defined twice — once on `:root`, once on
`[data-theme="dark"]` — then exposed to Tailwind through `@theme inline`, which
keeps the `var()` reference so utilities follow the theme at runtime.

Components use semantic utilities (`bg-surface`, `text-ink-muted`,
`border-hairline`, `shadow-panel`) and never hard-code a hex value. To restyle
the app, edit the two token blocks.

Dark mode is driven by `data-theme` on `<html>`, not `prefers-color-scheme`, so
an explicit choice can override the OS. The preference (`light` / `dark` /
`system`) is stored in a cookie and applied by an inline script in `<head>`
before first paint — the pattern the Next.js docs recommend, which avoids a
flash without opting the root layout out of static prerendering.

---

## Layout

```
app/
  layout.tsx            root layout, fonts, theme script, navbar
  page.tsx              marketing / overview
  (auth)/               login + signup (route group, no URL segment)
  todos/                the app itself
  error.tsx             route error boundary (API unreachable)
  actions/              "use server" — auth.ts, todos.ts
components/
  ui/                   design-system primitives
  auth/                 forms, user menu
  todos/                board + item
lib/
  api/                  client.ts, auth.ts, todos.ts — the only HTTP in the app
  dal.ts                session reads, authorization
  env.ts                required environment variables, validated
  theme.ts              theme cookie + pre-paint script
  validation.ts         zod schemas mirroring the API's request schemas
proxy.ts                optimistic route guard
instrumentation.ts      start-up environment validation
```

### Note

Server Actions return an `ActionState` that echoes the submitted values back.
React 19 resets an uncontrolled form once its action settles — including on
failure — so without that echo a failed login would wipe the email the user
typed. Passwords are never echoed.
