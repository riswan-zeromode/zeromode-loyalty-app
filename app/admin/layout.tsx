import { DashboardShell } from "@/components/dashboard-shell";

const adminNavLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/coin-rules", label: "Coin Rules" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      label="ZEROMODE Admin"
      title="Control Panel"
      navLinks={adminNavLinks}
      requiredRole="admin"
    >
      {children}
    </DashboardShell>
  );
}
