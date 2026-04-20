"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserRoleByEmail, normalizeEmail } from "@/lib/access";
import {
  defaultBranding,
  getBrandingSettings,
  type BrandingSettings,
} from "@/lib/branding";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        backgroundColor: branding.bg_color,
        color: branding.text_color,
      }}
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
          <p className="mt-4 text-base font-normal text-[#F5F5F5]/70">
            Customer-only loyalty access
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-normal text-[#F5F5F5]/80">
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
              className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-base font-normal text-[#F5F5F5] outline-none transition placeholder:text-[#F5F5F5]/35 focus:bg-white/[0.09]"
              style={{ borderColor: error ? branding.accent_color : undefined }}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg px-5 text-base font-bold text-[#F5F5F5] transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
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

        <p className="mt-4 text-center text-sm font-normal leading-6 text-[#F5F5F5]/55">
          Enter the email you used for your {branding.app_name} order
        </p>
      </section>
    </main>
  );
}
