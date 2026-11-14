import type { Task } from "@/types/task";
import { isTaskOverdue } from "@/lib/taskPresentation";

export function getTaskStats(
  tasks: Task[],
) {
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === "Completed").length,
    pending: tasks.filter(
      (task) => task.status === "Pending" && !isTaskOverdue(task),
    ).length,
    overdue: tasks.filter((task) => isTaskOverdue(task)).length,
  };
}
