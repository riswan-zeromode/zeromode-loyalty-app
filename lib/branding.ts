import { supabase } from "@/lib/supabase";

export type ThemeMode = "dark" | "light";

export type BrandingSettings = {
  app_name: string;
  logo_url: string;
  bg_color: string;
  text_color: string;
  accent_color: string;
  coin_name: string;
  theme_mode: ThemeMode;
};

type BrandingSettingsRow = {
  app_name: string | null;
  logo_url: string | null;
  bg_color: string | null;
  text_color: string | null;
  accent_color: string | null;
  coin_name: string | null;
  theme_mode: string | null;
};

export const brandingSettingsUpdatedEvent = "branding-settings-updated";

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

export const defaultBranding: BrandingSettings = {
  app_name: "ZEROMODE Loyalty",
  logo_url: "",
  bg_color: themeModes.light.bg_color,
  text_color: themeModes.light.text_color,
  accent_color: "#D51919",
  coin_name: "Z Coins",
  theme_mode: "light",
};

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

export function normalizeBrandingSettings(
  settings: BrandingSettingsRow | null,
): BrandingSettings {
  const themeMode = normalizeThemeMode(settings?.theme_mode);
  const themeColors = themeModes[themeMode];

  return {
    app_name: settings?.app_name || defaultBranding.app_name,
    logo_url: settings?.logo_url || defaultBranding.logo_url,
    bg_color: themeColors.bg_color,
    text_color: themeColors.text_color,
    accent_color: settings?.accent_color || defaultBranding.accent_color,
    coin_name: settings?.coin_name || defaultBranding.coin_name,
    theme_mode: themeMode,
  };
}

export function getThemeVariables(branding: BrandingSettings) {
  const isDark = branding.theme_mode === "dark";

  return {
    "--brand-bg": branding.bg_color,
    "--brand-text": branding.text_color,
    "--brand-accent": branding.accent_color,
    "--brand-surface": isDark
      ? "rgba(255, 255, 255, 0.04)"
      : "rgba(0, 0, 0, 0.04)",
    "--brand-surface-strong": isDark ? "#171717" : branding.bg_color,
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

export async function getBrandingSettings() {
  const { data, error } = await supabase
    .from("branding_settings")
    .select("app_name, logo_url, bg_color, text_color, accent_color, coin_name, theme_mode")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to load branding settings", error);
    return defaultBranding;
  }

  return normalizeBrandingSettings((data as BrandingSettingsRow | null) ?? null);
}
