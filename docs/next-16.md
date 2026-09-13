# Next.js 16 in this repo

This project runs **Next.js 16.3.5 / React 19.2.8**. Several things changed from
Next 14/15. Check here before trusting a remembered API; the authoritative text
is bundled at `node_modules/next/dist/docs/`.

## Applies to this codebase

| Thing                                                      | Next 16                                                                                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `middleware.ts`                                            | **Renamed to `proxy.ts`**, exporting a `proxy` function. Runtime is `nodejs` and cannot be configured — no edge. `export const config = { matcher }` is unchanged.                         |
| `cookies()`, `headers()`, `draftMode()`                    | **Async only.** The sync compatibility shim from 15 is gone: `await cookies()`.                                                                                                            |
| `params`, `searchParams`                                   | **Promises** in `page.tsx`, `layout.tsx`, `route.ts`, `default.tsx`, and the metadata image files. `await props.params`.                                                                   |
| Page/layout prop types                                     | Generated global helpers: `PageProps<'/blog/[slug]'>`, `LayoutProps<'/'>`, `RouteContext<'/api/x'>`. `app/layout.tsx` already uses `LayoutProps<"/">`. Regenerate with `npx next typegen`. |
| `revalidateTag`                                            | Now requires a second argument, a `cacheLife` profile: `revalidateTag('todos', 'max')`. The one-arg form is a type error.                                                                  |
| `revalidatePath`                                           | **Unchanged** — `revalidatePath('/todos')` is still correct. This is what the repo uses.                                                                                                   |
| `updateTag(tag)`                                           | New, Server-Actions-only, read-your-writes: expires _and_ refreshes in the same request. Prefer over `revalidateTag` when the user must see their own change immediately.                  |
| `refresh()`                                                | New, from `next/cache`: refreshes the client router from a Server Action.                                                                                                                  |
| `cacheLife` / `cacheTag`                                   | Stable — drop the `unstable_` prefix.                                                                                                                                                      |
| Bundler                                                    | **Turbopack is the default** for `dev` and `build`.                                                                                                                                        |
| `next lint`                                                | **Removed.** `npm run lint` runs `eslint` directly against the flat config.                                                                                                                |
| ESLint                                                     | Flat config only (`eslint.config.mjs`), `eslint-config-next/core-web-vitals` + `/typescript`.                                                                                              |
| `experimental.dynamicIO` / `useCache`                      | Removed; superseded by `cacheComponents`.                                                                                                                                                  |
| `unstable_rootParams`                                      | Removed.                                                                                                                                                                                   |
| AMP, `next/legacy/image`, `images.domains`, runtime config | Removed or deprecated.                                                                                                                                                                     |

Not used here but worth knowing: PPR, `next/image` default changes
(`minimumCacheTTL`, `imageSizes`, `qualities`, local-IP restriction), parallel
routes now requiring `default.js`.

## Bundled docs — where to look

All paths are under `node_modules/next/dist/docs/`.

```
01-app/01-getting-started/     tutorial-style: layouts-and-pages, fetching-data,
                               updating-data, caching, error-handling, 18-upgrading
01-app/02-guides/upgrading/version-16.md    the full breaking-change list
01-app/03-api-reference/
  01-directives/               use-client, use-server, use-cache
  02-components/               link, image, form, script
  03-file-conventions/         page, layout, route, proxy, error, loading,
                               not-found, route-groups, dynamic-routes,
                               instrumentation, 01-metadata/, 02-route-segment-config
  04-functions/                cookies, headers, redirect, revalidatePath,
                               revalidateTag, updateTag, refresh, cacheLife,
                               cacheTag, generate-static-params, …
  05-config/                   next-config-js options, typescript, eslint
  06-cli/                      next dev / build / start / typegen
```

Ignore `02-pages/**` entirely — this app is App Router only.

## React 19 details that bite here

- A form is **reset once its action settles**, including on failure. That is why
  Server Actions echo `values` back in `ActionState` and why the todo composer
  is controlled rather than uncontrolled.
- `useOptimistic` updates survive only inside a transition. React runs form
  actions in one; manual calls need `startTransition`.
- Server Component render is deduped by `React.cache`, which is what makes
  `lib/dal.ts` cost one `/api/auth/me` per render pass.
