"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BrandingSettings = {
  id: string | number;
  app_name: string | null;
  logo_url: string | null;
  bg_color: string | null;
  text_color: string | null;
  accent_color: string | null;
  coin_name: string | null;
};

type BrandingDraft = {
  app_name: string;
  bg_color: string;
  text_color: string;
  accent_color: string;
  coin_name: string;
};

type BrandingPayload = BrandingDraft & {
  logo_url: string | null;
};

const defaultBranding: BrandingDraft = {
  app_name: "ZEROMODE Loyalty",
  bg_color: "#121212",
  text_color: "#F5F5F5",
  accent_color: "#D51919",
  coin_name: "Z Coins",
};

function getDraftFromSettings(settings: BrandingSettings | null): BrandingDraft {
  return {
    app_name: settings?.app_name ?? defaultBranding.app_name,
    bg_color: settings?.bg_color ?? defaultBranding.bg_color,
    text_color: settings?.text_color ?? defaultBranding.text_color,
    accent_color: settings?.accent_color ?? defaultBranding.accent_color,
    coin_name: settings?.coin_name ?? defaultBranding.coin_name,
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
      .select("id, app_name, logo_url, bg_color, text_color, accent_color, coin_name")
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
    return {
      app_name: draft.app_name.trim() || defaultBranding.app_name,
      bg_color: draft.bg_color.trim() || defaultBranding.bg_color,
      text_color: draft.text_color.trim() || defaultBranding.text_color,
      accent_color: draft.accent_color.trim() || defaultBranding.accent_color,
      coin_name: draft.coin_name.trim() || defaultBranding.coin_name,
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
        "id, app_name, logo_url, bg_color, text_color, accent_color, coin_name",
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
  }

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F5] sm:text-5xl">
          Branding Settings
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[#F5F5F5]/65">
          Manage the core loyalty brand values.
        </p>
      </header>

      <section className="rounded-lg border border-white/10 bg-[#171717] p-6">
        {isLoading ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-normal text-[#F5F5F5]/60">
              Loading branding settings...
            </p>
          </div>
        ) : null}

        {!isLoading ? (
          <form onSubmit={handleSaveSettings}>
            <div className="mb-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.04] p-5">
                <div className="text-center">
                  {logoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreviewUrl}
                      alt="Logo preview"
                      className="mx-auto h-20 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-[#D51919] text-xl font-bold text-[#F5F5F5]">
                      Z
                    </div>
                  )}
                  <p className="mt-3 text-sm font-normal text-[#F5F5F5]/60">
                    Logo preview
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-normal uppercase tracking-[0.16em] text-[#F5F5F5]/45">
                  Logo
                </p>
                <p className="mt-2 text-sm font-normal leading-6 text-[#F5F5F5]/60">
                  Uploads to Supabase Storage and saves the public logo URL.
                </p>
                <label className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-normal text-[#F5F5F5] transition hover:border-[#D51919]/60 hover:bg-[#D51919]/15">
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
                  <p className="mt-3 text-sm font-normal text-[#F5F5F5]/55">
                    {isUploadingLogo
                      ? `Uploading ${selectedLogoName}...`
                      : `Saved: ${selectedLogoName}`}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(
                [
                  ["app_name", "App Name"],
                  ["bg_color", "Background Color"],
                  ["text_color", "Text Color"],
                  ["accent_color", "Accent Color"],
                  ["coin_name", "Coin Name"],
                ] as const
              ).map(([field, label]) => (
                <label
                  key={field}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <span className="text-xs font-normal uppercase tracking-[0.16em] text-[#F5F5F5]/45">
                    {label}
                  </span>
                  <input
                    type="text"
                    value={draft[field]}
                    onChange={(event) => {
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        [field]: event.target.value,
                      }));
                      setError("");
                      setNotice("");
                    }}
                    className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-normal text-[#F5F5F5] outline-none transition placeholder:text-[#F5F5F5]/35 focus:border-[#D51919] focus:bg-white/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
                  />
                </label>
              ))}
            </div>

            {notice ? (
              <p className="mt-4 text-sm font-normal text-[#F5F5F5]/65">
                {notice}
              </p>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-4">
                <p className="text-sm font-normal text-[#F5F5F5]">{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSaving || isUploadingLogo}
              className="mt-6 h-11 rounded-lg bg-[#D51919] px-4 text-sm font-bold text-[#F5F5F5] transition hover:bg-[#b91616] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#121212] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        ) : null}
      </section>
    </>
  );
}
