import { DashboardShell } from "@/components/dashboard-shell";

const userNavLinks = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/rewards", label: "Rewards" },
  { href: "/app/leaderboard", label: "Leaderboard" },
  { href: "/app/settings", label: "Settings" },
];

export default function UserAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      label="ZEROMODE Loyalty"
      title="Member Portal"
      navLinks={userNavLinks}
    >
      {children}
    </DashboardShell>
  );
}
