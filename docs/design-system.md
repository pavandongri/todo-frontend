# Design system

Tokens live in `app/globals.css`, defined twice — `:root` (light) and
`[data-theme="dark"]` — then exposed to Tailwind v4 via `@theme inline`, which
keeps the `var()` reference so utilities follow the theme at runtime.

**Never hard-code a colour, shadow or radius.** To restyle the app, edit the two
token blocks and nothing else. Dark mode is driven by `data-theme` on `<html>`
(set pre-paint by `THEME_SCRIPT`), not `prefers-color-scheme`, so an explicit
choice can override the OS. The `dark:` variant is redefined accordingly.

## Tokens → Tailwind utilities

| Group | Utility suffixes |
| --- | --- |
| Surfaces | `canvas`, `surface`, `surface-raised`, `surface-sunken`, `surface-hover`, `surface-active` |
| Translucent | `material`, `material-thick` (also standalone utilities that add the blur) |
| Text | `ink`, `ink-muted`, `ink-subtle`, `ink-inverted` |
| Borders | `hairline`, `hairline-strong` |
| Accent | `accent`, `accent-hover`, `accent-active`, `accent-soft`, `accent-ink` |
| Status | `success`, `success-soft`, `warning`, `warning-soft`, `danger`, `danger-soft` |

Use as `bg-surface`, `text-ink-muted`, `border-hairline`, `bg-accent-soft`, etc.

**Shadows** `shadow-xs` `shadow-sm` `shadow-panel` `shadow-popover` `shadow-modal`,
plus `shadow-bevel` / `shadow-bevel-accent` — the inner top highlight that makes
controls look lit from above. Combine with `shadow-[var(--bevel),var(--shadow-sm)]`.

**Radii** `rounded-control` (8px) `rounded-panel` (14px) `rounded-window` (18px).
Anything else is an arbitrary value, e.g. `rounded-[9px]`.

**Motion** `ease-[var(--ease-spring)]` (controls settling), `ease-[var(--ease-out-quint)]`.
Entrance utilities: `animate-fade-up`, `animate-pop-in`. Stagger with
`[animation-delay:60ms]`. A `prefers-reduced-motion` block neutralises all of it.

**Focus** `--ring`; the base layer already gives every `:focus-visible` a 2px ring.

## Primitives — `components/ui/`

All are Server Components unless marked **client**. All accept `className`, merged
through `cn()` (`clsx` + `tailwind-merge`, so later utilities win).

| Component | API |
| --- | --- |
| `Button` | `variant`: `primary` \| `secondary` \| `ghost` \| `danger` \| `subtle` (default `secondary`); `size`: `sm` \| `md` \| `lg` \| `icon` (default `md`); `loading` — swaps in a `Spinner` while keeping the label in flow so the width doesn't jump |
| `Input` | `invalid?: boolean` → sets `aria-invalid` and the danger border/ring |
| `Field` | `label`, `htmlFor`, `error?: string[]`, `hint?` — renders the label, children, and inline errors wired for screen readers |
| `Card` | plus `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Badge` | `tone`: `neutral` \| `accent` \| `success` \| `warning` \| `danger` |
| `Avatar` | `name`, `size` (px, default 32) — initials fallback |
| `Checkbox` | **client** |
| `SegmentedControl<T extends string>` | **client** — the todo filter control |
| `DropdownMenu` | **client** — plus `DropdownMenuItem`, `DropdownMenuLink`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `useDropdownMenu()` |
| `Spinner`, `Skeleton` | presentational |

`components/auth/form-banner.tsx` — `FormBanner({ tone: "danger" | "accent" })`,
the form-level error banner used by both auth forms and the todo board.

## House style

- Size with the `size-*` shorthand (`size-9`) rather than `h-9 w-9`.
- Small type uses arbitrary sizes for optical fit: `text-[13px]`, `text-[15px]`.
- Decorative SVGs are inline, `aria-hidden="true"`, `fill="none"`,
  `stroke="currentColor"`.
- Transition only what moves:
  `transition-[background-color,transform] duration-150 ease-[var(--ease-spring)]`.
- Presses settle with `active:scale-[0.97]`.
- Long class lists are split into concatenated strings grouped by concern —
  see `components/ui/button.tsx`.
