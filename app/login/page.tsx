"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getUserRoleByEmail, normalizeEmail } from "@/lib/access";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <main className="flex min-h-screen items-center justify-center bg-[#121212] px-6 py-12 font-sans text-[#F5F5F5]">
      <section className="w-full max-w-md">
        <div className="mb-9 text-center">
          <p className="mb-4 text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
            ZEROMODE
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            ZEROMODE Loyalty
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
              className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-base font-normal text-[#F5F5F5] outline-none transition placeholder:text-[#F5F5F5]/35 focus:border-[#D51919] focus:bg-white/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg bg-[#D51919] px-5 text-base font-bold text-[#F5F5F5] transition hover:bg-[#b91616] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#121212] disabled:cursor-not-allowed disabled:opacity-70"
          >
            Continue
          </button>

          {error ? (
            <p
              id="login-error"
              className="text-center text-sm font-normal leading-6 text-[#D51919]"
            >
              {error}
            </p>
          ) : null}
        </form>

        <p className="mt-4 text-center text-sm font-normal leading-6 text-[#F5F5F5]/55">
          Enter the email you used for your ZEROMODE order
        </p>
      </section>
    </main>
  );
}
