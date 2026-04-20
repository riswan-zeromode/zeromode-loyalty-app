"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type BrandingSettings = {
  app_name: string | null;
  bg_color: string | null;
  text_color: string | null;
  accent_color: string | null;
  coin_name: string | null;
};

const defaultBranding: Required<BrandingSettings> = {
  app_name: "ZEROMODE Loyalty",
  bg_color: "#121212",
  text_color: "#F5F5F5",
  accent_color: "#D51919",
  coin_name: "Z Coins",
};

export default function UserSettingsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [branding, setBranding] =
    useState<Required<BrandingSettings>>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBranding = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const { data, error: brandingError } = await supabase
      .from("branding_settings")
      .select("app_name, bg_color, text_color, accent_color, coin_name")
      .limit(1)
      .maybeSingle();

    if (brandingError) {
      console.error("Unable to load branding settings", brandingError);
      setError("Unable to load settings right now.");
      setIsLoading(false);
      return;
    }

    const settings = (data as BrandingSettings | null) ?? null;
    setBranding({
      app_name: settings?.app_name ?? defaultBranding.app_name,
      bg_color: settings?.bg_color ?? defaultBranding.bg_color,
      text_color: settings?.text_color ?? defaultBranding.text_color,
      accent_color: settings?.accent_color ?? defaultBranding.accent_color,
      coin_name: settings?.coin_name ?? defaultBranding.coin_name,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedEmail = window.localStorage.getItem("userEmail");

      if (!storedEmail) {
        router.replace("/login");
        return;
      }

      setUserEmail(storedEmail);
      void loadBranding();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBranding, router]);

  function handleSignOut() {
    window.localStorage.removeItem("userEmail");
    router.replace("/login");
  }

  const settingsRows = [
    { label: "Logged-in Email", value: userEmail || "Loading..." },
    { label: "App Name", value: branding.app_name },
    { label: "Coin Name", value: branding.coin_name },
    { label: "Background Color", value: branding.bg_color },
    { label: "Text Color", value: branding.text_color },
    { label: "Accent Color", value: branding.accent_color },
  ];

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE Loyalty
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F5] sm:text-5xl">
          Settings
        </h1>
        <p className="mt-4 max-w-xl text-base font-normal leading-7 text-[#F5F5F5]/65">
          Review your loyalty profile and current brand settings.
        </p>
      </header>

      <section className="rounded-lg border border-white/10 bg-[#171717] p-6">
        {isLoading ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-normal text-[#F5F5F5]/60">
              Loading settings...
            </p>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-5">
            <p className="text-sm font-normal text-[#F5F5F5]">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            <div className="divide-y divide-white/10">
              {settingsRows.map((setting) => (
                <div
                  key={setting.label}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm font-bold text-[#F5F5F5]">
                    {setting.label}
                  </p>
                  <p className="break-all text-sm font-normal text-[#F5F5F5]/60 sm:text-right">
                    {setting.value}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-6 h-10 rounded-lg border border-[#D51919]/40 bg-[#D51919]/10 px-4 text-sm font-normal text-[#F5F5F5] transition hover:bg-[#D51919]/20 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#121212]"
            >
              Sign out
            </button>
          </>
        ) : null}
      </section>
    </>
  );
}
