"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
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

function PageHeader({
  appName,
  coinName,
}: {
  appName: string;
  coinName: string;
}) {
  return (
    <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          {appName}
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">
          Loyalty Dashboard
        </h1>
        <p className="mt-4 max-w-xl text-base font-normal leading-7 text-[color:var(--brand-muted)]">
          Track your {coinName} and rewards
        </p>
      </div>
      <div className="sm:pt-1">
        <ThemeToggle />
      </div>
    </header>
  );
}

function StatsCard({
  balance,
  nextReward,
  hasRewards,
  coinName,
}: {
  balance: number;
  nextReward: Reward | null;
  hasRewards: boolean;
  coinName: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
            {coinName} balance
          </p>
          <p className="mt-3 text-5xl font-bold tracking-tight text-[var(--brand-text)]">
            {formatNumber(balance)}
          </p>
        </div>
        <div className="border-t border-[var(--brand-border)] pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <p className="text-sm font-normal text-[color:var(--brand-muted)]">
            Next reward at
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--brand-text)]">
            {nextReward
              ? `${formatNumber(nextReward.checkpoint_coins)} ${coinName}`
              : hasRewards
                ? "All rewards unlocked"
                : "No rewards yet"}
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
  coinName,
}: {
  balance: number;
  rewards: Reward[];
  nextReward: Reward | null;
  coinName: string;
}) {
  const hasRewards = rewards.length > 0;
  const targetCoins = nextReward?.checkpoint_coins ?? (hasRewards ? balance : 0);
  const progressPercent =
    nextReward && targetCoins > 0
      ? Math.min((balance / targetCoins) * 100, 100)
      : hasRewards
        ? 100
        : 0;

  return (
    <section className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--brand-text)]">
            Reward Progress
          </h2>
          <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
            Current progress toward your next loyalty reward.
          </p>
        </div>
        <p className="text-sm font-normal text-[color:var(--brand-muted)]">
          {formatNumber(balance)} /{" "}
          {nextReward
            ? formatNumber(nextReward.checkpoint_coins)
            : hasRewards
              ? "Complete"
              : "No rewards"}
        </p>
      </div>

      <div className="mt-8">
        <div className="h-3 overflow-hidden rounded-full bg-[var(--brand-soft)]">
          <div
            className="h-full rounded-full bg-[#D51919]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-normal text-[color:var(--brand-muted)]">
          <span>0</span>
          <span>
            {nextReward
              ? `${formatNumber(nextReward.checkpoint_coins)} ${coinName}`
              : hasRewards
                ? "Complete"
                : "No rewards"}
          </span>
        </div>
      </div>

      {hasRewards ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rewards.slice(0, 4).map((reward) => {
          const unlocked = reward.checkpoint_coins <= balance;

          return (
            <div
              key={reward.id}
              className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4"
            >
              <div
                className={`mb-4 h-2 w-2 rounded-full ${
                  unlocked ? "bg-[#D51919]" : "bg-[var(--brand-soft)]"
                }`}
              />
              <p className="text-lg font-bold tracking-tight text-[var(--brand-text)]">
                {formatNumber(reward.checkpoint_coins)}
              </p>
              <p className="mt-1 truncate text-xs font-normal uppercase tracking-[0.16em] text-[color:var(--brand-muted)]">
                {reward.title}
              </p>
            </div>
          );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5">
          <p className="text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
            No active reward checkpoints are available yet.
          </p>
        </div>
      )}
    </section>
  );
}

function RewardsPreview({
  unlockedRewards,
  lockedRewards,
  hasRewards,
  coinName,
}: {
  unlockedRewards: Reward[];
  lockedRewards: Reward[];
  hasRewards: boolean;
  coinName: string;
}) {
  return (
    <section className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--brand-text)]">
            Unlocked Rewards
          </h2>
          <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
            Rewards available from your current {coinName} balance.
          </p>
        </div>
        <p className="text-sm font-normal text-[color:var(--brand-muted)]">
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
                  <p className="truncate text-base font-bold text-[var(--brand-text)]">
                    {reward.title}
                  </p>
                  <p className="mt-2 text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
                    {reward.description || "Unlocked reward"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#D51919]/20 px-3 py-1 text-xs font-normal text-[var(--brand-text)] ring-1 ring-[#D51919]/35">
                  Unlocked
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 md:col-span-2">
            <p className="text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
              {hasRewards
                ? `No rewards unlocked yet. Earn more ${coinName} to activate your first checkpoint.`
                : "No active rewards are available yet."}
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
  const [branding, setBranding] =
    useState<BrandingSettings>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (email: string) => {
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
    } catch (dashboardError) {
      logSupabaseError("user dashboard load", dashboardError);
      setError(
        getErrorMessage(
          dashboardError,
          "Unable to load your loyalty dashboard right now.",
        ),
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

      const normalizedEmail = normalizeEmail(storedEmail);
      setUserEmail(normalizedEmail);
      void loadDashboard(normalizedEmail);
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
      <PageHeader appName={branding.app_name} coinName={branding.coin_name} />

      {userEmail ? (
        <p className="mb-5 text-sm font-normal text-[color:var(--brand-muted)]">
          Signed in as {userEmail}
        </p>
      ) : null}

      {isLoading ? (
        <section className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
          <p className="text-sm font-normal text-[color:var(--brand-muted)]">
            Loading your loyalty dashboard...
          </p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-6">
          <p className="text-sm font-normal text-[var(--brand-text)]">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error ? (
        <div className="space-y-5">
          <StatsCard
            balance={balance}
            nextReward={nextReward}
            hasRewards={rewards.length > 0}
            coinName={branding.coin_name}
          />
          <ProgressCard
            balance={balance}
            rewards={rewards}
            nextReward={nextReward}
            coinName={branding.coin_name}
          />
          <RewardsPreview
            unlockedRewards={unlockedRewards}
            lockedRewards={lockedRewards}
            hasRewards={rewards.length > 0}
            coinName={branding.coin_name}
          />
        </div>
      ) : null}
    </>
  );
}
