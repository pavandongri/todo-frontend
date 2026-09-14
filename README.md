# Cadence

A todo app built on Next.js 16 (App Router, Turbopack) with Tailwind CSS v4 and
a centrally themed light/dark design system. The browser talks **directly** to
the Todo API in `demo-backend`, using that service's httpOnly session cookie.

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

One variable, **required**, with no default. Put it in `.env` (copy
`.env.example`):

```bash
NEXT_PUBLIC_API_BASE_URL="http://localhost:5000"   # the backend's PORT
```

The `NEXT_PUBLIC_` prefix is load-bearing: the browser makes the API calls, so
this origin is compiled into the client bundle. Nothing secret can ever live
here — and this app holds no secrets, because it has no server-side logic to
hold them.

It is read as a literal `process.env.NEXT_PUBLIC_API_BASE_URL`; Next.js
substitutes the value at build time by matching that exact text, so a computed
lookup would come out `undefined` in the browser. Changing `.env` therefore needs
a `next dev` restart.

`instrumentation.ts` validates it in `register()`, which Next.js runs once per
server instance before any request is handled. Anything missing or malformed
prints what's wrong and exits — `next dev` and `next start` both refuse to come
up rather than shipping a bundle that fails in every visitor's browser:

```
Invalid environment configuration:

  NEXT_PUBLIC_API_BASE_URL  is not set

Copy .env.example to .env and fill in the values.
```

It is also rejected if it points at this app's own origin, which would send
requests to a server that has no API routes at all.

**The backend must allow this app's origin.** Set `CORS_ORIGIN=http://localhost:3000`
in `demo-backend/.env`; the API already answers with
`Access-Control-Allow-Credentials: true`, which is what makes the cookie work.

Validation is lazy and memoised, so importing `lib/env.ts` never throws and
`next build` still succeeds on machines with no runtime configuration.

There are no seeded accounts — register through the UI.

---

## How the integration is wired

Every API request is made **by the browser, straight to the API**:

```
browser ──────────────────► demo-backend :5000     ← every /api/* call
   │
   └── Next.js :3000 serves HTML, JS and CSS. That is all it does.
```

Open the Network panel and every `/api/*` row shows the API's origin. Next.js
never appears in that path — there is no `browser → Next.js → API` hop, no API
routes, no Server Actions, no server-side session.

Why: the hop bought nothing here. It doubled the latency of every mutation, hid
the real requests from the Network panel, and made a pure frontend behave like a
backend-for-frontend without any of the reasons to be one. The cost of removing
it is that the Next.js server can no longer render user data — see
"Where authorization happens".

Every HTTP call goes through `lib/api/client.ts`, the single place that touches
the network, so the API origin, `credentials: "include"`, the `data` envelope and
`ApiError` handling are applied uniformly. An ESLint rule
(`no-restricted-globals` on `fetch`, scoped to `app/`, `components/` and `lib/`
outside `lib/api/`) keeps it that way; a stray `fetch` would bypass all four, and
a relative URL would hit this app's origin, where nothing is served.

Every operation maps to one `operationId` in
`demo-backend/openapi/openapi.yaml`:

| API operation             | Frontend                            |
| ------------------------- | ----------------------------------- |
| `POST /api/auth/register` | `signupRequest`                     |
| `POST /api/auth/login`    | `loginRequest`                      |
| `POST /api/auth/logout`   | `logoutRequest`                     |
| `GET /api/auth/me`        | `fetchCurrentUser` → `useSession()` |
| `GET /api/todos`          | `listTodos`                         |
| `POST /api/todos`         | `createTodo`                        |
| `PATCH /api/todos/{id}`   | `updateTodo`                        |
| `DELETE /api/todos/{id}`  | `deleteTodo`                        |

`lib/types.ts` mirrors the spec's `User` and `Todo` schemas. If the spec
changes, start there.

### Cookie auth across two origins

The session cookie is set by the API, on the API's origin, and stays httpOnly —
no token ever passes through JavaScript. Two things make that work from the
browser:

- **`credentials: "include"`** on every call. These are cross-origin requests, so
  the browser attaches no cookies unless asked. Without it everything is 401.
