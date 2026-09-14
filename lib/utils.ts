import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * What to call a user in the UI.
 * The API allows `name` to be null, so fall back to the email's local part
 * rather than rendering an empty string or "null".
 */
export function displayName(user: {
  name: string | null;
  email: string;
}): string {
  return user.name?.trim() || user.email.split("@")[0];
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats a due date for display.
 *
 * Deliberately derived from the UTC parts rather than `toLocaleDateString`,
 * which is locale- and timezone-dependent and so renders differently in two
 * places that must agree. Due dates are stored at midday UTC so the UTC
 * calendar day always matches the day the user picked.
 */
export function formatDueDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const label = `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  return date.getUTCFullYear() === now.getUTCFullYear()
    ? label
    : `${label} ${date.getUTCFullYear()}`;
}

/** True when a due date is before today, compared on UTC calendar days. */
export function isOverdue(iso: string, now = new Date()): boolean {
  return iso.slice(0, 10) < now.toISOString().slice(0, 10);
}

/** The `YYYY-MM-DD` value an `<input type="date">` expects. */
export function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Turns a date-only input (`YYYY-MM-DD`) into the date-time the API stores.
 *
 * Anchored at midday UTC so rendering it back in the viewer's timezone lands on
 * the day they picked, rather than slipping a day either way.
 */
export function toDueAtIso(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/**
 * Validates a `?next=` destination before navigating to it.
 *
 * The guard in `useRequireSession` puts the blocked path here, but the query
 * string is attacker-controlled: anything that isn't a plain in-app path could
 * bounce a freshly signed-in user to another origin. `//evil.com` and
 * `https://evil.com` are both rejected — only a single leading slash passes.
 */
export function safeNextPath(next: string | null, fallback: string): string {
  if (!next) return fallback;

  const decoded = (() => {
    try {
      return decodeURIComponent(next);
    } catch {
      return "";
    }
  })();

  const isInternal = /^\/(?!\/)/.test(decoded) && !decoded.startsWith("/\\");
  return isInternal ? decoded : fallback;
}
