import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { TaskManager } from "@/components/tasks/TaskManager";

export default function TasksPage() {
  return (
    <DashboardShell activePage="tasks">
      <TaskManager />
    </DashboardShell>
  );
}
