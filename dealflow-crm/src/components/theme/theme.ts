export type ThemePref = "light" | "dark" | "system";
export const THEME_COOKIE = "prospect-theme";

/** Runs before first paint so the page never flashes the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|system)/);var p=m?m[1]:"light";var t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function readThemePref(): ThemePref {
  if (typeof document === "undefined") return "light";
  const m = new RegExp(`(?:^|; )${THEME_COOKIE}=(light|dark|system)`).exec(document.cookie);
  return (m?.[1] as ThemePref) ?? "light";
}

export function applyThemePref(pref: ThemePref) {
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`;
  const t = pref === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref;
  document.documentElement.setAttribute("data-theme", t);
}
