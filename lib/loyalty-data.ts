import { normalizeEmail } from "@/lib/access";
import { supabase } from "@/lib/supabase";

export type CoinTransaction = {
  user_email?: string | null;
  amount: number | string | null;
};

export type Reward = {
  id: string | number;
  title: string;
  description: string | null;
  checkpoint_coins: number;
  reward_type: string | null;
  is_active: boolean | null;
};

export type LeaderboardRow = {
  user_email: string;
  totalCoins: number;
};

function readAmount(value: number | string | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

export function sumCoinTransactions(transactions: CoinTransaction[]) {
  return transactions.reduce(
    (total, transaction) => total + readAmount(transaction.amount),
    0,
  );
}

export async function getUserCoinBalance(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return 0;
  }

  const { data, error } = await supabase
    .from("coin_transactions")
    .select("amount")
    .eq("user_email", normalizedEmail);

  if (error) {
    console.error("Unable to load user coin transactions", error);
    throw error;
  }

  return sumCoinTransactions((data ?? []) as CoinTransaction[]);
}

export async function getActiveRewards() {
  const { data, error } = await supabase
    .from("rewards")
    .select("id, title, description, checkpoint_coins, reward_type, is_active")
    .eq("is_active", true)
    .order("checkpoint_coins", { ascending: true });

  if (error) {
    console.error("Unable to load active rewards", error);
    throw error;
  }

  return (data ?? []) as Reward[];
}

export async function getLeaderboardRows() {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("user_email, amount");

  if (error) {
    console.error("Unable to load leaderboard transactions", error);
    throw error;
  }

  const totals = new Map<string, number>();

  for (const transaction of (data ?? []) as CoinTransaction[]) {
    const email = normalizeEmail(transaction.user_email ?? "");

    if (!email) {
      continue;
    }

    totals.set(email, (totals.get(email) ?? 0) + readAmount(transaction.amount));
  }

  return Array.from(totals.entries())
    .map(([user_email, totalCoins]) => ({ user_email, totalCoins }))
    .sort((firstUser, secondUser) => secondUser.totalCoins - firstUser.totalCoins);
}

export async function getTotalCoinsIssued() {
  const { data, error } = await supabase
    .from("coin_transactions")
    .select("amount");

  if (error) {
    console.error("Unable to load total coins issued", error);
    throw error;
  }

  return sumCoinTransactions((data ?? []) as CoinTransaction[]);
}
