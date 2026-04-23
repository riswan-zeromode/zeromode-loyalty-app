"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { getUserRoleByEmail, normalizeEmail } from "@/lib/access";
import { supabase } from "@/lib/supabase";
import { getErrorMessage, logSupabaseError } from "@/lib/supabase-errors";

type ApprovedUser = {
  id: string | number;
  email: string;
  status: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type MemberFilter = "all" | "active" | "deactivated";

type MemberStatusUpdate = "approved" | "blocked";

const memberFilters: { label: string; value: MemberFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Deactivated", value: "deactivated" },
];

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function isActiveMember(status: string) {
  return status === "approved";
}

function isDeactivatedMember(status: string) {
  return status === "blocked";
}

function getMemberStatusLabel(status: string) {
  if (isActiveMember(status)) {
    return "Active";
  }

  if (isDeactivatedMember(status)) {
    return "Deactivated";
  }

  return "Needs review";
}

function getMemberStatusClasses(status: string) {
  if (isActiveMember(status)) {
    return "bg-[#D51919]/15 text-[var(--brand-text)] ring-[#D51919]/35";
  }

  if (isDeactivatedMember(status)) {
    return "bg-[var(--brand-field)] text-[color:var(--brand-muted)] ring-[var(--brand-border)]";
  }

  return "bg-amber-400/10 text-amber-100 ring-amber-300/25";
}

export default function AdminMembersPage() {
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberFilter>("active");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | number | null>(
    null,
  );
  const [selectedUser, setSelectedUser] = useState<ApprovedUser | null>(null);
  const [pointAmount, setPointAmount] = useState("");
  const [pointReason, setPointReason] = useState("");
  const [isAwardingPoints, setIsAwardingPoints] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadApprovedUsers = useCallback(async () => {
    setIsLoading(true);

    const { data, error: approvedUsersError } = await supabase
      .from("approved_users")
      .select("id, email, status, notes, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (approvedUsersError) {
      logSupabaseError(
        "admin members approved_users select list",
        approvedUsersError,
      );
      setError(
        getErrorMessage(
          approvedUsersError,
          "Unable to load approved customers right now.",
        ),
      );
      setApprovedUsers([]);
      setIsLoading(false);
      return;
    }

    setApprovedUsers(data ?? []);
    setError("");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadApprovedUsers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadApprovedUsers]);

  function openMemberModal(user: ApprovedUser) {
    setSelectedUser(user);
    setPointAmount("");
    setPointReason("");
    setError("");
    setNotice("");
  }

  function closeMemberModal() {
    setSelectedUser(null);
    setPointAmount("");
    setPointReason("");
    setIsAwardingPoints(false);
  }

  async function handleAddEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = normalizeEmail(newEmail);

    if (!email) {
      setError("Enter an email before adding a customer.");
      return;
    }

    setIsAdding(true);
    setError("");
    setNotice("");

    const { error: insertError } = await supabase
      .from("approved_users")
      .insert({ email, status: "approved" });

    if (insertError) {
      logSupabaseError("admin members approved_users insert", insertError);
      setError(
        getErrorMessage(insertError, "Unable to add that email right now."),
      );
      setIsAdding(false);
      return;
    }

    setNewEmail("");
    setNotice("Approved customer added.");
    setIsAdding(false);
    await loadApprovedUsers();
  }

  async function handleSetMemberStatus(
    user: ApprovedUser,
    nextStatus: MemberStatusUpdate,
  ) {
    setPendingUserId(user.id);
    setError("");
    setNotice("");

    setApprovedUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === user.id
          ? { ...currentUser, status: nextStatus }
          : currentUser,
      ),
    );
    setSelectedUser((currentUser) =>
      currentUser?.id === user.id
        ? { ...currentUser, status: nextStatus }
        : currentUser,
    );

    const { error: updateError } = await supabase
      .from("approved_users")
      .update({ status: nextStatus })
      .eq("id", user.id);

    if (updateError) {
      logSupabaseError(
        "admin members approved_users update status",
        updateError,
      );
      setApprovedUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id ? user : currentUser,
        ),
      );
      setSelectedUser((currentUser) =>
        currentUser?.id === user.id ? user : currentUser,
      );
      setError(
        getErrorMessage(updateError, "Unable to update that email right now."),
      );
      setPendingUserId(null);
      return;
    }

    setNotice(
      nextStatus === "approved"
        ? "Customer reactivated."
        : "Customer deactivated.",
    );
    setPendingUserId(null);
  }

  async function handleDeleteUser(user: ApprovedUser) {
    if (!isDeactivatedMember(user.status)) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this user?",
    );

    if (!confirmed) {
      return;
    }

    setPendingUserId(user.id);
    setError("");
    setNotice("");
    setApprovedUsers((currentUsers) =>
      currentUsers.filter((currentUser) => currentUser.id !== user.id),
    );

    const { error: deleteError } = await supabase
      .from("approved_users")
      .delete()
      .eq("id", user.id);

    if (deleteError) {
      logSupabaseError("admin members approved_users delete", deleteError);
      setError(
        getErrorMessage(deleteError, "Unable to delete that email right now."),
      );
      setPendingUserId(null);
      await loadApprovedUsers();
      return;
    }

    setNotice("Customer permanently deleted.");
    setSelectedUser((currentUser) =>
      currentUser?.id === user.id ? null : currentUser,
    );
    setPendingUserId(null);
  }

  async function handleAwardPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    const trimmedAmount = pointAmount.trim();

    if (!trimmedAmount) {
      setError("Enter a point amount.");
      return;
    }

    const amount = Number(trimmedAmount);

    if (!Number.isFinite(amount) || amount === 0) {
      setError("Enter a positive or negative point amount.");
      return;
    }

    const memberEmail = normalizeEmail(selectedUser.email);

    if (!memberEmail) {
      setError("Selected member is missing an email address.");
      return;
    }

    const adminEmail = normalizeEmail(
      window.localStorage.getItem("userEmail") ?? "",
    );

    if (!adminEmail) {
      setError("Admin session expired. Sign in again before adding points.");
      return;
    }

    setIsAwardingPoints(true);
    setError("");
    setNotice("");

    const role = await getUserRoleByEmail(adminEmail);

    if (role !== "admin") {
      setError("Only admins can add points.");
      setIsAwardingPoints(false);
      return;
    }

    const reason = pointReason.trim() || "Manual admin adjustment";
    const { data: insertedTransactions, error: insertError } = await supabase
      .from("coin_transactions")
      .insert({
        user_email: memberEmail,
        amount,
        reason,
        created_by: adminEmail,
        rule_key: "manual_adjustment",
        rule_label: "Manual Adjustment",
      })
      .select("id, user_email, amount, reason, created_by, rule_key, rule_label");

    if (insertError) {
      logSupabaseError(
        "admin members coin_transactions insert manual_adjustment",
        insertError,
      );
      setError(
        getErrorMessage(insertError, "Unable to add points right now."),
      );
      setIsAwardingPoints(false);
      return;
    }

    if (!insertedTransactions || insertedTransactions.length === 0) {
      logSupabaseError(
        "admin members coin_transactions insert manual_adjustment returned no rows",
        insertedTransactions,
      );
      setError("Coin adjustment was not confirmed by Supabase.");
      setIsAwardingPoints(false);
      return;
    }

    setPointAmount("");
    setPointReason("");
    setNotice(`${amount > 0 ? "+" : ""}${amount} points saved for ${memberEmail}.`);
    setIsAwardingPoints(false);
    setSelectedUser(null);
  }

  const activeCount = approvedUsers.filter((user) =>
    isActiveMember(user.status),
  ).length;
  const deactivatedCount = approvedUsers.filter((user) =>
    isDeactivatedMember(user.status),
  ).length;
  const filteredUsers = approvedUsers.filter((user) => {
    if (statusFilter === "all") {
      return true;
    }

    if (statusFilter === "active") {
      return isActiveMember(user.status);
    }

    return isDeactivatedMember(user.status);
  });

  const filterCounts: Record<MemberFilter, number> = {
    all: approvedUsers.length,
    active: activeCount,
    deactivated: deactivatedCount,
  };

  const emptyStateTitle =
    statusFilter === "active"
      ? "No active customers yet"
      : statusFilter === "deactivated"
        ? "No deactivated customers"
        : "No customers yet";
  const selectedUserIsActive = selectedUser
    ? isActiveMember(selectedUser.status)
    : false;
  const selectedUserIsDeactivated = selectedUser
    ? isDeactivatedMember(selectedUser.status)
    : false;
  const selectedUserNextStatus: MemberStatusUpdate = selectedUserIsActive
    ? "blocked"
    : "approved";

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">
          Approved Customers
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[color:var(--brand-muted)]">
          Manage customer emails with loyalty access.
        </p>
      </header>

      <section className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] p-6">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleAddEmail}>
          <input
            type="email"
            value={newEmail}
            onChange={(event) => {
              setNewEmail(event.target.value);
              setError("");
              setNotice("");
            }}
            placeholder="Add customer email"
            className="h-11 min-w-0 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-4 text-sm font-normal text-[var(--brand-text)] outline-none transition placeholder:text-[color:var(--brand-placeholder)] focus:border-[#D51919] focus:bg-[var(--brand-field-focus)] focus:ring-2 focus:ring-[#D51919]/35 sm:w-72"
          />
          <button
            type="submit"
            disabled={isAdding}
            className="h-11 rounded-lg bg-[#D51919] px-4 text-sm font-bold text-white transition hover:bg-[#b91616] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isAdding ? "Adding..." : "Add Email"}
          </button>
        </form>

        {notice ? (
          <p className="mt-4 text-sm font-normal text-[color:var(--brand-muted)]">
            {notice}
          </p>
        ) : null}

        <div className="mt-6">
          <div className="mb-5 flex flex-wrap gap-2">
            {memberFilters.map((filter) => {
              const isSelected = statusFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setError("");
                    setNotice("");
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-normal transition focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] ${
                    isSelected
                      ? "bg-[#D51919] text-white"
                      : "border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[color:var(--brand-muted)] hover:border-[#D51919]/50 hover:text-[var(--brand-text)]"
                  }`}
                >
                  {filter.label}
                  <span className="ml-2 text-xs opacity-70">
                    {filterCounts[filter.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5">
              <p className="text-sm font-normal text-[color:var(--brand-muted)]">
                Loading approved customers...
              </p>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-5">
              <p className="text-sm font-normal text-[var(--brand-text)]">{error}</p>
            </div>
          ) : null}

          {!isLoading && !error && filteredUsers.length === 0 ? (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-8 text-center">
              <h2 className="text-lg font-bold text-[var(--brand-text)]">
                {emptyStateTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-6 text-[color:var(--brand-muted)]">
                {approvedUsers.length === 0
                  ? "Approved users from Supabase will appear here once rows exist in the approved_users table."
                  : "Switch filters to review customers in another access state."}
              </p>
            </div>
          ) : null}

          {!isLoading && filteredUsers.length > 0 ? (
            <div className="divide-y divide-[var(--brand-border)]">
              {filteredUsers.map((user) => {
                const isActive = isActiveMember(user.status);
                const isDeactivated = isDeactivatedMember(user.status);
                const nextStatus: MemberStatusUpdate = isActive
                  ? "blocked"
                  : "approved";

                return (
                  <div
                    key={user.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openMemberModal(user)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openMemberModal(user);
                      }
                    }}
                    className="grid cursor-pointer gap-3 rounded-lg px-3 py-4 transition hover:bg-[var(--brand-surface)] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] xl:grid-cols-[minmax(0,1fr)_150px_170px_220px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-normal text-[var(--brand-text)]">
                        {user.email}
                      </p>
                      {user.notes ? (
                        <p className="mt-1 truncate text-xs font-normal text-[color:var(--brand-muted)]">
                          {user.notes}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-normal ring-1 ${getMemberStatusClasses(
                          user.status,
                        )}`}
                      >
                        {getMemberStatusLabel(user.status)}
                      </span>
                    </div>

                    <p className="text-sm font-normal text-[color:var(--brand-muted)] xl:text-right">
                      {formatDate(user.created_at)}
                    </p>

                    <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                      <button
                        type="button"
                        disabled={pendingUserId === user.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleSetMemberStatus(user, nextStatus);
                        }}
                        className="h-9 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-4 text-sm font-normal text-[var(--brand-text)] transition hover:border-[#D51919]/60 hover:bg-[#D51919]/15 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {pendingUserId === user.id
                          ? "Saving..."
                          : isActive
                            ? "Deactivate"
                            : "Reactivate"}
                      </button>

                      {isDeactivated ? (
                        <button
                          type="button"
                          disabled={pendingUserId === user.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteUser(user);
                          }}
                          className="h-9 rounded-lg border border-[#D51919]/40 bg-[#D51919]/10 px-4 text-sm font-normal text-[var(--brand-text)] transition hover:bg-[#D51919]/20 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Close member details"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={closeMemberModal}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-details-title"
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--brand-border)] bg-[var(--brand-bg)] p-6 shadow-2xl shadow-black/40"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-normal uppercase tracking-[0.18em] text-[#D51919]">
                  Member Details
                </p>
                <h2
                  id="member-details-title"
                  className="mt-3 truncate text-2xl font-bold tracking-tight text-[var(--brand-text)]"
                >
                  {selectedUser.email}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeMemberModal}
                className="h-9 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-3 text-sm font-normal text-[color:var(--brand-muted)] transition hover:border-[#D51919]/60 hover:text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4">
                <p className="text-xs font-normal uppercase tracking-[0.16em] text-[color:var(--brand-muted)]">
                  Status
                </p>
                <span
                  className={`mt-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-normal ring-1 ${getMemberStatusClasses(
                    selectedUser.status,
                  )}`}
                >
                  {getMemberStatusLabel(selectedUser.status)}
                </span>
              </div>

              <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 sm:col-span-2">
                <p className="text-xs font-normal uppercase tracking-[0.16em] text-[color:var(--brand-muted)]">
                  Created
                </p>
                <p className="mt-3 text-sm font-normal text-[var(--brand-text)]">
                  {formatDate(selectedUser.created_at)}
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleAwardPoints}>
              <div>
                <label
                  htmlFor="manual-points"
                  className="text-sm font-normal text-[color:var(--brand-muted)]"
                >
                  Adjust points
                </label>
                <input
                  id="manual-points"
                  type="number"
                  step="1"
                  value={pointAmount}
                  onChange={(event) => {
                    setPointAmount(event.target.value);
                    setError("");
                    setNotice("");
                  }}
                  placeholder="10 or -10"
                  className="mt-2 h-11 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-4 text-sm font-normal text-[var(--brand-text)] outline-none transition placeholder:text-[color:var(--brand-placeholder)] focus:border-[#D51919] focus:bg-[var(--brand-field-focus)] focus:ring-2 focus:ring-[#D51919]/35"
                />
              </div>

              <div>
                <label
                  htmlFor="manual-reason"
                  className="text-sm font-normal text-[color:var(--brand-muted)]"
                >
                  Reason
                </label>
                <input
                  id="manual-reason"
                  type="text"
                  value={pointReason}
                  onChange={(event) => {
                    setPointReason(event.target.value);
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

              {notice ? (
                <p className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3 text-sm font-normal text-[color:var(--brand-muted)]">
                  {notice}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={isAwardingPoints}
                  className="h-10 rounded-lg bg-[#D51919] px-4 text-sm font-bold text-white transition hover:bg-[#b91616] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isAwardingPoints ? "Saving..." : "Save adjustment"}
                </button>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={pendingUserId === selectedUser.id}
                    onClick={() =>
                      void handleSetMemberStatus(
                        selectedUser,
                        selectedUserNextStatus,
                      )
                    }
                    className="h-10 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-field)] px-4 text-sm font-normal text-[var(--brand-text)] transition hover:border-[#D51919]/60 hover:bg-[#D51919]/15 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {pendingUserId === selectedUser.id
                      ? "Saving..."
                      : selectedUserIsActive
                        ? "Deactivate"
                        : "Reactivate"}
                  </button>

                  {selectedUserIsDeactivated ? (
                    <button
                      type="button"
                      disabled={pendingUserId === selectedUser.id}
                      onClick={() => void handleDeleteUser(selectedUser)}
                      className="h-10 rounded-lg border border-[#D51919]/40 bg-[#D51919]/10 px-4 text-sm font-normal text-[var(--brand-text)] transition hover:bg-[#D51919]/20 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[var(--brand-bg)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
