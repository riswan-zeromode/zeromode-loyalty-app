"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function UserSettingsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedEmail = window.localStorage.getItem("userEmail");

      if (!storedEmail) {
        router.replace("/login");
        return;
      }

      setUserEmail(storedEmail);
      setHasCheckedSession(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  function handleSignOut() {
    window.localStorage.removeItem("userEmail");
    router.replace("/login");
  }

  const settingsRows = [
    { label: "Signed-in Email", value: userEmail || "Loading..." },
    { label: "Access", value: "Approved loyalty member" },
    { label: "Session", value: "Stored locally on this device" },
  ];

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          Loyalty Account
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">
          Settings
        </h1>
        <p className="mt-4 max-w-xl text-base font-normal leading-7 text-[color:var(--brand-muted)]">
          Review your account access and session.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] p-6">
        {!hasCheckedSession ? (
          <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5">
            <p className="text-sm font-normal text-[color:var(--brand-muted)]">
              Loading settings...
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[var(--brand-border)]">
              {settingsRows.map((setting) => (
                <div
                  key={setting.label}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm font-bold text-[var(--brand-text)]">
                    {setting.label}
                  </p>
                  <p className="break-all text-sm font-normal text-[color:var(--brand-muted)] sm:text-right">
                    {setting.value}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-6 h-10 rounded-lg border border-[#D51919]/40 bg-[#D51919]/10 px-4 text-sm font-normal text-[var(--brand-text)] transition hover:bg-[#D51919]/20 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)]"
            >
              Sign out
            </button>
          </>
        )}
      </section>
    </>
  );
}
