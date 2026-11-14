import {
  avatarColors,
  formatDueDate,
  getAvatarColor,
  getInitials,
  isTaskOverdue,
} from "@/lib/taskPresentation";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";

const priorityColors: Record<TaskPriority, string> = {
  High: "bg-rose-50 text-rose-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

const statusColors: Record<TaskStatus, string> = {
  Pending: "bg-slate-100 text-slate-600",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

export function TaskOverview({ tasks }: { tasks: Task[] }) {
  return (
    <section
      id="tasks"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Task overview</h2>
          <p className="mt-1 text-sm text-slate-500">
            Keep an eye on what your team is working on.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {tasks.length} tasks
        </span>
      </div>

      <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(120px,0.9fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)_minmax(100px,0.8fr)] gap-4 bg-slate-50/80 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:grid">
        <span>Task</span>
        <span>Assignee</span>
        <span>Due date</span>
        <span>Priority</span>
        <span>Status</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {tasks.map((task) => {
          const isOverdue = isTaskOverdue(task);
          const avatarColor = getAvatarColor(task.assignee);

          return (
            <li
              key={task.id}
              className="grid gap-3 px-5 py-4 transition hover:bg-slate-50/70 sm:px-6 md:grid-cols-[minmax(0,1.8fr)_minmax(120px,0.9fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)_minmax(100px,0.8fr)] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {task.title}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {task.description || "No description"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {task.category || "Uncategorized"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColors[avatarColor]}`}
                  aria-hidden="true"
                >
                  {getInitials(task.assignee)}
                </span>
                <span className="truncate text-xs font-medium text-slate-600">
                  {task.assignee}
                </span>
              </div>

              <time
                dateTime={task.dueDate}
                className={`text-xs font-medium ${isOverdue ? "text-rose-600" : "text-slate-500"}`}
              >
                {isOverdue ? "Overdue · " : ""}
                {formatDueDate(task.dueDate)}
              </time>

              <span
                className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </span>

              <span
                className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${statusColors[task.status]}`}
              >
                {task.status}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
