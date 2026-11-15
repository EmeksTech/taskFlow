import type {
  Prisma,
  Task as DatabaseTask,
  TaskPriority as DatabaseTaskPriority,
  TaskStatus as DatabaseTaskStatus,
} from "@/generated/prisma/client";
import type {
  Task,
  TaskPriority,
  TaskStatus,
} from "@/types/task";
import type { CreateTaskData, UpdateTaskData } from "@/lib/tasks/validation";

const priorityToDatabase: Record<TaskPriority, DatabaseTaskPriority> = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
};

const priorityFromDatabase: Record<DatabaseTaskPriority, TaskPriority> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const statusToDatabase: Record<TaskStatus, DatabaseTaskStatus> = {
  Pending: "PENDING",
  "In Progress": "IN_PROGRESS",
  Completed: "COMPLETED",
};

const statusFromDatabase: Record<DatabaseTaskStatus, TaskStatus> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export function toApiTask(task: DatabaseTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assignee: task.assigneeName ?? "",
    category: task.category,
    dueDate: task.dueDate?.toISOString().slice(0, 10) ?? "",
    priority: priorityFromDatabase[task.priority],
    status: statusFromDatabase[task.status],
  };
}

export function toDatabasePriority(priority: TaskPriority) {
  return priorityToDatabase[priority];
}

export function toDatabaseStatus(status: TaskStatus) {
  return statusToDatabase[status];
}

function toDatabaseDate(value: string | undefined) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

export function toCreateTaskData(
  input: CreateTaskData,
): Prisma.TaskCreateInput {
  return {
    title: input.title,
    description: input.description ?? "",
    category: input.category ?? "",
    priority: toDatabasePriority(input.priority ?? "Medium"),
    status: toDatabaseStatus(input.status ?? "Pending"),
    dueDate: toDatabaseDate(input.dueDate),
    assigneeName: input.assignee || null,
  };
}

export function toUpdateTaskData(
  input: UpdateTaskData,
): Prisma.TaskUpdateInput {
  const data: Prisma.TaskUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.category !== undefined) data.category = input.category;
  if (input.priority !== undefined) {
    data.priority = priorityToDatabase[input.priority];
  }
  if (input.status !== undefined) {
    data.status = statusToDatabase[input.status];
  }
  if (input.dueDate !== undefined) {
    data.dueDate = toDatabaseDate(input.dueDate);
  }
  if (input.assignee !== undefined) {
    data.assigneeName = input.assignee || null;
  }

  return data;
}