- **CORS on the API.** It must echo this app's exact origin and send
  `Access-Control-Allow-Credentials: true` — a wildcard `*` is illegal alongside
  credentials. Mutations are preceded by an `OPTIONS` preflight; that extra row in
  the Network panel is correct, not a bug.

Nothing in this app can read the cookie, which is the point. It also means there
is no `SESSION_COOKIE_NAME` to configure any more: knowing the name would buy
nothing when the browser handles the cookie for us.

In development both origins are `localhost`, so `SameSite=Lax` is enough. Across
two genuinely different sites in production the API must issue the cookie as
`SameSite=None; Secure`, which requires HTTPS on both — the backend already does
this when `NODE_ENV=production`.

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

**In the API, and nowhere else.** Every `/api/todos` request without a valid
session cookie comes back 401 regardless of what this app renders.

`components/auth/session.tsx` holds the UI's view of that: one `/api/auth/me` per
page load, kept in context so the navbar and the page share it. `useRequireSession()`
redirects a signed-out visitor to `/login`, and `useRedirectWhenSignedIn()` does
the reverse on `/login` and `/signup`.

> **These are UX redirects, not a security boundary.** Anyone can edit client
> state or call the API themselves. That is fine — nothing here grants access.
> Do not add a check to this app and treat it as protection.

The old server-side guard (`proxy.ts`) and Data Access Layer (`lib/dal.ts`) are
gone, because they no longer _can_ work: the session cookie belongs to the API's
origin, so this server never receives it and cannot tell who is asking. Anything
that renders user data must therefore be a Client Component that fetches for
itself — which is why `app/todos/page.tsx` is an empty shell around
`<TodosView/>`.

One thing this buys back: the old `proxy.ts` could not redirect a signed-in user
away from `/login`, because a cookie can outlive the session it points at and
bouncing on mere presence caused an infinite loop. A real `/api/auth/me` answer
has no such ambiguity, so `useRedirectWhenSignedIn()` is safe.

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

Board mutations never throw — an exception escaping an action called from a
transition takes the whole route down, and a single failed toggle should never do
that. `TodoBoard.mutate` takes a change _and its inverse_: it paints the change,
sends the request, and on failure applies the inverse and shows the reason in a
banner.

The inverse matters. With no server-rendered list to fall back on, `TodosView`'s
`useState` is the only copy of the data that exists, so a failed request has to
undo precisely what it did. Restoring a snapshot of the whole list would also
erase any task added while the failed request was in flight.

`clearCompleted` is the exception: it fans out one DELETE per task, so a partial
failure leaves some genuinely deleted. Rather than guess, it refetches.

The composer is controlled rather than using `defaultValue`. React resets a form
once its action settles, which against a real API is a second or two after
submit — long enough to have started typing the next task, which an uncontrolled
input would then lose.

### When the API is unreachable

A `fetch` that never completes — the API is down, the network is offline, or CORS
blocked the response — becomes an `ApiError` with code `NETWORK_ERROR` and status
0, so it flows through the same handling as any API failure. The developer-facing
hint (check CORS, check the API is running) goes to the console; the user sees
plain prose.

`SessionProvider` swallows a failed `/api/auth/me` and renders signed-out rather
than throwing: it wraps the whole app, and an error there would blank everything
instead of just the part that needed data. `TodosView` shows the failure with a
"Try again" button, and `app/error.tsx` remains the last resort.

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
components/
  ui/                   design-system primitives
  auth/                 forms, user menu, session.tsx (SessionProvider + guards)
  todos/                view (fetches + owns the list), board, item
lib/
  api/                  client.ts, auth.ts, todos.ts — the only HTTP in the app
  env.ts                the one required environment variable, validated
  form-state.ts         ApiError → ActionState / message
  theme.ts              theme cookie + pre-paint script
  validation.ts         zod schemas mirroring the API's request schemas
instrumentation.ts      start-up environment validation
```

Every route is statically prerendered — none of them fetch on the server.

### Note

Form actions return an `ActionState` that echoes the submitted values back.
React 19 resets an uncontrolled form once its action settles — including on
failure — so without that echo a failed login would wipe the email the user
typed. Passwords are never echoed.

`useActionState` accepts any async `(previous, formData)` function, not only a
Server Action, which is why the forms kept their shape when the server ones were
removed.
