import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { TaskManager } from "@/components/tasks/TaskManager";
import { requirePageUser } from "@/lib/auth/page";
import { isDatabaseMode } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function TasksPage() {
  if (isDatabaseMode()) {
    const user = await requirePageUser();
    if (!user) redirect("/login");
  }

  return (
    <DashboardShell activePage="tasks">
      <TaskManager />
    </DashboardShell>
  );
}
