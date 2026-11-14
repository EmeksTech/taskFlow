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
