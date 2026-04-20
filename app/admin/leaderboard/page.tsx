"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function AdminLeaderboardPage() {
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
      logSupabaseError("admin leaderboard load", leaderboardError);
      setError(
        getErrorMessage(
          leaderboardError,
          "Unable to load admin leaderboard right now.",
        ),
      );
      setLeaderboard([]);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLeaderboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadLeaderboard]);

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          {branding.app_name} ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F5] sm:text-5xl">
          Admin Leaderboard
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[#F5F5F5]/65">
          Review total {branding.coin_name} balances across members.
        </p>
      </header>

      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
        {isLoading ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-normal text-[#F5F5F5]/60">
              Loading admin leaderboard...
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
              Member totals will appear here after coin transactions are created.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && leaderboard.length > 0 ? (
          <div className="divide-y divide-white/10">
            {leaderboard.map((user, index) => (
              <div
                key={user.user_email}
                className="flex items-center justify-between gap-4 py-4 text-[#F5F5F5]/75"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-[#F5F5F5]">
                    {index + 1}
                  </span>
                  <p className="truncate text-sm font-bold">
                    {user.user_email}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-normal text-[#F5F5F5]">
                  {formatNumber(user.totalCoins)} {branding.coin_name}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
