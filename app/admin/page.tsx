import { overviewStats } from "@/lib/admin-placeholders";

export default function AdminDashboardPage() {
  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-normal uppercase tracking-[0.18em] text-[#D51919]">
          ZEROMODE ADMIN
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F5] sm:text-5xl">
          Admin Control Panel
        </h1>
        <p className="mt-4 max-w-2xl text-base font-normal leading-7 text-[#F5F5F5]/65">
          Manage loyalty access, rewards, and settings
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-lg border border-white/10 bg-white/[0.05] p-5"
          >
            <p className="text-sm font-normal text-[#F5F5F5]/55">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[#F5F5F5]">
              {stat.value}
            </p>
          </article>
        ))}
      </section>
    </>
  );
}
