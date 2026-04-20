"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { normalizeEmail } from "@/lib/access";
import { supabase } from "@/lib/supabase";

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
    return "bg-[#D51919]/15 text-[#F5F5F5] ring-[#D51919]/35";
  }

  if (isDeactivatedMember(status)) {
    return "bg-white/[0.06] text-[#F5F5F5]/60 ring-white/10";
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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadApprovedUsers = useCallback(async () => {
    setIsLoading(true);

    const { data, error: approvedUsersError } = await supabase
      .from("approved_users")
      .select("id, email, status, notes, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (approvedUsersError) {
      console.error("Unable to load approved users", approvedUsersError);
      setError("Unable to load approved customers right now.");
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
      console.error("Unable to add approved user", insertError);
      setError("Unable to add that email right now.");
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

    const { error: updateError } = await supabase
      .from("approved_users")
      .update({ status: nextStatus })
      .eq("id", user.id);

    if (updateError) {
      console.error("Unable to update approved user status", updateError);
      setApprovedUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id ? user : currentUser,
        ),
      );
      setError("Unable to update that email right now.");
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
      console.error("Unable to delete approved user", deleteError);
      setError("Unable to delete that email right now.");
      setPendingUserId(null);
      await loadApprovedUsers();
      return;
    }

    setNotice("Customer permanently deleted.");
    setPendingUserId(null);
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

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F5] sm:text-5xl">
          Approved Customers
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[#F5F5F5]/65">
          Manage customer emails with loyalty access.
        </p>
      </header>

      <section className="rounded-lg border border-white/10 bg-[#171717] p-6">
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
            className="h-11 min-w-0 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-normal text-[#F5F5F5] outline-none transition placeholder:text-[#F5F5F5]/35 focus:border-[#D51919] focus:bg-white/[0.09] focus:ring-2 focus:ring-[#D51919]/35 sm:w-72"
          />
          <button
            type="submit"
            disabled={isAdding}
            className="h-11 rounded-lg bg-[#D51919] px-4 text-sm font-bold text-[#F5F5F5] transition hover:bg-[#b91616] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#121212] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isAdding ? "Adding..." : "Add Email"}
          </button>
        </form>

        {notice ? (
          <p className="mt-4 text-sm font-normal text-[#F5F5F5]/65">
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
                  className={`rounded-lg px-4 py-2 text-sm font-normal transition focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#121212] ${
                    isSelected
                      ? "bg-[#D51919] text-[#F5F5F5]"
                      : "border border-white/10 bg-white/[0.04] text-[#F5F5F5]/65 hover:border-[#D51919]/50 hover:text-[#F5F5F5]"
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
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm font-normal text-[#F5F5F5]/60">
                Loading approved customers...
              </p>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-5">
              <p className="text-sm font-normal text-[#F5F5F5]">{error}</p>
            </div>
          ) : null}

          {!isLoading && !error && filteredUsers.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center">
              <h2 className="text-lg font-bold text-[#F5F5F5]">
                {emptyStateTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-6 text-[#F5F5F5]/60">
                {approvedUsers.length === 0
                  ? "Approved users from Supabase will appear here once rows exist in the approved_users table."
                  : "Switch filters to review customers in another access state."}
              </p>
            </div>
          ) : null}

          {!isLoading && filteredUsers.length > 0 ? (
            <div className="divide-y divide-white/10">
              {filteredUsers.map((user) => {
                const isActive = isActiveMember(user.status);
                const isDeactivated = isDeactivatedMember(user.status);
                const nextStatus: MemberStatusUpdate = isActive
                  ? "blocked"
                  : "approved";

                return (
                  <div
                    key={user.id}
                    className="grid gap-3 py-4 xl:grid-cols-[minmax(0,1fr)_150px_170px_220px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-normal text-[#F5F5F5]">
                        {user.email}
                      </p>
                      {user.notes ? (
                        <p className="mt-1 truncate text-xs font-normal text-[#F5F5F5]/45">
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

                    <p className="text-sm font-normal text-[#F5F5F5]/60 xl:text-right">
                      {formatDate(user.created_at)}
                    </p>

                    <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                      <button
                        type="button"
                        disabled={pendingUserId === user.id}
                        onClick={() => handleSetMemberStatus(user, nextStatus)}
                        className="h-9 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-normal text-[#F5F5F5] transition hover:border-[#D51919]/60 hover:bg-[#D51919]/15 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#121212] disabled:cursor-not-allowed disabled:opacity-45"
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
                          onClick={() => handleDeleteUser(user)}
                          className="h-9 rounded-lg border border-[#D51919]/40 bg-[#D51919]/10 px-4 text-sm font-normal text-[#F5F5F5] transition hover:bg-[#D51919]/20 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#121212] disabled:cursor-not-allowed disabled:opacity-45"
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
    </>
  );
}
