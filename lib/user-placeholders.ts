export const zCoinsBalance = 320;
export const nextRewardAt = 500;

export const checkpoints = [
  { value: 100, label: "Resource", unlocked: true },
  { value: 250, label: "Entry", unlocked: true },
  { value: 500, label: "Advisory", unlocked: false },
  { value: 1000, label: "Funding", unlocked: false },
];

export const rewards = [
  { name: "Resource Drop", status: "Unlocked" },
  { name: "Tool Giveaway Entry", status: "Unlocked" },
  { name: "Founder Advisory Slot", status: "Locked" },
  { name: "Funding Intro Perk", status: "Locked" },
];

export const leaderboard = [
  { name: "Maya R.", coins: 880 },
  { name: "Omar A.", coins: 640 },
  { name: "You", coins: 320, current: true },
  { name: "Lena K.", coins: 290 },
  { name: "Sam T.", coins: 210 },
];

export const loyaltySettings = [
  { label: "Email Notifications", value: "Enabled" },
  { label: "Reward Reminders", value: "Enabled" },
  { label: "Leaderboard Visibility", value: "Shown as current user" },
];
