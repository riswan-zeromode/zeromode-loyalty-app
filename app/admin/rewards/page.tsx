"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Reward = {
  id: string | number;
  title: string;
  description: string | null;
  checkpoint_coins: number;
  reward_type: string;
  is_active: boolean;
};

type RewardDraft = {
  title: string;
  description: string;
  checkpoint_coins: string;
  reward_type: string;
  is_active: boolean;
};

type RewardPayload = {
  title: string;
  description: string | null;
  checkpoint_coins: number;
  reward_type: string;
  is_active: boolean;
};

type RewardValidationResult =
  | { ok: true; payload: RewardPayload }
  | { ok: false; error: string };

const emptyRewardDraft: RewardDraft = {
  title: "",
  description: "",
  checkpoint_coins: "",
  reward_type: "",
  is_active: true,
};

function getRewardDraft(reward: Reward): RewardDraft {
  return {
    title: reward.title,
    description: reward.description ?? "",
    checkpoint_coins: String(reward.checkpoint_coins),
    reward_type: reward.reward_type,
    is_active: reward.is_active,
  };
}

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [draftRewards, setDraftRewards] = useState<Record<string, RewardDraft>>(
    {},
  );
  const [newReward, setNewReward] = useState<RewardDraft>(emptyRewardDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingRewardId, setPendingRewardId] = useState<
    string | number | null
  >(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRewards = useCallback(async () => {
    setIsLoading(true);

    const { data, error: rewardsError } = await supabase
      .from("rewards")
      .select("id, title, description, checkpoint_coins, reward_type, is_active")
      .order("checkpoint_coins", { ascending: true });

    if (rewardsError) {
      console.error("Unable to load rewards", rewardsError);
      setError("Unable to load rewards right now.");
      setRewards([]);
      setDraftRewards({});
      setIsLoading(false);
      return;
    }

    const nextRewards = data ?? [];
    setRewards(nextRewards);
    setDraftRewards(
      Object.fromEntries(
        nextRewards.map((reward) => [
          String(reward.id),
          getRewardDraft(reward),
        ]),
      ),
    );
    setError("");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRewards();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRewards]);

  function validateDraft(draft: RewardDraft): RewardValidationResult {
    const title = draft.title.trim();
    const description = draft.description.trim();
    const checkpointCoins = Number(draft.checkpoint_coins);
    const rewardType = draft.reward_type.trim();

    if (!title) {
      return { ok: false, error: "Enter a reward title before saving." };
    }

    if (!Number.isFinite(checkpointCoins) || checkpointCoins < 0) {
      return { ok: false, error: "Enter a valid checkpoint before saving." };
    }

    if (!rewardType) {
      return { ok: false, error: "Enter a reward type before saving." };
    }

    return {
      ok: true,
      payload: {
        title,
        description: description || null,
        checkpoint_coins: checkpointCoins,
        reward_type: rewardType,
        is_active: draft.is_active,
      },
    };
  }

  async function handleCreateReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateDraft(newReward);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setIsCreating(true);
    setError("");
    setNotice("");

    const { error: insertError } = await supabase
      .from("rewards")
      .insert(result.payload);

    if (insertError) {
      console.error("Unable to create reward", insertError);
      setError("Unable to create that reward right now.");
      setIsCreating(false);
      return;
    }

    setNewReward(emptyRewardDraft);
    setNotice("Reward created.");
    setIsCreating(false);
    await loadRewards();
  }

  async function handleSaveReward(reward: Reward) {
    const rewardKey = String(reward.id);
    const draft = draftRewards[rewardKey];

    if (!draft) {
      setError("Unable to find that reward draft.");
      return;
    }

    const result = validateDraft(draft);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPendingRewardId(reward.id);
    setError("");
    setNotice("");

    const { error: updateError } = await supabase
      .from("rewards")
      .update(result.payload)
      .eq("id", reward.id);

    if (updateError) {
      console.error("Unable to update reward", updateError);
      setError("Unable to save that reward right now.");
      setPendingRewardId(null);
      return;
    }

    setNotice("Reward saved.");
    setPendingRewardId(null);
    await loadRewards();
  }

  async function handleDeleteReward(reward: Reward) {
    setPendingRewardId(reward.id);
    setError("");
    setNotice("");

    const { error: deleteError } = await supabase
      .from("rewards")
      .delete()
      .eq("id", reward.id);

    if (deleteError) {
      console.error("Unable to delete reward", deleteError);
      setError("Unable to delete that reward right now.");
      setPendingRewardId(null);
      return;
    }

    setRewards((currentRewards) =>
      currentRewards.filter((currentReward) => currentReward.id !== reward.id),
    );
    setNotice("Reward deleted.");
    setPendingRewardId(null);
    await loadRewards();
  }

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#121212] sm:text-5xl">
          Reward Checkpoints
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[#121212]/65">
          Manage reward names, checkpoint requirements, and availability.
        </p>
      </header>

      <section className="mb-5 rounded-lg border border-black/10 bg-black/[0.04] p-6">
        <h2 className="text-lg font-bold text-[#121212]">
          Add Reward
        </h2>
        <form className="mt-4 grid gap-3" onSubmit={handleCreateReward}>
          <div className="grid gap-3 xl:grid-cols-[1fr_160px_180px_120px]">
            <input
              type="text"
              value={newReward.title}
              onChange={(event) => {
                setNewReward((currentReward) => ({
                  ...currentReward,
                  title: event.target.value,
                }));
                setError("");
                setNotice("");
              }}
              placeholder="Reward title"
              className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
            />
            <input
              type="number"
              min="0"
              value={newReward.checkpoint_coins}
              onChange={(event) => {
                setNewReward((currentReward) => ({
                  ...currentReward,
                  checkpoint_coins: event.target.value,
                }));
                setError("");
                setNotice("");
              }}
              placeholder="Checkpoint"
              className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
            />
            <input
              type="text"
              value={newReward.reward_type}
              onChange={(event) => {
                setNewReward((currentReward) => ({
                  ...currentReward,
                  reward_type: event.target.value,
                }));
                setError("");
                setNotice("");
              }}
              placeholder="reward_type"
              className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
            />
            <label className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-black/[0.04] px-3 text-sm font-normal text-[#121212]/70">
              <input
                type="checkbox"
                checked={newReward.is_active}
                onChange={(event) => {
                  setNewReward((currentReward) => ({
                    ...currentReward,
                    is_active: event.target.checked,
                  }));
                  setError("");
                  setNotice("");
                }}
                className="h-4 w-4 accent-[#D51919]"
              />
              Active
            </label>
          </div>
          <textarea
            value={newReward.description}
            onChange={(event) => {
              setNewReward((currentReward) => ({
                ...currentReward,
                description: event.target.value,
              }));
              setError("");
              setNotice("");
            }}
            placeholder="Description"
            rows={3}
            className="rounded-lg border border-black/10 bg-black/[0.06] px-3 py-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="h-10 rounded-lg bg-[#D51919] px-4 text-sm font-bold text-white transition hover:bg-[#b91616] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
          >
            {isCreating ? "Adding..." : "Add Reward"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-black/10 bg-black/[0.04] p-6">
        {notice ? (
          <p className="mb-4 text-sm font-normal text-[#121212]/65">
            {notice}
          </p>
        ) : null}

        {isLoading ? (
          <div className="rounded-lg border border-black/10 bg-black/[0.04] p-5">
            <p className="text-sm font-normal text-[#121212]/60">
              Loading rewards...
            </p>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-5">
            <p className="text-sm font-normal text-[#121212]">{error}</p>
          </div>
        ) : null}

        {!isLoading && rewards.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-black/[0.04] p-8 text-center">
            <h2 className="text-lg font-bold text-[#121212]">
              No rewards found
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-6 text-[#121212]/60">
              Rewards from Supabase will appear here once rows exist in the
              rewards table.
            </p>
          </div>
        ) : null}

        {!isLoading && rewards.length > 0 ? (
          <div className="space-y-4">
            {rewards.map((reward) => {
              const rewardKey = String(reward.id);
              const draft = draftRewards[rewardKey] ?? getRewardDraft(reward);

              return (
                <div
                  key={reward.id}
                  className="rounded-lg border border-black/10 bg-black/[0.03] p-4"
                >
                  <div className="grid gap-3 xl:grid-cols-[1fr_160px_180px_120px]">
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(event) => {
                        setDraftRewards((currentRewards) => ({
                          ...currentRewards,
                          [rewardKey]: {
                            ...draft,
                            title: event.target.value,
                          },
                        }));
                        setError("");
                        setNotice("");
                      }}
                      className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
                    />
                    <input
                      type="number"
                      min="0"
                      value={draft.checkpoint_coins}
                      onChange={(event) => {
                        setDraftRewards((currentRewards) => ({
                          ...currentRewards,
                          [rewardKey]: {
                            ...draft,
                            checkpoint_coins: event.target.value,
                          },
                        }));
                        setError("");
                        setNotice("");
                      }}
                      className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
                    />
                    <input
                      type="text"
                      value={draft.reward_type}
                      onChange={(event) => {
                        setDraftRewards((currentRewards) => ({
                          ...currentRewards,
                          [rewardKey]: {
                            ...draft,
                            reward_type: event.target.value,
                          },
                        }));
                        setError("");
                        setNotice("");
                      }}
                      className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
                    />
                    <label className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-black/[0.04] px-3 text-sm font-normal text-[#121212]/70">
                      <input
                        type="checkbox"
                        checked={draft.is_active}
                        onChange={(event) => {
                          setDraftRewards((currentRewards) => ({
                            ...currentRewards,
                            [rewardKey]: {
                              ...draft,
                              is_active: event.target.checked,
                            },
                          }));
                          setError("");
                          setNotice("");
                        }}
                        className="h-4 w-4 accent-[#D51919]"
                      />
                      Active
                    </label>
                  </div>
                  <textarea
                    value={draft.description}
                    onChange={(event) => {
                      setDraftRewards((currentRewards) => ({
                        ...currentRewards,
                        [rewardKey]: {
                          ...draft,
                          description: event.target.value,
                        },
                      }));
                      setError("");
                      setNotice("");
                    }}
                    rows={3}
                    className="mt-3 w-full rounded-lg border border-black/10 bg-black/[0.06] px-3 py-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
                  />
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      disabled={pendingRewardId === reward.id}
                      onClick={() => handleSaveReward(reward)}
                      className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-4 text-sm font-normal text-[#121212] transition hover:border-[#D51919]/60 hover:bg-[#D51919]/15 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {pendingRewardId === reward.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={pendingRewardId === reward.id}
                      onClick={() => handleDeleteReward(reward)}
                      className="h-10 rounded-lg border border-[#D51919]/40 bg-[#D51919]/10 px-4 text-sm font-normal text-[#121212] transition hover:bg-[#D51919]/20 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </>
  );
}
