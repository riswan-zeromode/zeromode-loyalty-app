"use client";

import type { FormEvent } from "react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserRoleByEmail, normalizeEmail } from "@/lib/access";
import {
  defaultBranding,
  getBrandingSettings,
  type BrandingSettings,
} from "@/lib/branding";
import {
  defaultThemeMode,
  getStoredThemeMode,
  getThemeVariables,
  themeModeChangedEvent,
  themeModes,
  type ThemeMode,
} from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(defaultThemeMode);
  const [branding, setBranding] =
    useState<BrandingSettings>(defaultBranding);

  useEffect(() => {
    let isMounted = true;

    async function loadBranding() {
      const nextBranding = await getBrandingSettings();

      if (isMounted) {
        setBranding(nextBranding);
      }
    }

    void loadBranding();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function syncThemeMode() {
      setThemeMode(getStoredThemeMode());
    }

    syncThemeMode();
    window.addEventListener(themeModeChangedEvent, syncThemeMode);
    window.addEventListener("storage", syncThemeMode);

    return () => {
      window.removeEventListener(themeModeChangedEvent, syncThemeMode);
      window.removeEventListener("storage", syncThemeMode);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    setIsSubmitting(true);
    const role = await getUserRoleByEmail(normalizedEmail);
    setIsSubmitting(false);

    if (role === "admin") {
      localStorage.setItem("userEmail", normalizedEmail);
      setError("");
      router.push("/admin");
      return;
    }

    if (role === "user") {
      localStorage.setItem("userEmail", normalizedEmail);
      setError("");
      router.push("/app/dashboard");
      return;
    }

    setError(
      "Access not granted. Use the email linked to your ZEROMODE order.",
    );
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12 font-sans"
      style={{
        ...getThemeVariables(themeMode, branding.accent_color),
        backgroundColor: themeModes[themeMode].bg_color,
        color: themeModes[themeMode].text_color,
      } as CSSProperties}
      data-theme={themeMode}
    >
      <section className="w-full max-w-md">
        <div className="mb-9 text-center">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logo_url}
              alt={`${branding.app_name} logo`}
              className="mx-auto mb-4 h-16 w-16 rounded-lg object-cover"
            />
          ) : null}
          <p
            className="mb-4 text-sm font-normal uppercase tracking-[0.18em]"
            style={{ color: branding.accent_color }}
          >
            {branding.app_name}
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {branding.app_name}
          </h1>
          <p className="mt-4 text-base font-normal text-[color:var(--brand-muted)]">
            Customer-only loyalty access
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-normal text-[color:var(--brand-muted)]">
              Email address
            </span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="you@example.com"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? "login-error" : undefined}
              required
              className="h-12 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-4 text-base font-normal text-[var(--brand-text)] outline-none transition placeholder:text-[color:var(--brand-placeholder)] focus:bg-[var(--brand-field-focus)]"
              style={{ borderColor: error ? branding.accent_color : undefined }}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg px-5 text-base font-bold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            style={{
              backgroundColor: branding.accent_color,
              outlineColor: branding.accent_color,
            }}
          >
            Continue
          </button>

          {error ? (
            <p
              id="login-error"
              className="text-center text-sm font-normal leading-6"
              style={{ color: branding.accent_color }}
            >
              {error}
            </p>
          ) : null}
        </form>

        <p className="mt-4 text-center text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
          Enter the email you used for your {branding.app_name} order
        </p>
      </section>
    </main>
  );
}
