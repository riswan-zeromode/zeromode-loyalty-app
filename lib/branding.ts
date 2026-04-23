import { supabase } from "@/lib/supabase";

export type BrandingSettings = {
  app_name: string;
  logo_url: string;
  bg_color: string;
  text_color: string;
  accent_color: string;
  coin_name: string;
};

type BrandingSettingsRow = {
  app_name: string | null;
  logo_url: string | null;
  bg_color: string | null;
  text_color: string | null;
  accent_color: string | null;
  coin_name: string | null;
};

export const brandingSettingsUpdatedEvent = "branding-settings-updated";

export const defaultBranding: BrandingSettings = {
  app_name: "ZEROMODE Loyalty",
  logo_url: "",
  bg_color: "#F5F5F5",
  text_color: "#121212",
  accent_color: "#D51919",
  coin_name: "Z Coins",
};

export function normalizeBrandingSettings(
  settings: BrandingSettingsRow | null,
): BrandingSettings {
  return {
    app_name: settings?.app_name || defaultBranding.app_name,
    logo_url: settings?.logo_url || defaultBranding.logo_url,
    bg_color: settings?.bg_color || defaultBranding.bg_color,
    text_color: settings?.text_color || defaultBranding.text_color,
    accent_color: settings?.accent_color || defaultBranding.accent_color,
    coin_name: settings?.coin_name || defaultBranding.coin_name,
  };
}

export async function getBrandingSettings() {
  const { data, error } = await supabase
    .from("branding_settings")
    .select("app_name, logo_url, bg_color, text_color, accent_color, coin_name")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to load branding settings", error);
    return defaultBranding;
  }

  return normalizeBrandingSettings((data as BrandingSettingsRow | null) ?? null);
}
