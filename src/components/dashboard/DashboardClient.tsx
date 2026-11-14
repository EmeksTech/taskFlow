"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { TaskOverview } from "@/components/dashboard/TaskOverview";
import { useTasks } from "@/hooks/useTasks";
import { getTaskStats } from "@/lib/taskStats";

function StatIcon({
  type,
}: {
  type: "tasks" | "completed" | "pending" | "overdue";
}) {
  const paths = {
    tasks: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </>
    ),
    completed: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8.5 12 2.3 2.3 4.7-5" />
      </>
    ),
    pending: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    overdue: (
      <>
        <path d="M12 3.5 21 20H3l9-16.5Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[type]}
    </svg>
  );
}

export function DashboardClient() {
  const { tasks, isLoading, error, reload } = useTasks();

  if (isLoading) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
      >
        Loading your tasks…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-sm text-rose-800">
          Could not load dashboard tasks. {error}
        </p>
        <button
          type="button"
          onClick={() => void reload()}
          className="w-fit rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-100"
        >
          Try again
        </button>
      </div>
    );
  }

  const stats = getTaskStats(tasks);

  return (
    <>
      <section
        aria-label="Task statistics"
        className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Total tasks"
          value={stats.total}
          note="Across all team projects"
          icon={<StatIcon type="tasks" />}
          iconClassName="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          note="Nice work from the team"
          icon={<StatIcon type="completed" />}
          iconClassName="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          note="Awaiting work, not overdue"
          icon={<StatIcon type="pending" />}
          iconClassName="bg-amber-50 text-amber-700"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          note="Incomplete tasks past their due date"
          icon={<StatIcon type="overdue" />}
          iconClassName="bg-rose-50 text-rose-700"
        />
      </section>

      {tasks.length > 0 ? (
        <TaskOverview tasks={tasks} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <h2 className="font-semibold text-slate-800">No tasks yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add a task from the Tasks page to see it here.
          </p>
        </div>
      )}
    </>
  );
}
