<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Cadence — agent guide

Todo app. Next.js 16 App Router + React 19 + Tailwind v4 + zod v4, TypeScript strict.
It is a **pure frontend**: it has no API routes and no database. All data comes from
the `demo-backend` Todo API over an httpOnly session cookie.

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

Requires `.env` with `API_BASE_URL` and `SESSION_COOKIE_NAME` (copy `.env.example`).
Both are required; the server exits at start-up if either is missing.

## Where things live

| Path                                    | What it owns                                                           |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `app/`                                  | Routes. `(auth)/` login+signup, `todos/` the app, `page.tsx` marketing |
| `app/actions/`                          | `"use server"` — the only mutation entry points                        |
| `components/ui/`                        | Design-system primitives (Button, Input, Card, Field…)                 |
| `components/auth/`, `components/todos/` | Feature components                                                     |
| `lib/api/`                              | `client.ts` is the **only** place that calls `fetch`                   |
| `lib/dal.ts`                            | Session reads + authorization (`getCurrentUser`, `requireUser`)        |
| `lib/env.ts`                            | Required env vars, validated once                                      |
| `lib/validation.ts`                     | zod schemas mirroring the API's request schemas                        |
| `app/globals.css`                       | Every colour/shadow/radius token, light + dark                         |
| `proxy.ts`                              | Optimistic cookie-presence route guard (Next 16 renamed `middleware`)  |

## Non-negotiables

1. **Never call `fetch` outside `lib/api/`.** ESLint blocks it. Go through
   `apiRequest` / `apiData` / `apiList` so cookie forwarding, the `data` envelope
   and `ApiError` are applied uniformly.
2. **Authorize next to the data**, not in a layout — layouts don't re-render on
   navigation. Every page and Server Action that touches user data calls
   `requireUser()` from `lib/dal.ts`.
3. **Never hard-code a colour.** Use the semantic utilities (`bg-surface`,
   `text-ink-muted`, `border-hairline`, `shadow-panel`). Tokens live in
   `app/globals.css`, defined twice — `:root` and `[data-theme="dark"]`.
4. **Branch on `ApiError.code`, never on `.message`.** Messages are for humans.
5. **Board mutations return `MutationResult`, they don't throw** — an exception
   escaping a Server Action inside a transition takes the whole route down.
6. **Server Actions echo submitted values back** in `ActionState.values` (never
   passwords). React resets a form once its action settles, including on failure.
7. **Default to Server Components.** Add `"use client"` only for state, effects,
   or event handlers.
8. **`lib/types.ts` mirrors the backend OpenAPI document.** If the API changes,
   start there.

## Read before you write

- `docs/map.md` — which files a given kind of change touches. **Start here.**
- `docs/next-16.md` — what differs from Next 14/15, with bundled-doc paths.
- `docs/design-system.md` — token names and primitive props.
- `docs/recipes.md` — step-by-step for the common changes.
- `README.md` — the narrative "why" behind the architecture decisions.
