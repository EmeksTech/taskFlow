import type { ReactNode } from "react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";

type DashboardPage = "overview" | "tasks";

export function DashboardShell({
  activePage,
  children,
}: {
  activePage: DashboardPage;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <Sidebar activePage={activePage} />
      <div className="min-h-screen lg:pl-64">
        <Header />
        <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-10 sm:px-7 sm:pt-12 lg:px-10 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
