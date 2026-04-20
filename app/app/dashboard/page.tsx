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

function PageHeader() {
  return (
    <header className="mb-6">
      <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
        ZEROMODE Loyalty
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F5] sm:text-5xl">
        Loyalty Dashboard
      </h1>
      <p className="mt-4 max-w-xl text-base font-normal leading-7 text-[#F5F5F5]/65">
        Track your Z Coins and rewards
      </p>
    </header>
  );
}

function StatsCard({
  balance,
  nextReward,
}: {
  balance: number;
  nextReward: Reward | null;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.05] p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
            Z Coins balance
          </p>
          <p className="mt-3 text-5xl font-bold tracking-tight text-[#F5F5F5]">
            {formatCoins(balance)}
          </p>
        </div>
        <div className="border-t border-white/10 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <p className="text-sm font-normal text-[#F5F5F5]/55">
            Next reward at
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#F5F5F5]">
            {nextReward
              ? `${formatCoins(nextReward.checkpoint_coins)} Z Coins`
              : "All rewards unlocked"}
          </p>
        </div>
      </div>
    </section>
  );
}

function ProgressCard({
  balance,
  rewards,
  nextReward,
}: {
  balance: number;
  rewards: Reward[];
  nextReward: Reward | null;
}) {
  const targetCoins = nextReward?.checkpoint_coins ?? balance;
  const progressPercent =
    targetCoins > 0 ? Math.min((balance / targetCoins) * 100, 100) : 100;

  return (
    <section className="rounded-lg border border-white/10 bg-[#171717] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#F5F5F5]">
            Reward Progress
          </h2>
          <p className="mt-2 text-sm font-normal leading-6 text-[#F5F5F5]/60">
            Current progress toward your next loyalty reward.
          </p>
        </div>
        <p className="text-sm font-normal text-[#F5F5F5]/65">
          {formatCoins(balance)} /{" "}
          {nextReward ? formatCoins(nextReward.checkpoint_coins) : "Complete"}
        </p>
      </div>

      <div className="mt-8">
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#D51919]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-normal text-[#F5F5F5]/50">
          <span>0</span>
          <span>
            {nextReward
              ? `${formatCoins(nextReward.checkpoint_coins)} Z Coins`
              : "Complete"}
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rewards.slice(0, 4).map((reward) => {
          const unlocked = reward.checkpoint_coins <= balance;

          return (
            <div
              key={reward.id}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
            >
              <div
                className={`mb-4 h-2 w-2 rounded-full ${
                  unlocked ? "bg-[#D51919]" : "bg-[#F5F5F5]/25"
                }`}
              />
              <p className="text-lg font-bold tracking-tight text-[#F5F5F5]">
                {formatCoins(reward.checkpoint_coins)}
              </p>
              <p className="mt-1 truncate text-xs font-normal uppercase tracking-[0.16em] text-[#F5F5F5]/45">
                {reward.title}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RewardsPreview({
  unlockedRewards,
  lockedRewards,
}: {
  unlockedRewards: Reward[];
  lockedRewards: Reward[];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#F5F5F5]">
            Unlocked Rewards
          </h2>
          <p className="mt-2 text-sm font-normal leading-6 text-[#F5F5F5]/60">
            Rewards available from your current Z Coins balance.
          </p>
        </div>
        <p className="text-sm font-normal text-[#F5F5F5]/55">
          {unlockedRewards.length} unlocked / {lockedRewards.length} locked
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {unlockedRewards.length > 0 ? (
          unlockedRewards.slice(0, 4).map((reward) => (
            <div
              key={reward.id}
              className="rounded-lg border border-[#D51919]/30 bg-[#D51919]/10 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-[#F5F5F5]">
                    {reward.title}
                  </p>
                  <p className="mt-2 text-sm font-normal leading-6 text-[#F5F5F5]/60">
                    {reward.description || "Unlocked reward"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#D51919]/20 px-3 py-1 text-xs font-normal text-[#F5F5F5] ring-1 ring-[#D51919]/35">
                  Unlocked
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 md:col-span-2">
            <p className="text-sm font-normal leading-6 text-[#F5F5F5]/60">
              No rewards unlocked yet. Earn more Z Coins to activate your first
              checkpoint.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [balance, setBalance] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (email: string) => {
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
      setError("Unable to load your coin balance right now.");
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

    const transactionRows = (transactionsResult.data ?? []) as CoinTransaction[];
    const nextBalance = transactionRows.reduce((total, transaction) => {
      const amount = Number(transaction.amount ?? 0);
      return Number.isFinite(amount) ? total + amount : total;
    }, 0);

    setBalance(nextBalance);
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

      setUserEmail(storedEmail);
      void loadDashboard(storedEmail);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard, router]);

  const nextReward =
    rewards.find((reward) => reward.checkpoint_coins > balance) ?? null;
  const unlockedRewards = rewards.filter(
    (reward) => reward.checkpoint_coins <= balance,
  );
  const lockedRewards = rewards.filter(
    (reward) => reward.checkpoint_coins > balance,
  );

  return (
    <>
      <PageHeader />

      {userEmail ? (
        <p className="mb-5 text-sm font-normal text-[#F5F5F5]/45">
          Signed in as {userEmail}
        </p>
      ) : null}

      {isLoading ? (
        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-normal text-[#F5F5F5]/60">
            Loading your loyalty dashboard...
          </p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-6">
          <p className="text-sm font-normal text-[#F5F5F5]">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error ? (
        <div className="space-y-5">
          <StatsCard balance={balance} nextReward={nextReward} />
          <ProgressCard
            balance={balance}
            rewards={rewards}
            nextReward={nextReward}
          />
          <RewardsPreview
            unlockedRewards={unlockedRewards}
            lockedRewards={lockedRewards}
          />
        </div>
      ) : null}
    </>
  );
}
