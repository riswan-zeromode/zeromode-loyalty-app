"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CoinTransaction = {
  amount: number | string | null;
};

type Reward = {
  id: string | number;
  title: string;
  description: string | null;
  checkpoint_coins: number;
  reward_type: string | null;
  is_active: boolean | null;
};

function formatCoins(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function sumTransactions(transactions: CoinTransaction[]) {
  return transactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount ?? 0);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

export default function UserRewardsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRewards = useCallback(async (email: string) => {
    setIsLoading(true);
    setError("");

    const [transactionsResult, rewardsResult] = await Promise.all([
      supabase
        .from("coin_transactions")
        .select("amount")
        .eq("user_email", email),
      supabase
        .from("rewards")
        .select("id, title, description, checkpoint_coins, reward_type, is_active")
        .eq("is_active", true)
        .order("checkpoint_coins", { ascending: true }),
    ]);

    if (transactionsResult.error) {
      console.error("Unable to load coin transactions", transactionsResult.error);
      setError("Unable to load your reward progress right now.");
      setBalance(0);
      setRewards([]);
      setIsLoading(false);
      return;
    }

    if (rewardsResult.error) {
      console.error("Unable to load rewards", rewardsResult.error);
      setError("Unable to load rewards right now.");
      setBalance(0);
      setRewards([]);
      setIsLoading(false);
      return;
    }

    setBalance(sumTransactions((transactionsResult.data ?? []) as CoinTransaction[]));
    setRewards((rewardsResult.data ?? []) as Reward[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedEmail = window.localStorage.getItem("userEmail");

      if (!storedEmail) {
        router.replace("/login");
        return;
      }

      void loadRewards(storedEmail.trim().toLowerCase());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRewards, router]);

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE Loyalty
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F5] sm:text-5xl">
          Rewards
        </h1>
        <p className="mt-4 max-w-xl text-base font-normal leading-7 text-[#F5F5F5]/65">
          View available loyalty perks and unlock status.
        </p>
      </header>

      <section className="mb-5 rounded-lg border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          Current balance
        </p>
        <p className="mt-2 text-3xl font-bold text-[#F5F5F5]">
          {formatCoins(balance)} Z Coins
        </p>
      </section>

      {isLoading ? (
        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-normal text-[#F5F5F5]/60">
            Loading rewards...
          </p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-6">
          <p className="text-sm font-normal text-[#F5F5F5]">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && rewards.length === 0 ? (
        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center">
          <h2 className="text-lg font-bold text-[#F5F5F5]">
            No rewards available yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-6 text-[#F5F5F5]/60">
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
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <h2 className="text-base font-bold text-[#F5F5F5]">
                  {reward.title}
                </h2>
                <p className="mt-3 text-sm font-normal leading-6 text-[#F5F5F5]/60">
                  {reward.description || `${formatCoins(reward.checkpoint_coins)} Z Coins`}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-normal ${
                      unlocked
                        ? "bg-[#D51919] text-[#F5F5F5]"
                        : "bg-white/10 text-[#F5F5F5]/55"
                    }`}
                  >
                    {unlocked ? "Unlocked" : "Locked"}
                  </span>
                  <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-normal text-[#F5F5F5]/55">
                    {formatCoins(reward.checkpoint_coins)} Z Coins
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
