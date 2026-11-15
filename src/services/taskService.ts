import type {
  PaginatedTasks,
  Task,
  TaskInput,
  TaskListQuery,
} from "@/types/task";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");
const API_MODE = process.env.NEXT_PUBLIC_API_MODE ?? "mock";

if (API_MODE !== "mock" && API_MODE !== "database") {
  throw new Error(
    'NEXT_PUBLIC_API_MODE must be either "mock" or "database".',
  );
}

const TASKS_URL =
  API_MODE === "database" ? "/api/tasks" : `${API_BASE_URL}/tasks`;

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

function filterAndPaginateTasks(
  tasks: Task[],
  query: TaskListQuery,
): PaginatedTasks {
  const search = query.search?.trim().toLocaleLowerCase();
  const assignee = query.assignee?.trim().toLocaleLowerCase();
  const filtered = tasks.filter((task) => {
    if (
      search &&
      !task.title.toLocaleLowerCase().includes(search) &&
      !task.description.toLocaleLowerCase().includes(search)
    ) {
      return false;
    }
    if (query.status && task.status !== query.status) return false;
    if (query.priority && task.priority !== query.priority) return false;
    if (
      assignee &&
      !task.assignee.toLocaleLowerCase().includes(assignee)
    ) {
      return false;
    }
    if (query.category && task.category !== query.category) return false;
    if (query.dueAfter && (!task.dueDate || task.dueDate < query.dueAfter)) {
      return false;
    }
    if (
      query.dueBefore &&
      (!task.dueDate || task.dueDate > query.dueBefore)
    ) {
      return false;
    }
    return true;
  });

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  return {
    tasks: filtered.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / limit),
  };
}

export async function getTasks(
  query?: TaskListQuery,
): Promise<Task[] | PaginatedTasks> {
  if (!query) return requestJson<Task[]>(TASKS_URL);

  if (API_MODE === "mock") {
    const tasks = await requestJson<Task[]>(TASKS_URL);
    return filterAndPaginateTasks(tasks, query);
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({
    ...query,
    page: query.page ?? 1,
    limit: query.limit ?? 10,
  })) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }

  return requestJson<PaginatedTasks>(`${TASKS_URL}?${params.toString()}`);
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
