"use client";

import { useState, type FormEvent } from "react";
import type { Task, TaskInput, TaskPriority, TaskStatus } from "@/types/task";

interface TaskFormProps {
  task?: Task;
  error: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: TaskInput) => Promise<void>;
}

function getInitialValues(task?: Task): TaskInput {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    assignee: task?.assignee ?? "",
    category: task?.category ?? "",
    priority: task?.priority ?? "Medium",
    status: task?.status ?? "Pending",
    dueDate: task?.dueDate ?? "",
  };
}

export function TaskForm({
  task,
  error,
  isSubmitting,
  onCancel,
  onSubmit,
}: TaskFormProps) {
  const [values, setValues] = useState<TaskInput>(() => getInitialValues(task));
  const [titleError, setTitleError] = useState<string | null>(null);

  function updateField<Field extends keyof TaskInput>(
    field: Field,
    value: TaskInput[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field === "title" && typeof value === "string" && value.trim()) {
      setTitleError(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = values.title.trim();

    if (!title) {
      setTitleError("Enter a task title to continue.");
      return;
    }

    setTitleError(null);
    await onSubmit({
      ...values,
      title,
      description: values.description.trim(),
      assignee: values.assignee.trim(),
      category: values.category.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <h2
            id="task-form-title"
            className="text-lg font-semibold text-slate-900"
          >
            {task ? "Edit task" : "Add a task"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add the details your team needs to keep work moving.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-7">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Task title <span className="text-rose-600">*</span>
            </span>
            <input
              autoFocus
              value={values.title}
              onChange={(event) => updateField("title", event.target.value)}
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? "task-title-error" : undefined}
              placeholder="e.g. Prepare launch checklist"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {titleError && (
              <span
                id="task-title-error"
                className="mt-1.5 block text-xs text-rose-700"
              >
                {titleError}
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Description
            </span>
            <textarea
              value={values.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              rows={3}
              placeholder="Add context or details for this task"
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Assignee
              </span>
              <input
                value={values.assignee}
                onChange={(event) => updateField("assignee", event.target.value)}
                placeholder="e.g. Maya Johnson"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Category
              </span>
              <input
                value={values.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="e.g. Product"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Priority
              </span>
              <select
                value={values.priority}
                onChange={(event) =>
                  updateField("priority", event.target.value as TaskPriority)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Status
              </span>
              <select
                value={values.status}
                onChange={(event) =>
                  updateField("status", event.target.value as TaskStatus)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Due date
              </span>
              <input
                type="date"
                value={values.dueDate}
                onChange={(event) => updateField("dueDate", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
            >
              Could not save the task. {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting
                ? "Saving…"
                : task
                  ? "Save changes"
                  : "Create task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
