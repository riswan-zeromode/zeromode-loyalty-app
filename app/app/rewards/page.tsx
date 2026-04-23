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
  getActiveRewards,
  getUserCoinBalance,
  type Reward,
} from "@/lib/loyalty-data";
import { getErrorMessage, logSupabaseError } from "@/lib/supabase-errors";

export default function UserRewardsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [branding, setBranding] =
    useState<BrandingSettings>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRewards = useCallback(async (email: string) => {
    setIsLoading(true);
    setError("");

    try {
      const [nextBalance, nextRewards, nextBranding] = await Promise.all([
        getUserCoinBalance(email),
        getActiveRewards(),
        getBrandingSettings(),
      ]);

      setBalance(nextBalance);
      setRewards(nextRewards);
      setBranding(nextBranding);
      setIsLoading(false);
    } catch (rewardsError) {
      logSupabaseError("user rewards load", rewardsError);
      setError(
        getErrorMessage(rewardsError, "Unable to load rewards right now."),
      );
      setBalance(0);
      setRewards([]);
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

      void loadRewards(normalizeEmail(storedEmail));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRewards, router]);

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          {branding.app_name}
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#121212] sm:text-5xl">
          Rewards
        </h1>
        <p className="mt-4 max-w-xl text-base font-normal leading-7 text-[#121212]/65">
          View available loyalty perks and unlock status.
        </p>
      </header>

      <section className="mb-5 rounded-lg border border-black/10 bg-black/[0.04] p-5">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          Current balance
        </p>
        <p className="mt-2 text-3xl font-bold text-[#121212]">
          {formatNumber(balance)} {branding.coin_name}
        </p>
      </section>

      {isLoading ? (
        <section className="rounded-lg border border-black/10 bg-black/[0.04] p-6">
          <p className="text-sm font-normal text-[#121212]/60">
            Loading rewards...
          </p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-6">
          <p className="text-sm font-normal text-[#121212]">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && rewards.length === 0 ? (
        <section className="rounded-lg border border-black/10 bg-black/[0.04] p-8 text-center">
          <h2 className="text-lg font-bold text-[#121212]">
            No rewards available yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-6 text-[#121212]/60">
            Active rewards from Supabase will appear here once admins publish
            them.
          </p>
        </section>
      ) : null}

      {!isLoading && !error && rewards.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rewards.map((reward) => {
            const unlocked = reward.checkpoint_coins <= balance;

            return (
              <article
                key={reward.id}
                className={`rounded-lg border p-5 ${
                  unlocked
                    ? "border-[#D51919]/45 bg-[#D51919]/10"
                    : "border-black/10 bg-black/[0.04]"
                }`}
              >
                <h2 className="text-base font-bold text-[#121212]">
                  {reward.title}
                </h2>
                <p className="mt-3 text-sm font-normal leading-6 text-[#121212]/60">
                  {reward.description ||
                    `${formatNumber(reward.checkpoint_coins)} ${branding.coin_name}`}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-normal ${
                      unlocked
                        ? "bg-[#D51919] text-white"
                        : "bg-black/10 text-[#121212]/55"
                    }`}
                  >
                    {unlocked ? "Unlocked" : "Locked"}
                  </span>
                  <span className="inline-flex rounded-full bg-black/10 px-3 py-1 text-xs font-normal text-[#121212]/55">
                    {formatNumber(reward.checkpoint_coins)} {branding.coin_name}
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </>
  );
}
