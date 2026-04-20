"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const userEmailStorageKey = "userEmail";

export type DashboardNavLink = {
  href: string;
  label: string;
};

export function DashboardShell({
  children,
  label,
  title,
  navLinks,
}: {
  children: React.ReactNode;
  label: string;
  title: string;
  navLinks: DashboardNavLink[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    const storedEmail = localStorage.getItem(userEmailStorageKey);

    if (!storedEmail) {
      router.replace("/login");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUserEmail(storedEmail);
      setHasCheckedSession(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  function handleSignOut() {
    localStorage.removeItem(userEmailStorageKey);
    router.replace("/login");
  }

  if (!hasCheckedSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#121212] px-6 py-12 font-sans text-[#F5F5F5]">
        <p className="text-sm font-normal text-[#F5F5F5]/60">
          Checking access...
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] font-sans text-[#F5F5F5]">
      {isMenuOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col border-r border-white/10 bg-[#151515] px-4 py-5 transition-transform duration-200 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-2 pb-6">
          <p className="text-xs font-normal uppercase tracking-[0.18em] text-[#D51919]">
            {label}
          </p>
          <p className="mt-3 text-lg font-bold tracking-tight text-[#F5F5F5]">
            {title}
          </p>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block rounded-lg px-3 py-3 text-sm transition ${
                  isActive
                    ? "bg-[#D51919] font-bold text-[#F5F5F5]"
                    : "font-normal text-[#F5F5F5]/65 hover:bg-white/[0.06] hover:text-[#F5F5F5]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-normal uppercase tracking-[0.16em] text-[#F5F5F5]/45">
            Signed in as
          </p>
          <p className="mt-2 truncate text-sm font-normal text-[#F5F5F5]">
            {userEmail}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-4 h-9 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-normal text-[#F5F5F5] transition hover:border-[#D51919]/60 hover:bg-[#D51919]/15 focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#151515]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#121212]/95 px-5 py-4 backdrop-blur sm:px-8 lg:px-10">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={
                  isMenuOpen ? "Close navigation menu" : "Open navigation menu"
                }
                aria-expanded={isMenuOpen}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-[#F5F5F5] transition hover:border-[#D51919]/60 hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-[#D51919] focus:ring-offset-2 focus:ring-offset-[#121212]"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                <span className="flex w-5 flex-col gap-1.5">
                  <span className="h-px w-full bg-current" />
                  <span className="h-px w-full bg-current" />
                  <span className="h-px w-full bg-current" />
                </span>
              </button>
              <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
                {label}
              </p>
            </div>
          </div>
        </header>

        <main className="px-5 py-6 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
