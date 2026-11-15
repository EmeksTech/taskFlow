"use client";

import { useState, type FormEvent } from "react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { useTasks } from "@/hooks/useTasks";
import {
  avatarColors,
  formatDueDate,
  getAvatarColor,
  getInitials,
  isTaskOverdue,
} from "@/lib/taskPresentation";
import { createTask, deleteTask, updateTask } from "@/services/taskService";
import type {
  Task,
  TaskInput,
  TaskListQuery,
  TaskPriority,
  TaskStatus,
} from "@/types/task";

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

interface TaskFilterDraft {
  search: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  assignee: string;
  dueAfter: string;
  dueBefore: string;
}

const emptyFilters: TaskFilterDraft = {
  search: "",
  status: "",
  priority: "",
  assignee: "",
  dueAfter: "",
  dueBefore: "",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Please try again. Your changes have not been applied.";
}

export function TaskManager() {
  const [query, setQuery] = useState<TaskListQuery>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    order: "desc",
  });
  const [filters, setFilters] = useState(emptyFilters);
  const { tasks, pageInfo, isLoading, error, reload } = useTasks(query);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery: TaskListQuery = {
      page: 1,
      limit: query.limit ?? 10,
      sortBy: "createdAt",
      order: "desc",
    };
    if (filters.search.trim()) nextQuery.search = filters.search.trim();
    if (filters.status) nextQuery.status = filters.status;
    if (filters.priority) nextQuery.priority = filters.priority;
    if (filters.assignee.trim()) nextQuery.assignee = filters.assignee.trim();
    if (filters.dueAfter) nextQuery.dueAfter = filters.dueAfter;
    if (filters.dueBefore) nextQuery.dueBefore = filters.dueBefore;
    setQuery(nextQuery);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setQuery({
      page: 1,
      limit: query.limit ?? 10,
      sortBy: "createdAt",
      order: "desc",
    });
  }

  function openCreateForm() {
    setEditingTask(undefined);
    setFormError(null);
    setIsFormOpen(true);
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setFormError(null);
    setIsFormOpen(true);
  }

  async function saveTask(values: TaskInput) {
    setFormError(null);
    setIsMutating(true);

    try {
      if (editingTask) {
        await updateTask(editingTask.id, values);
        await reload();
      } else {
        await createTask(values);
        if (query.page !== 1) {
          setQuery((current) => ({ ...current, page: 1 }));
        } else {
          await reload();
        }
      }

      setIsFormOpen(false);
      setEditingTask(undefined);
    } catch (saveError) {
      setFormError(getErrorMessage(saveError));
    } finally {
      setIsMutating(false);
    }
  }

  async function markCompleted(task: Task) {
    setActionError(null);
    setIsMutating(true);

    try {
      await updateTask(task.id, { status: "Completed" });
      await reload();
    } catch (updateError) {
      setActionError(getErrorMessage(updateError));
    } finally {
      setIsMutating(false);
    }
  }

  async function confirmDelete() {
    if (!taskToDelete) return;

    setDeleteError(null);
    setIsMutating(true);

    try {
      await deleteTask(taskToDelete.id);
      setTaskToDelete(null);
      if (query.page && query.page > 1 && tasks.length === 1) {
        setQuery((current) => ({
          ...current,
          page: Math.max(1, (current.page ?? 1) - 1),
        }));
      } else {
        await reload();
      }
    } catch (deleteError) {
      setDeleteError(getErrorMessage(deleteError));
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Tasks
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Plan, update, and track your team&apos;s work in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          disabled={isLoading || Boolean(error)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          Add Task
        </button>
      </div>

      <form
        onSubmit={applyFilters}
        className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Search title and description
          </span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            maxLength={200}
            placeholder="Search tasks"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Status</span>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as TaskFilterDraft["status"],
              }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Priority</span>
          <select
            value={filters.priority}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                priority: event.target.value as TaskFilterDraft["priority"],
              }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All priorities</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Assignee</span>
          <input
            value={filters.assignee}
            onChange={(event) =>
              setFilters((current) => ({ ...current, assignee: event.target.value }))
            }
            maxLength={120}
            placeholder="Filter by assignee"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Due on or after</span>
          <input
            type="date"
            value={filters.dueAfter}
            onChange={(event) =>
              setFilters((current) => ({ ...current, dueAfter: event.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Due on or before</span>
          <input
            type="date"
            value={filters.dueBefore}
            onChange={(event) =>
              setFilters((current) => ({ ...current, dueBefore: event.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </form>

      {actionError && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          Could not update the task. {actionError}
        </p>
      )}

      {isLoading ? (
        <div
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
        >
          Loading tasks…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-rose-800">
            Could not load tasks. {error}
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            className="w-fit rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-slate-800">
            {pageInfo?.total ? "No tasks on this page" : "No matching tasks"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {pageInfo?.total
              ? "Try another page or update your filters."
              : "Adjust your filters or add a task to get started."}
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Add your first task
          </button>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                All tasks
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {pageInfo?.total ?? tasks.length}{" "}
                {(pageInfo?.total ?? tasks.length) === 1 ? "task" : "tasks"} in your
                workspace
              </p>
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {task.title}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {task.category || "Uncategorized"}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-3xl text-sm leading-5 text-slate-500">
                    {task.description || "No description"}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:max-w-3xl">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Assignee
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${avatarColors[getAvatarColor(task.assignee)]}`}
                          aria-hidden="true"
                        >
                          {getInitials(task.assignee)}
                        </span>
                        <span className="truncate text-xs font-medium text-slate-600">
                          {task.assignee || "Unassigned"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Due date
                      </p>
                      <p
                        className={`mt-2 text-xs font-medium ${isTaskOverdue(task) ? "text-rose-600" : "text-slate-600"}`}
                      >
                        {isTaskOverdue(task) ? "Overdue · " : ""}
                        {formatDueDate(task.dueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Priority
                      </p>
                      <span
                        className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${priorityColors[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Status
                      </p>
                      <span
                        className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusColors[task.status]}`}
                      >
                        {task.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 lg:border-0 lg:pt-0">
                  {task.status !== "Completed" && (
                    <button
                      type="button"
                      onClick={() => void markCompleted(task)}
                      disabled={isMutating}
                      className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark complete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditForm(task)}
                    disabled={isMutating}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setTaskToDelete(task);
                    }}
                    disabled={isMutating}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {pageInfo && pageInfo.totalPages > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-slate-500">
                Page {pageInfo.page} of {pageInfo.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pageInfo.page <= 1 || isLoading}
                  onClick={() =>
                    setQuery((current) => ({ ...current, page: pageInfo.page - 1 }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pageInfo.page >= pageInfo.totalPages || isLoading}
                  onClick={() =>
                    setQuery((current) => ({ ...current, page: pageInfo.page + 1 }))
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {isFormOpen && (
        <TaskForm
          key={editingTask?.id ?? "new-task"}
          task={editingTask}
          error={formError}
          isSubmitting={isMutating}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingTask(undefined);
            setFormError(null);
          }}
          onSubmit={saveTask}
        />
      )}

      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2
              id="delete-task-title"
              className="text-lg font-semibold text-slate-900"
            >
              Delete this task?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <span className="font-medium text-slate-800">
                {taskToDelete.title}
              </span>{" "}
              will be permanently removed.
            </p>
            {deleteError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
              >
                Could not delete the task. {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                disabled={isMutating}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isMutating}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isMutating ? "Deleting…" : "Delete task"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
