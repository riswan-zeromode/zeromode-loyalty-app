export type CoinRuleCode =
  | "first_purchase"
  | "repeat_purchase"
  | "manual_bonus";

export interface CoinRule {
  id: CoinRuleCode;
  name: string;
  coins: number;
  appliesToFutureTransactionsOnly: true;
}

export interface CoinTransaction {
  id: string;
  userEmail: string;
  ruleId: CoinRuleCode;
  ruleName: string;
  coinsAwarded: number;
  awardedAt: string;
}

// Transaction-first coin model:
// currentCoinRules define the amount used when creating future awards.
// coinTransactions store the exact coinsAwarded at the time of each award.
// Do not recalculate historical transactions when an admin edits a rule.
export const coinRules: CoinRule[] = [
  {
    id: "first_purchase",
    name: "First Purchase",
    coins: 100,
    appliesToFutureTransactionsOnly: true,
  },
  {
    id: "repeat_purchase",
    name: "Repeat Purchase",
    coins: 75,
    appliesToFutureTransactionsOnly: true,
  },
  {
    id: "manual_bonus",
    name: "Manual Bonus",
    coins: 50,
    appliesToFutureTransactionsOnly: true,
  },
];

export const coinTransactions: CoinTransaction[] = [
  {
    id: "txn_001",
    userEmail: "maya@zeromode.example",
    ruleId: "repeat_purchase",
    ruleName: "Repeat Purchase",
    coinsAwarded: 75,
    awardedAt: "2026-04-01",
  },
  {
    id: "txn_002",
    userEmail: "omar@zeromode.example",
    ruleId: "first_purchase",
    ruleName: "First Purchase",
    coinsAwarded: 100,
    awardedAt: "2026-04-03",
  },
];

// Example: if Repeat Purchase changes from 75 to 100, txn_001 stays 75
// because it preserved the awarded amount. New repeat_purchase transactions
// created after the rule edit would use the updated 100-coin rule.
