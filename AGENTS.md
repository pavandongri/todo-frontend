<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Cadence — agent guide

Todo app. Next.js 16 App Router + React 19 + Tailwind v4 + zod v4, TypeScript strict.
It is a **pure frontend**: it has no API routes and no database. All data comes from
the `demo-backend` Todo API, called **directly from the browser** over an httpOnly
session cookie.

## The one architectural fact to hold on to

Every API request goes **browser → API**. Open the Network panel and you will see
`http://localhost:5000/api/...` — the API's origin, not this app's.

```
browser ──────────────────► demo-backend :5000     ← every /api/* call
   │
   └── Next.js :3000 serves HTML, JS and CSS. That is all it does.
```

Next.js never talks to the API. There are no Server Actions, no route handlers,
no server-side session. That has consequences you cannot design around:

- **The server cannot read user data.** The session cookie belongs to the API's
  origin, so this server never receives it. Any page that shows user data must be
  a Client Component that fetches for itself.
- **CORS is load-bearing.** The API must list this app's exact origin in
  `CORS_ORIGIN` and answer with `Access-Control-Allow-Credentials: true`; a
  wildcard `*` is illegal alongside credentials. Mutations are preceded by an
  `OPTIONS` preflight — that extra request in the Network panel is correct.
- **`credentials: "include"` on every call**, or the browser attaches no cookie
  and everything is 401. `lib/api/client.ts` sets it once for all callers.
- **There is no cache to revalidate.** No `revalidatePath`, no `React.cache`
  dedupe. The `useState` in `components/todos/todos-view.tsx` _is_ the list.

## Commands

```bash
npm run dev          # :3000  (backend must be running on :5000)
npm run build
npm run lint         # eslint, flat config
npm run lint:fix
npm run format       # prettier --write .
npm run format:check
```

No test suite. `npx tsc --noEmit` for a type check.
`eslint-config-prettier` is applied last, so lint and format never disagree.

Requires `.env` with `NEXT_PUBLIC_API_BASE_URL` (copy `.env.example`). It is
required; the server exits at start-up if it is missing. The `NEXT_PUBLIC_`
prefix is what inlines it into the client bundle — **never put a secret in it**.

## Where things live

| Path                                    | What it owns                                                           |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `app/`                                  | Routes. `(auth)/` login+signup, `todos/` the app, `page.tsx` marketing |
| `components/ui/`                        | Design-system primitives (Button, Input, Card, Field…)                 |
| `components/auth/`, `components/todos/` | Feature components                                                     |
| `components/auth/session.tsx`           | `SessionProvider`, `useSession`, `useRequireSession`                   |
| `lib/api/`                              | `client.ts` is the **only** place that calls `fetch`                   |
| `lib/env.ts`                            | The one required env var, validated once                               |
| `lib/validation.ts`                     | zod schemas mirroring the API's request schemas                        |
| `lib/form-state.ts`                     | `ApiError` → `ActionState` / message, shared by every form             |
| `app/globals.css`                       | Every colour/shadow/radius token, light + dark                         |

## Non-negotiables

1. **Never call `fetch` outside `lib/api/`.** ESLint blocks it. Go through
   `apiRequest` / `apiData` / `apiList` so the API origin, `credentials:
"include"`, the `data` envelope and `ApiError` are applied uniformly. A
   relative URL would hit this app's origin, where nothing is served.
2. **Authorization is the API's job.** `useRequireSession()` only redirects the
   UI; it grants nothing and protects nothing. Never treat a client-side check as
   a security boundary — the API returns 401 regardless of what we render.
3. **Never hard-code a colour.** Use the semantic utilities (`bg-surface`,
   `text-ink-muted`, `border-hairline`, `shadow-panel`). Tokens live in
   `app/globals.css`, defined twice — `:root` and `[data-theme="dark"]`.
4. **Branch on `ApiError.code`, never on `.message`.** Messages are for humans.
   `NETWORK_ERROR` (status 0) means the request never reached the API at all:
   it is down, offline, or CORS blocked the response.
5. **Mutations return, they don't throw.** An exception escaping an action inside
   a transition takes the whole route down. `TodoBoard.mutate` reverts the change
   and shows a banner instead.
6. **Forms echo submitted values back** in `ActionState.values` (never
   passwords). React resets a form once its action settles, including on failure.
7. **Default to Server Components.** Add `"use client"` only for state, effects,
   event handlers — or, in this app, for anything that touches the API. Keep the
   client boundary as low in the tree as it will go: `app/page.tsx` stays a
   Server Component and only `components/home-cta.tsx` is a client island.
8. **`lib/types.ts` mirrors the backend OpenAPI document.** If the API changes,
   start there.

## Read before you write

- `docs/map.md` — which files a given kind of change touches. **Start here.**
- `docs/next-16.md` — what differs from Next 14/15, with bundled-doc paths.
- `docs/design-system.md` — token names and primitive props.
- `docs/recipes.md` — step-by-step for the common changes.
- `README.md` — the narrative "why" behind the architecture decisions.
