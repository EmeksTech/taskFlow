import type { Task, TaskInput } from "@/types/task";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");
const TASKS_URL = `${API_BASE_URL}/tasks`;

async function ensureOk(response: Response) {
  if (!response.ok) {
    const details = await response.text();
    const status = `${response.status} ${response.statusText}`.trim();
    throw new Error(
      details ? `Task API request failed (${status}): ${details}` : `Task API request failed (${status}).`,
    );
  }
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  await ensureOk(response);
  return (await response.json()) as T;
}

export function getTasks() {
  return requestJson<Task[]>(TASKS_URL);
}

export function createTask(task: TaskInput) {
  return requestJson<Task>(TASKS_URL, {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export function updateTask(id: string, changes: Partial<TaskInput>) {
  return requestJson<Task>(`${TASKS_URL}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export async function deleteTask(id: string) {
  const response = await fetch(`${TASKS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
  });
  await ensureOk(response);
}
