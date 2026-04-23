"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CoinRule = {
  id: string | number;
  action_key: string;
  label: string;
  coin_value: number;
  enabled: boolean;
};

type CoinRuleDraft = {
  action_key: string;
  label: string;
  coin_value: string;
  enabled: boolean;
};

type CoinRulePayload = {
  action_key: string;
  label: string;
  coin_value: number;
  enabled: boolean;
};

type CoinRuleValidationResult =
  | { ok: true; payload: CoinRulePayload }
  | { ok: false; error: string };

const emptyCoinRuleDraft: CoinRuleDraft = {
  action_key: "",
  label: "",
  coin_value: "",
  enabled: true,
};

function getCoinRuleDraft(rule: CoinRule): CoinRuleDraft {
  return {
    action_key: rule.action_key,
    label: rule.label,
    coin_value: String(rule.coin_value),
    enabled: rule.enabled,
  };
}

export default function AdminCoinRulesPage() {
  const [coinRules, setCoinRules] = useState<CoinRule[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, CoinRuleDraft>>(
    {},
  );
  const [newRule, setNewRule] = useState<CoinRuleDraft>(emptyCoinRuleDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingRuleId, setPendingRuleId] = useState<string | number | null>(
    null,
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCoinRules = useCallback(async () => {
    setIsLoading(true);

    const { data, error: coinRulesError } = await supabase
      .from("coin_rules")
      .select("id, action_key, label, coin_value, enabled")
      .order("label", { ascending: true });

    if (coinRulesError) {
      console.error("Unable to load coin rules", coinRulesError);
      setError("Unable to load coin rules right now.");
      setCoinRules([]);
      setDraftValues({});
      setIsLoading(false);
      return;
    }

    const rules = data ?? [];
    setCoinRules(rules);
    setDraftValues(
      Object.fromEntries(
        rules.map((rule) => [String(rule.id), getCoinRuleDraft(rule)]),
      ),
    );
    setError("");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCoinRules();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCoinRules]);

  function validateDraft(draft: CoinRuleDraft): CoinRuleValidationResult {
    const actionKey = draft.action_key.trim();
    const label = draft.label.trim();
    const coinValue = Number(draft.coin_value);

    if (!actionKey) {
      return { ok: false, error: "Enter an action key before saving." };
    }

    if (!label) {
      return { ok: false, error: "Enter a label before saving." };
    }

    if (!Number.isFinite(coinValue) || coinValue < 0) {
      return { ok: false, error: "Enter a valid coin value before saving." };
    }

    return {
      ok: true,
      payload: {
        action_key: actionKey,
        label,
        coin_value: coinValue,
        enabled: draft.enabled,
      },
    };
  }

  async function handleCreateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = validateDraft(newRule);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setIsCreating(true);
    setError("");
    setNotice("");

    const { error: insertError } = await supabase
      .from("coin_rules")
      .insert(result.payload);

    if (insertError) {
      console.error("Unable to create coin rule", insertError);
      setError("Unable to create that coin rule right now.");
      setIsCreating(false);
      return;
    }

    setNewRule(emptyCoinRuleDraft);
    setNotice("Coin rule created.");
    setIsCreating(false);
    await loadCoinRules();
  }

  async function handleSaveRule(rule: CoinRule) {
    const ruleKey = String(rule.id);
    const draft = draftValues[ruleKey];

    if (!draft) {
      setError("Unable to find that coin rule draft.");
      return;
    }

    const result = validateDraft(draft);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPendingRuleId(rule.id);
    setError("");
    setNotice("");

    // Forward-only rule change:
    // this updates the rule used when creating future coin awards.
    // Existing coin_transactions keep their awarded amount and rule snapshot,
    // so historical balances are never recalculated here.
    const { error: updateError } = await supabase
      .from("coin_rules")
      .update(result.payload)
      .eq("id", rule.id);

    if (updateError) {
      console.error("Unable to update coin rule", updateError);
      setError("Unable to save that coin rule right now.");
      setPendingRuleId(null);
      return;
    }

    setNotice("Coin rule saved. Future awards will use the saved rule.");
    setPendingRuleId(null);
    await loadCoinRules();
  }

  async function handleDeleteRule(rule: CoinRule) {
    setPendingRuleId(rule.id);
    setError("");
    setNotice("");

    // Deleting a rule removes it from future admin selection only.
    // Do not touch coin_transactions: each transaction stores the awarded
    // amount and rule snapshot that were true when the award was created.
    const { error: deleteError } = await supabase
      .from("coin_rules")
      .delete()
      .eq("id", rule.id);

    if (deleteError) {
      console.error("Unable to delete coin rule", deleteError);
      setError("Unable to delete that coin rule right now.");
      setPendingRuleId(null);
      return;
    }

    setCoinRules((currentRules) =>
      currentRules.filter((currentRule) => currentRule.id !== rule.id),
    );
    setNotice("Coin rule deleted. Past transactions were not changed.");
    setPendingRuleId(null);
    await loadCoinRules();
  }

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#121212] sm:text-5xl">
          Coin Rules
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[#121212]/65">
          Manage future coin award values for purchases and bonuses.
        </p>
      </header>

      <section className="mb-5 rounded-lg border border-[#D51919]/30 bg-[#D51919]/10 p-5">
        <h2 className="text-base font-bold text-[#121212]">
          Forward-only awards
        </h2>
        <p className="mt-2 text-sm font-normal leading-6 text-[#121212]/65">
          Coin rule edits and deletes apply only to future awards. Existing
          coin transactions keep the awarded amount and rule snapshot recorded
          at the time of the transaction.
        </p>
      </section>

      <section className="mb-5 rounded-lg border border-black/10 bg-black/[0.04] p-6">
        <h2 className="text-lg font-bold text-[#121212]">
          Add Coin Rule
        </h2>
        <form
          className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_140px_120px_120px]"
          onSubmit={handleCreateRule}
        >
          <input
            type="text"
            value={newRule.action_key}
            onChange={(event) => {
              setNewRule((currentRule) => ({
                ...currentRule,
                action_key: event.target.value,
              }));
              setError("");
              setNotice("");
            }}
            placeholder="action_key"
            className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
          />
          <input
            type="text"
            value={newRule.label}
            onChange={(event) => {
              setNewRule((currentRule) => ({
                ...currentRule,
                label: event.target.value,
              }));
              setError("");
              setNotice("");
            }}
            placeholder="Label"
            className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
          />
          <input
            type="number"
            min="0"
            value={newRule.coin_value}
            onChange={(event) => {
              setNewRule((currentRule) => ({
                ...currentRule,
                coin_value: event.target.value,
              }));
              setError("");
              setNotice("");
            }}
            placeholder="Coins"
            className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
          />
          <label className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-black/[0.04] px-3 text-sm font-normal text-[#121212]/70">
            <input
              type="checkbox"
              checked={newRule.enabled}
              onChange={(event) => {
                setNewRule((currentRule) => ({
                  ...currentRule,
                  enabled: event.target.checked,
                }));
                setError("");
                setNotice("");
              }}
              className="h-4 w-4 accent-[#D51919]"
            />
            Enabled
          </label>
          <button
            type="submit"
            disabled={isCreating}
            className="h-10 rounded-lg bg-[#D51919] px-4 text-sm font-bold text-white transition hover:bg-[#b91616] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreating ? "Adding..." : "Add Rule"}
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
              Loading coin rules...
            </p>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="rounded-lg border border-[#D51919]/35 bg-[#D51919]/10 p-5">
            <p className="text-sm font-normal text-[#121212]">{error}</p>
          </div>
        ) : null}

        {!isLoading && coinRules.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-black/[0.04] p-8 text-center">
            <h2 className="text-lg font-bold text-[#121212]">
              No coin rules found
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-normal leading-6 text-[#121212]/60">
              Rules from Supabase will appear here once rows exist in the
              coin_rules table.
            </p>
          </div>
        ) : null}

        {!isLoading && coinRules.length > 0 ? (
          <div className="divide-y divide-black/10">
            {coinRules.map((rule) => {
              const ruleKey = String(rule.id);
              const draft = draftValues[ruleKey] ?? getCoinRuleDraft(rule);

              return (
                <div
                  key={rule.id}
                  className="grid gap-3 py-4 xl:grid-cols-[1fr_1fr_130px_120px_100px_100px]"
                >
                  <input
                    type="text"
                    value={draft.action_key}
                    onChange={(event) => {
                      setDraftValues((currentValues) => ({
                        ...currentValues,
                        [ruleKey]: {
                          ...draft,
                          action_key: event.target.value,
                        },
                      }));
                      setError("");
                      setNotice("");
                    }}
                    className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-3 text-sm font-normal text-[#121212] outline-none transition placeholder:text-[#121212]/35 focus:border-[#D51919] focus:bg-black/[0.09] focus:ring-2 focus:ring-[#D51919]/35"
                  />
                  <input
                    type="text"
                    value={draft.label}
                    onChange={(event) => {
                      setDraftValues((currentValues) => ({
                        ...currentValues,
                        [ruleKey]: {
                          ...draft,
                          label: event.target.value,
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
                    value={draft.coin_value}
                    onChange={(event) => {
                      setDraftValues((currentValues) => ({
                        ...currentValues,
                        [ruleKey]: {
                          ...draft,
                          coin_value: event.target.value,
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
                      checked={draft.enabled}
                      onChange={(event) => {
                        setDraftValues((currentValues) => ({
                          ...currentValues,
                          [ruleKey]: {
                            ...draft,
                            enabled: event.target.checked,
                          },
                        }));
                        setError("");
                        setNotice("");
                      }}
                      className="h-4 w-4 accent-[#D51919]"
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    disabled={pendingRuleId === rule.id}
                    onClick={() => handleSaveRule(rule)}
                    className="h-10 rounded-lg border border-black/10 bg-black/[0.06] px-4 text-sm font-normal text-[#121212] transition hover:border-[#D51919]/60 hover:bg-[#D51919]/15 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingRuleId === rule.id ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    disabled={pendingRuleId === rule.id}
                    onClick={() => handleDeleteRule(rule)}
                    className="h-10 rounded-lg border border-[#D51919]/40 bg-[#D51919]/10 px-4 text-sm font-normal text-[#121212] transition hover:bg-[#D51919]/20 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </>
  );
}
