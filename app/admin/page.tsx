"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CoinTransaction = {
  amount: number | string | null;
};

type AdminOverviewStats = {
  approvedUsers: number;
  admins: number;
  activeRewards: number;
  totalCoinsIssued: number;
};

const emptyStats: AdminOverviewStats = {
  approvedUsers: 0,
  admins: 0,
  activeRewards: 0,
  totalCoinsIssued: 0,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function sumTransactions(transactions: CoinTransaction[]) {
  return transactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount ?? 0);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminOverviewStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverviewStats = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const [
      approvedUsersResult,
      adminsResult,
      activeRewardsResult,
      coinTransactionsResult,
    ] = await Promise.all([
      supabase
        .from("approved_users")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase.from("admins").select("id", { count: "exact", head: true }),
      supabase
        .from("rewards")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("coin_transactions").select("amount"),
    ]);

    if (approvedUsersResult.error) {
      console.error("Unable to load approved users count", approvedUsersResult.error);
      setError("Unable to load admin overview right now.");
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }

    if (adminsResult.error) {
      console.error("Unable to load admins count", adminsResult.error);
      setError("Unable to load admin overview right now.");
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }

    if (activeRewardsResult.error) {
      console.error("Unable to load active rewards count", activeRewardsResult.error);
      setError("Unable to load admin overview right now.");
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }

    if (coinTransactionsResult.error) {
      console.error(
        "Unable to load total coins issued",
        coinTransactionsResult.error,
      );
      setError("Unable to load admin overview right now.");
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }

    setStats({
      approvedUsers: approvedUsersResult.count ?? 0,
      admins: adminsResult.count ?? 0,
      activeRewards: activeRewardsResult.count ?? 0,
      totalCoinsIssued: sumTransactions(
        (coinTransactionsResult.data ?? []) as CoinTransaction[],
      ),
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOverviewStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadOverviewStats]);

  const overviewStats = [
    { label: "Approved Users", value: formatNumber(stats.approvedUsers) },
    { label: "Admins", value: formatNumber(stats.admins) },
    { label: "Active Rewards", value: formatNumber(stats.activeRewards) },
    {
      label: "Total Z Coins Issued",
      value: formatNumber(stats.totalCoinsIssued),
    },
  ];

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F5] sm:text-5xl">
          Admin Control Panel
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[#F5F5F5]/65">
          Manage loyalty access, rewards, and settings
        </p>
      </header>

      {isLoading ? (
        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-normal text-[#F5F5F5]/60">
            Loading admin overview...
          </p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-6">
          <p className="text-sm font-normal text-[#F5F5F5]">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-lg border border-white/10 bg-white/[0.05] p-5"
            >
              <p className="text-sm font-normal text-[#F5F5F5]/55">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-[#F5F5F5]">
                {stat.value}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
