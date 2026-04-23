export type ThemeMode = "dark" | "light";

export const defaultThemeMode: ThemeMode = "dark";
export const themeStorageKey = "themeMode";
export const themeModeChangedEvent = "theme-mode-updated";

export const themeModes: Record<
  ThemeMode,
  { bg_color: string; text_color: string }
> = {
  dark: {
    bg_color: "#121212",
    text_color: "#F5F5F5",
  },
  light: {
    bg_color: "#F5F5F5",
    text_color: "#121212",
  },
};

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
  return value === "light" ? "light" : defaultThemeMode;
}

export function getStoredThemeMode() {
  if (typeof window === "undefined") {
    return defaultThemeMode;
  }

  return normalizeThemeMode(window.localStorage.getItem(themeStorageKey));
}

export function setStoredThemeMode(themeMode: ThemeMode) {
  window.localStorage.setItem(themeStorageKey, themeMode);
  window.dispatchEvent(new Event(themeModeChangedEvent));
}

export function getThemeVariables(
  themeMode: ThemeMode,
  accentColor = "#D51919",
) {
  const isDark = themeMode === "dark";
  const themeColors = themeModes[themeMode];

  return {
    "--brand-bg": themeColors.bg_color,
    "--brand-text": themeColors.text_color,
    "--brand-accent": accentColor,
    "--brand-surface": isDark
      ? "rgba(255, 255, 255, 0.04)"
      : "rgba(0, 0, 0, 0.04)",
    "--brand-surface-strong": isDark ? "#171717" : themeColors.bg_color,
    "--brand-field": isDark
      ? "rgba(255, 255, 255, 0.06)"
      : "rgba(0, 0, 0, 0.06)",
    "--brand-field-focus": isDark
      ? "rgba(255, 255, 255, 0.09)"
      : "rgba(0, 0, 0, 0.09)",
    "--brand-soft": isDark
      ? "rgba(255, 255, 255, 0.10)"
      : "rgba(0, 0, 0, 0.10)",
    "--brand-border": isDark
      ? "rgba(255, 255, 255, 0.10)"
      : "rgba(0, 0, 0, 0.10)",
    "--brand-border-strong": isDark
      ? "rgba(255, 255, 255, 0.15)"
      : "rgba(0, 0, 0, 0.15)",
    "--brand-muted": isDark
      ? "rgba(245, 245, 245, 0.65)"
      : "rgba(18, 18, 18, 0.65)",
    "--brand-subtle": isDark
      ? "rgba(245, 245, 245, 0.55)"
      : "rgba(18, 18, 18, 0.55)",
    "--brand-faint": isDark
      ? "rgba(245, 245, 245, 0.45)"
      : "rgba(18, 18, 18, 0.45)",
    "--brand-placeholder": isDark
      ? "rgba(245, 245, 245, 0.35)"
      : "rgba(18, 18, 18, 0.35)",
  };
}
