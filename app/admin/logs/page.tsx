"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { normalizeEmail } from "@/lib/access";
import {
  defaultBranding,
  getBrandingSettings,
  type BrandingSettings,
} from "@/lib/branding";
import { formatNumber } from "@/lib/loyalty-data";
import { supabase } from "@/lib/supabase";
import { getErrorMessage, logSupabaseError } from "@/lib/supabase-errors";

type TransactionLogRow = {
  id: string | number;
  user_email: string | null;
  amount: number | string | null;
  reason: string | null;
  rule_label: string | null;
  created_by: string | null;
  created_at: string | null;
};

type AmountFilter = "all" | "positive" | "negative";

const amountFilters: { label: string; value: AmountFilter }[] = [
  { label: "All", value: "all" },
  { label: "Positive", value: "positive" },
  { label: "Negative", value: "negative" },
];

function readAmount(value: number | string | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatAmount(value: number | string | null) {
  const amount = readAmount(value);
  const sign = amount > 0 ? "+" : "";

  return `${sign}${formatNumber(amount)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminTransactionLogsPage() {
  const [transactions, setTransactions] = useState<TransactionLogRow[]>([]);
  const [branding, setBranding] =
    useState<BrandingSettings>(defaultBranding);
  const [searchEmail, setSearchEmail] = useState("");
  const [amountFilter, setAmountFilter] = useState<AmountFilter>("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionLogRow | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | number | null
  >(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [transactionsResult, nextBranding] = await Promise.all([
        supabase
          .from("coin_transactions")
          .select("id, user_email, amount, reason, rule_label, created_by, created_at")
          .order("created_at", { ascending: false }),
        getBrandingSettings(),
      ]);

      if (transactionsResult.error) {
        logSupabaseError(
          "admin logs coin_transactions select all",
          transactionsResult.error,
        );
        setError(
          getErrorMessage(
            transactionsResult.error,
            "Unable to load transaction logs right now.",
          ),
        );
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      setTransactions((transactionsResult.data ?? []) as TransactionLogRow[]);
      setBranding(nextBranding);
      setIsLoading(false);
    } catch (logsError) {
      logSupabaseError("admin logs load", logsError);
      setError(
        getErrorMessage(logsError, "Unable to load transaction logs right now."),
      );
      setTransactions([]);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTransactions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTransactions]);

  function openAdjustmentModal(transaction: TransactionLogRow) {
    setSelectedTransaction(transaction);
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setError("");
    setNotice("");
  }

  function closeAdjustmentModal() {
    setSelectedTransaction(null);
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setIsAdjusting(false);
  }

  async function handleDeleteTransaction(transaction: TransactionLogRow) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?",
    );

    if (!confirmed) {
      return;
    }

    setDeletingTransactionId(transaction.id);
    setError("");
    setNotice("");

    const { error: deleteError } = await supabase
      .from("coin_transactions")
      .delete()
      .eq("id", transaction.id);

    if (deleteError) {
      logSupabaseError("admin logs coin_transactions delete", deleteError);
      setError(
        getErrorMessage(
          deleteError,
          "Unable to delete that transaction right now.",
        ),
      );
      setDeletingTransactionId(null);
      return;
    }

    setTransactions((currentTransactions) =>
      currentTransactions.filter(
        (currentTransaction) => currentTransaction.id !== transaction.id,
      ),
    );
    setNotice("Transaction deleted.");
    setDeletingTransactionId(null);
  }

  async function handleSaveAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTransaction) {
      return;
    }

    const userEmail = normalizeEmail(selectedTransaction.user_email ?? "");

    if (!userEmail) {
      setError("Selected transaction is missing a member email.");
      return;
    }

    const trimmedAmount = adjustmentAmount.trim();

    if (!trimmedAmount) {
      setError("Enter an adjustment amount.");
      return;
    }

    const amount = Number(trimmedAmount);

    if (!Number.isFinite(amount) || amount === 0) {
      setError("Enter a positive or negative adjustment amount.");
      return;
    }

    const adminEmail = normalizeEmail(
      window.localStorage.getItem("userEmail") ?? "",
    );

    if (!adminEmail) {
      setError("Admin session expired. Sign in again before adjusting points.");
      return;
    }

    setIsAdjusting(true);
    setError("");
    setNotice("");

    const reason = adjustmentReason.trim() || "Manual admin adjustment";

    // Preserve audit history by appending a correction transaction instead of
    // overwriting the original earning or adjustment row.
    const { data: insertedTransactions, error: insertError } = await supabase
      .from("coin_transactions")
      .insert({
        user_email: userEmail,
        amount,
        reason,
        created_by: adminEmail,
        rule_key: "manual_adjustment",
        rule_label: "Manual Adjustment",
      })
      .select("id, user_email, amount, reason, rule_label, created_by, created_at");

    if (insertError) {
      logSupabaseError(
        "admin logs coin_transactions insert manual_adjustment",
        insertError,
      );
      setError(
        getErrorMessage(insertError, "Unable to save adjustment right now."),
      );
      setIsAdjusting(false);
      return;
    }

    if (!insertedTransactions || insertedTransactions.length === 0) {
      logSupabaseError(
        "admin logs coin_transactions insert manual_adjustment returned no rows",
        insertedTransactions,
      );
      setError("Coin adjustment was not confirmed by Supabase.");
      setIsAdjusting(false);
      return;
    }

    const insertedTransaction =
      insertedTransactions[0] as TransactionLogRow;

    setTransactions((currentTransactions) => [
      insertedTransaction,
      ...currentTransactions,
    ]);
    setNotice(`${amount > 0 ? "+" : ""}${amount} adjustment saved for ${userEmail}.`);
    closeAdjustmentModal();
  }

  const normalizedSearchEmail = normalizeEmail(searchEmail);
  const filteredTransactions = transactions.filter((transaction) => {
    const userEmail = normalizeEmail(transaction.user_email ?? "");
    const amount = readAmount(transaction.amount);
    const matchesEmail =
      !normalizedSearchEmail || userEmail.includes(normalizedSearchEmail);
    const matchesAmount =
      amountFilter === "all" ||
      (amountFilter === "positive" && amount > 0) ||
      (amountFilter === "negative" && amount < 0);

    return matchesEmail && matchesAmount;
  });

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          {branding.app_name} ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">
          Transaction Logs
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[color:var(--brand-muted)]">
          Review coin history and add correction adjustments.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            value={searchEmail}
            onChange={(event) => setSearchEmail(event.target.value)}
            placeholder="Search by user email"
            className="h-11 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-4 text-sm font-normal text-[var(--brand-text)] outline-none transition placeholder:text-[color:var(--brand-placeholder)] focus:border-[#D51919] focus:bg-[var(--brand-field-focus)] focus:ring-2 focus:ring-[#D51919]/35 lg:max-w-sm"
          />

          <div className="flex flex-wrap gap-2">
            {amountFilters.map((filter) => {
              const isSelected = amountFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setAmountFilter(filter.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-normal transition focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] ${
                    isSelected
                      ? "bg-[#D51919] text-white"
                      : "border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[color:var(--brand-muted)] hover:border-[#D51919]/50 hover:text-[var(--brand-text)]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {notice ? (
          <p className="mt-4 text-sm font-normal text-[color:var(--brand-muted)]">
            {notice}
          </p>
        ) : null}

        <div className="mt-6">
          {isLoading ? (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5">
              <p className="text-sm font-normal text-[color:var(--brand-muted)]">
                Loading transaction logs...
              </p>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-5">
              <p className="text-sm font-normal text-[var(--brand-text)]">{error}</p>
            </div>
          ) : null}

          {!isLoading && !error && filteredTransactions.length === 0 ? (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-8 text-center">
              <h2 className="text-lg font-bold text-[var(--brand-text)]">
                No transactions found
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
                Adjust your filters or create member transactions to populate
                this log.
              </p>
            </div>
          ) : null}

          {!isLoading && !error && filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--brand-border)] text-left">
                <thead>
                  <tr className="text-xs font-normal uppercase tracking-[0.14em] text-[color:var(--brand-muted)]">
                    <th className="py-3 pr-4">User Email</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Rule</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="py-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--brand-border)]">
                  {filteredTransactions.map((transaction) => {
                    const amount = readAmount(transaction.amount);

                    return (
                      <tr key={transaction.id} className="text-sm font-normal">
                        <td className="max-w-[220px] truncate py-4 pr-4 text-[var(--brand-text)]">
                          {transaction.user_email || "Unknown"}
                        </td>
                        <td
                          className={`px-4 py-4 ${
                            amount < 0 ? "text-[color:var(--brand-muted)]" : "text-[var(--brand-text)]"
                          }`}
                        >
                          {formatAmount(transaction.amount)}
                        </td>
                        <td className="max-w-[260px] truncate px-4 py-4 text-[color:var(--brand-muted)]">
                          {transaction.reason || "Not recorded"}
                        </td>
                        <td className="px-4 py-4 text-[color:var(--brand-muted)]">
                          {transaction.rule_label || "Manual"}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-4 text-[color:var(--brand-muted)]">
                          {transaction.created_by || "Not recorded"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-[color:var(--brand-muted)]">
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className="py-4 pl-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openAdjustmentModal(transaction)}
                              className="h-9 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-3 text-sm font-normal text-[var(--brand-text)] transition hover:border-[#D51919]/60 hover:bg-[#D51919]/15 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)]"
                            >
                              Adjust
                            </button>
                            <button
                              type="button"
                              disabled={deletingTransactionId === transaction.id}
                              onClick={() =>
                                void handleDeleteTransaction(transaction)
                              }
                              className="h-9 rounded-lg border border-[#D51919]/40 bg-[#D51919]/10 px-3 text-sm font-normal text-[var(--brand-text)] transition hover:bg-[#D51919]/20 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {deletingTransactionId === transaction.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>

      {selectedTransaction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close adjustment"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={closeAdjustmentModal}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-adjustment-title"
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] p-6 shadow-2xl shadow-black/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-normal uppercase tracking-[0.18em] text-[#D51919]">
                  New Adjustment
                </p>
                <h2
                  id="transaction-adjustment-title"
                  className="mt-3 truncate text-2xl font-bold tracking-tight text-[var(--brand-text)]"
                >
                  {selectedTransaction.user_email || "Unknown member"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAdjustmentModal}
                className="h-9 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-3 text-sm font-normal text-[color:var(--brand-muted)] transition hover:border-[#D51919]/60 hover:text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
              <p className="text-xs font-normal uppercase tracking-[0.16em] text-[color:var(--brand-muted)]">
                Original transaction
              </p>
              <p className="mt-3 text-sm font-normal text-[color:var(--brand-muted)]">
                {formatAmount(selectedTransaction.amount)} from{" "}
                {selectedTransaction.rule_label || "Manual"}
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSaveAdjustment}>
              <div>
                <label
                  htmlFor="log-adjustment-amount"
                  className="text-sm font-normal text-[color:var(--brand-muted)]"
                >
                  Adjustment amount
                </label>
                <input
                  id="log-adjustment-amount"
                  type="number"
                  step="1"
                  value={adjustmentAmount}
                  onChange={(event) => {
                    setAdjustmentAmount(event.target.value);
                    setError("");
                    setNotice("");
                  }}
                  placeholder="10 or -10"
                  className="mt-2 h-11 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-4 text-sm font-normal text-[var(--brand-text)] outline-none transition placeholder:text-[color:var(--brand-placeholder)] focus:border-[#D51919] focus:bg-[var(--brand-field-focus)] focus:ring-2 focus:ring-[#D51919]/35"
                />
              </div>

              <div>
                <label
                  htmlFor="log-adjustment-reason"
                  className="text-sm font-normal text-[color:var(--brand-muted)]"
                >
                  Reason
                </label>
                <input
                  id="log-adjustment-reason"
                  type="text"
                  value={adjustmentReason}
                  onChange={(event) => {
                    setAdjustmentReason(event.target.value);
                    setError("");
                    setNotice("");
                  }}
                  placeholder="Manual admin adjustment"
                  className="mt-2 h-11 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-4 text-sm font-normal text-[var(--brand-text)] outline-none transition placeholder:text-[color:var(--brand-placeholder)] focus:border-[#D51919] focus:bg-[var(--brand-field-focus)] focus:ring-2 focus:ring-[#D51919]/35"
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-3 text-sm font-normal text-[var(--brand-text)]">
                  {error}
                </p>
              ) : null}

              <div className="border-t border-[var(--brand-border)] pt-5">
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="h-10 rounded-lg bg-[#D51919] px-4 text-sm font-bold text-white transition hover:bg-[#b91616] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isAdjusting ? "Saving..." : "Save adjustment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
