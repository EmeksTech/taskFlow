import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function Home() {
  return (
    <DashboardShell activePage="overview">
      <div id="overview" className="mb-7 scroll-mt-24">
        <p className="text-sm font-medium text-emerald-700">Workspace overview</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Your team&apos;s dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          A clear view of your tasks, priorities, and progress across the team.
        </p>
      </div>
      <DashboardClient />
    </DashboardShell>
  );
}
