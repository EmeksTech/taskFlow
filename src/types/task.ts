export type TaskStatus = "Pending" | "In Progress" | "Completed";

export type TaskPriority = "Low" | "Medium" | "High";

export type AvatarColor = "violet" | "blue" | "amber" | "rose" | "teal";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  category: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
}

export type TaskInput = Omit<Task, "id">;

export interface TaskListQuery {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  assignee?: string;
  dueAfter?: string;
  dueBefore?: string;
  page?: number;
  limit?: number;
  sortBy?: "title" | "category" | "priority" | "status" | "dueDate" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}

export interface PaginatedTasks {
  tasks: Task[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
