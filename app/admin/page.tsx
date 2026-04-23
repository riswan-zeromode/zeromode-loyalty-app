"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultBranding,
  getBrandingSettings,
  type BrandingSettings,
} from "@/lib/branding";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatNumber, getTotalCoinsIssued } from "@/lib/loyalty-data";
import { supabase } from "@/lib/supabase";
import { getErrorMessage, logSupabaseError } from "@/lib/supabase-errors";

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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminOverviewStats>(emptyStats);
  const [branding, setBranding] =
    useState<BrandingSettings>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverviewStats = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [
        approvedUsersResult,
        adminsResult,
        activeRewardsResult,
        totalCoinsIssued,
        nextBranding,
      ] = await Promise.all([
        supabase
          .from("approved_users")
          .select("id")
          .eq("status", "approved"),
        supabase.from("admins").select("email"),
        supabase
          .from("rewards")
          .select("id")
          .eq("is_active", true),
        getTotalCoinsIssued(),
        getBrandingSettings(),
      ]);

      if (approvedUsersResult.error) {
        logSupabaseError(
          "admin overview approved_users select approved count",
          approvedUsersResult.error,
        );
        setError(
          getErrorMessage(
            approvedUsersResult.error,
            "Unable to load approved users count.",
          ),
        );
        setStats(emptyStats);
        setIsLoading(false);
        return;
      }

      if (adminsResult.error) {
        logSupabaseError(
          "admin overview admins select count",
          adminsResult.error,
        );
        setError(
          getErrorMessage(adminsResult.error, "Unable to load admins count."),
        );
        setStats(emptyStats);
        setIsLoading(false);
        return;
      }

      if (activeRewardsResult.error) {
        logSupabaseError(
          "admin overview rewards select active count",
          activeRewardsResult.error,
        );
        setError(
          getErrorMessage(
            activeRewardsResult.error,
            "Unable to load active rewards count.",
          ),
        );
        setStats(emptyStats);
        setIsLoading(false);
        return;
      }

      setStats({
        approvedUsers: approvedUsersResult.data?.length ?? 0,
        admins: adminsResult.data?.length ?? 0,
        activeRewards: activeRewardsResult.data?.length ?? 0,
        totalCoinsIssued,
      });
      setBranding(nextBranding);
      setIsLoading(false);
    } catch (overviewError) {
      logSupabaseError("admin overview load", overviewError);
      setError(
        getErrorMessage(
          overviewError,
          "Unable to load admin overview right now.",
        ),
      );
      setStats(emptyStats);
      setIsLoading(false);
      return;
    }
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
      label: `Total ${branding.coin_name} Issued`,
      value: formatNumber(stats.totalCoinsIssued),
    },
  ];

  return (
    <>
      <header className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
            {branding.app_name} ADMIN
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">
            Admin Control Panel
          </h1>
          <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[color:var(--brand-muted)]">
            Manage loyalty access, rewards, and settings
          </p>
        </div>
        <div className="sm:pt-1">
          <ThemeToggle />
        </div>
      </header>

      {isLoading ? (
        <section className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6">
          <p className="text-sm font-normal text-[color:var(--brand-muted)]">
            Loading admin overview...
          </p>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-6">
          <p className="text-sm font-normal text-[var(--brand-text)]">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5"
            >
              <p className="text-sm font-normal text-[color:var(--brand-muted)]">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-[var(--brand-text)]">
                {stat.value}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
