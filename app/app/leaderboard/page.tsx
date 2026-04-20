"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeEmail } from "@/lib/access";
import {
  defaultBranding,
  getBrandingSettings,
  type BrandingSettings,
} from "@/lib/branding";
import {
  formatNumber,
  getLeaderboardRows,
  type LeaderboardRow,
} from "@/lib/loyalty-data";
import { getErrorMessage, logSupabaseError } from "@/lib/supabase-errors";

export default function UserLeaderboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [branding, setBranding] =
    useState<BrandingSettings>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [nextLeaderboard, nextBranding] = await Promise.all([
        getLeaderboardRows(),
        getBrandingSettings(),
      ]);

      setLeaderboard(nextLeaderboard);
      setBranding(nextBranding);
      setIsLoading(false);
    } catch (leaderboardError) {
      logSupabaseError("user leaderboard load", leaderboardError);
      setError(
        getErrorMessage(
          leaderboardError,
          "Unable to load leaderboard right now.",
        ),
      );
      setLeaderboard([]);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedEmail = window.localStorage.getItem("userEmail");

      if (!storedEmail) {
        router.replace("/login");
        return;
      }

      setUserEmail(normalizeEmail(storedEmail));
      void loadLeaderboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadLeaderboard, router]);

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          {branding.app_name}
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F5] sm:text-5xl">
          Leaderboard
        </h1>
        <p className="mt-4 max-w-xl text-base font-normal leading-7 text-[#F5F5F5]/65">
          Top {branding.coin_name} earners this cycle.
        </p>
      </header>

      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
        {isLoading ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-normal text-[#F5F5F5]/60">
              Loading leaderboard...
            </p>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-5">
            <p className="text-sm font-normal text-[#F5F5F5]">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error && leaderboard.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center">
            <h2 className="text-lg font-bold text-[#F5F5F5]">
              No leaderboard activity yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-6 text-[#F5F5F5]/60">
              Coin transactions will appear here once users start earning{" "}
              {branding.coin_name}.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && leaderboard.length > 0 ? (
          <div className="divide-y divide-white/10">
            {leaderboard.map((user, index) => {
              const isCurrentUser = user.user_email === userEmail;

              return (
                <div
                  key={user.user_email}
                  className={`flex items-center justify-between gap-4 py-4 ${
                    isCurrentUser ? "text-[#F5F5F5]" : "text-[#F5F5F5]/70"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        isCurrentUser
                          ? "bg-[#D51919] text-[#F5F5F5]"
                          : "bg-white/10 text-[#F5F5F5]/60"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {user.user_email}
                      </p>
                      {isCurrentUser ? (
                        <p className="mt-1 text-xs font-normal text-[#D51919]">
                          Current user
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-normal">
                    {formatNumber(user.totalCoins)} {branding.coin_name}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </>
  );
}
