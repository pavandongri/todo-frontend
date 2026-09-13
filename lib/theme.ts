export const THEME_COOKIE = "theme";

export const THEME_OPTIONS = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number];

export const DEFAULT_THEME: ThemePreference = "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (THEME_OPTIONS as readonly string[]).includes(value)
  );
}

/**
 * Runs before first paint, inlined into <head>.
 *
 * Reading the cookie here rather than with `cookies()` in the root layout keeps
 * the layout statically prerenderable — the docs' recommended trade-off — while
 * still avoiding a flash of the wrong theme.
 */
export const THEME_SCRIPT = `(function(){try{
var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]*)/);
var p=m?decodeURIComponent(m[1]):"${DEFAULT_THEME}";
var t=p==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;
document.documentElement.setAttribute("data-theme",t);
document.documentElement.setAttribute("data-theme-preference",p);
}catch(e){}})()`;
