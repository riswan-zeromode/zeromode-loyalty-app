"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  brandingSettingsUpdatedEvent,
  themeModes,
  type ThemeMode,
} from "@/lib/branding";
import { supabase } from "@/lib/supabase";

type BrandingSettings = {
  id: string | number;
  app_name: string | null;
  logo_url: string | null;
  bg_color: string | null;
  text_color: string | null;
  accent_color: string | null;
  coin_name: string | null;
  theme_mode: string | null;
};

type BrandingDraft = {
  app_name: string;
  bg_color: string;
  text_color: string;
  accent_color: string;
  coin_name: string;
  theme_mode: ThemeMode;
};

type BrandingPayload = BrandingDraft & {
  logo_url: string | null;
};

const defaultBranding: BrandingDraft = {
  app_name: "ZEROMODE Loyalty",
  bg_color: themeModes.light.bg_color,
  text_color: themeModes.light.text_color,
  accent_color: "#D51919",
  coin_name: "Z Coins",
  theme_mode: "light",
};

function getDraftFromSettings(settings: BrandingSettings | null): BrandingDraft {
  const themeMode: ThemeMode = settings?.theme_mode === "dark" ? "dark" : "light";

  return {
    app_name: settings?.app_name ?? defaultBranding.app_name,
    bg_color: themeModes[themeMode].bg_color,
    text_color: themeModes[themeMode].text_color,
    accent_color: settings?.accent_color ?? defaultBranding.accent_color,
    coin_name: settings?.coin_name ?? defaultBranding.coin_name,
    theme_mode: themeMode,
  };
}

function getSafeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [draft, setDraft] = useState<BrandingDraft>(defaultBranding);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [selectedLogoName, setSelectedLogoName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBranding = useCallback(async () => {
    setIsLoading(true);

    const { data, error: settingsError } = await supabase
      .from("branding_settings")
      .select("id, app_name, logo_url, bg_color, text_color, accent_color, coin_name, theme_mode")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Unable to load branding settings", settingsError);
      setError("Unable to load branding settings right now.");
      setIsLoading(false);
      return;
    }

    const nextSettings = (data as BrandingSettings | null) ?? null;
    setSettings(nextSettings);
    setDraft(getDraftFromSettings(nextSettings));
    setLogoPreviewUrl(nextSettings?.logo_url ?? "");
    setSelectedLogoName("");
    setError("");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBranding();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBranding]);

  function getBrandingPayload(logoUrl: string | null): BrandingPayload {
    const themeColors = themeModes[draft.theme_mode];

    return {
      app_name: draft.app_name.trim() || defaultBranding.app_name,
      bg_color: themeColors.bg_color,
      text_color: themeColors.text_color,
      accent_color: draft.accent_color.trim() || defaultBranding.accent_color,
      coin_name: draft.coin_name.trim() || defaultBranding.coin_name,
      theme_mode: draft.theme_mode,
      logo_url: logoUrl,
    };
  }

  async function saveBrandingSettings(payload: BrandingPayload) {
    const saveRequest = settings
      ? supabase
          .from("branding_settings")
          .update(payload)
          .eq("id", settings.id)
      : supabase.from("branding_settings").insert(payload);

    const { data, error: saveError } = await saveRequest
      .select(
        "id, app_name, logo_url, bg_color, text_color, accent_color, coin_name, theme_mode",
      )
      .maybeSingle();

    if (saveError) {
      console.error("Unable to save branding settings", saveError);
      setError("Unable to save branding settings right now.");
      return null;
    }

    return (data as BrandingSettings | null) ?? null;
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    const safeFileName = getSafeFileName(file.name) || "logo";
    const filePath = `logos/${Date.now()}-${safeFileName}`;

    setLogoPreviewUrl(localPreviewUrl);
    setSelectedLogoName(file.name);
    setIsUploadingLogo(true);
    setError("");
    setNotice("");

    const { error: uploadError } = await supabase.storage
      .from("branding-assets")
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Unable to upload logo", uploadError);
      setLogoPreviewUrl(localPreviewUrl);
      setError("Unable to upload that logo right now.");
      setIsUploadingLogo(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("branding-assets")
      .getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;
    const savedSettings = await saveBrandingSettings(
      getBrandingPayload(publicUrl),
    );

    if (!savedSettings) {
      setIsUploadingLogo(false);
      return;
    }

    setSettings(savedSettings);
    setDraft(getDraftFromSettings(savedSettings));
    setLogoPreviewUrl(savedSettings.logo_url ?? publicUrl);
    setNotice("Logo uploaded and saved.");
    setIsUploadingLogo(false);
    window.dispatchEvent(new Event(brandingSettingsUpdatedEvent));
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setError("");
    setNotice("");

    const savedSettings = await saveBrandingSettings(
      getBrandingPayload(settings?.logo_url ?? null),
    );

    if (!savedSettings) {
      setIsSaving(false);
      return;
    }

    setSettings(savedSettings);
    setDraft(getDraftFromSettings(savedSettings));
    setLogoPreviewUrl(savedSettings.logo_url ?? "");
    setNotice("Branding settings saved.");
    setIsSaving(false);
    window.dispatchEvent(new Event(brandingSettingsUpdatedEvent));
  }

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">
          Branding Settings
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[color:var(--brand-muted)]">
          Manage the core loyalty brand values.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] p-6">
        {isLoading ? (
          <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5">
            <p className="text-sm font-normal text-[color:var(--brand-muted)]">
              Loading branding settings...
            </p>
          </div>
        ) : null}

        {!isLoading ? (
          <form onSubmit={handleSaveSettings}>
            <div className="mb-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-[var(--brand-border-strong)] bg-[var(--brand-surface)] p-5">
                <div className="text-center">
                  {logoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreviewUrl}
                      alt="Logo preview"
                      className="mx-auto h-20 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-[#D51919] text-xl font-bold text-white">
                      Z
                    </div>
                  )}
                  <p className="mt-3 text-sm font-normal text-[color:var(--brand-muted)]">
                    Logo preview
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
                <p className="text-xs font-normal uppercase tracking-[0.16em] text-[color:var(--brand-muted)]">
                  Logo
                </p>
                <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
                  Uploads to Supabase Storage and saves the public logo URL.
                </p>
                <label className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-4 text-sm font-normal text-[var(--brand-text)] transition hover:border-[#D51919]/60 hover:bg-[#D51919]/15">
                  {isUploadingLogo ? "Uploading..." : "Choose Logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isUploadingLogo}
                    onChange={handleLogoChange}
                  />
                </label>
                {selectedLogoName ? (
                  <p className="mt-3 text-sm font-normal text-[color:var(--brand-muted)]">
                    {isUploadingLogo
                      ? `Uploading ${selectedLogoName}...`
                      : `Saved: ${selectedLogoName}`}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 sm:col-span-2 xl:col-span-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-normal uppercase tracking-[0.16em] text-[color:var(--brand-muted)]">
                      Theme Mode
                    </p>
                    <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
                      Controls the global background and text colors for admins
                      and members.
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-pressed={draft.theme_mode === "dark"}
                    onClick={() => {
                      setDraft((currentDraft) => {
                        const nextThemeMode =
                          currentDraft.theme_mode === "dark" ? "light" : "dark";
                        const nextThemeColors = themeModes[nextThemeMode];

                        return {
                          ...currentDraft,
                          theme_mode: nextThemeMode,
                          bg_color: nextThemeColors.bg_color,
                          text_color: nextThemeColors.text_color,
                        };
                      });
                      setError("");
                      setNotice("");
                    }}
                    className="flex h-11 w-full items-center justify-between rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-2 text-sm font-normal text-[var(--brand-text)] transition hover:border-[#D51919]/60 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] sm:w-56"
                  >
                    <span className="px-3">
                      {draft.theme_mode === "dark" ? "Dark" : "Light"}
                    </span>
                    <span
                      className={`flex h-8 w-20 items-center rounded-lg p-1 transition ${
                        draft.theme_mode === "dark"
                          ? "justify-end bg-[#D51919]"
                          : "justify-start bg-[var(--brand-soft)]"
                      }`}
                    >
                      <span className="h-6 w-8 rounded-md bg-white shadow-sm" />
                    </span>
                  </button>
                </div>
              </div>

              {(
                [
                  ["app_name", "App Name", false],
                  ["bg_color", "Background Color", true],
                  ["text_color", "Text Color", true],
                  ["accent_color", "Accent Color", false],
                  ["coin_name", "Coin Name", false],
                ] as const
              ).map(([field, label, isReadOnly]) => (
                <label
                  key={field}
                  className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4"
                >
                  <span className="text-xs font-normal uppercase tracking-[0.16em] text-[color:var(--brand-muted)]">
                    {label}
                  </span>
                  <input
                    type="text"
                    value={draft[field]}
                    readOnly={isReadOnly}
                    onChange={(event) => {
                      if (isReadOnly) {
                        return;
                      }

                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        [field]: event.target.value,
                      }));
                      setError("");
                      setNotice("");
                    }}
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-3 text-sm font-normal text-[var(--brand-text)] outline-none transition placeholder:text-[color:var(--brand-placeholder)] focus:border-[#D51919] focus:bg-[var(--brand-field-focus)] focus:ring-2 focus:ring-[#D51919]/35 read-only:cursor-default read-only:opacity-75"
                  />
                </label>
              ))}
            </div>

            {notice ? (
              <p className="mt-4 text-sm font-normal text-[color:var(--brand-muted)]">
                {notice}
              </p>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-4">
                <p className="text-sm font-normal text-[var(--brand-text)]">{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSaving || isUploadingLogo}
              className="mt-6 h-11 rounded-lg bg-[#D51919] px-4 text-sm font-bold text-white transition hover:bg-[#b91616] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        ) : null}
      </section>
    </>
  );
}
