export type ThemeMode = "light" | "dark";

export const DEFAULT_THEME_MODE: ThemeMode = "light";
export const THEME_STORAGE_KEY = "checkin-theme";

export function parseThemeMode(value: string | null | undefined): ThemeMode | null {
  return value === "light" || value === "dark" ? value : null;
}

export function applyThemeMode(theme: ThemeMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  }
}

export function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  return parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function persistTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}
