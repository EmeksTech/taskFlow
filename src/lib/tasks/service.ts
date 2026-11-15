import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  toApiTask,
  toCreateTaskData,
  toDatabasePriority,
  toDatabaseStatus,
  toUpdateTaskData,
} from "@/lib/tasks/database";
import { ownedTaskWhere } from "@/lib/tasks/authorization";
import type {
  CreateTaskData,
  TaskQuery,
  UpdateTaskData,
} from "./validation";
import type { PaginatedTasks } from "@/types/task";

function createTaskWhere(userId: string, query: TaskQuery) {
  const where: Prisma.TaskWhereInput = ownedTaskWhere(userId);

  if (query.status) where.status = toDatabaseStatus(query.status);
  if (query.priority) where.priority = toDatabasePriority(query.priority);
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.category) {
    where.category = { contains: query.category, mode: "insensitive" };
  }
  if (query.assignee) {
    where.assigneeName = { contains: query.assignee, mode: "insensitive" };
  }
  if (query.dueBefore || query.dueAfter) {
    where.dueDate = {
      ...(query.dueAfter
        ? { gte: new Date(`${query.dueAfter}T00:00:00.000Z`) }
        : {}),
      ...(query.dueBefore
        ? { lte: new Date(`${query.dueBefore}T00:00:00.000Z`) }
        : {}),
    };
  }

  return where;
}

export async function listOwnedTasks(userId: string, query: TaskQuery) {
  const { prisma } = await import("@/lib/prisma");
  const tasks = await prisma.task.findMany({
    where: createTaskWhere(userId, query),
    orderBy: [
      { [query.sortBy]: query.order },
      { id: "asc" },
    ],
  });

  return tasks.map(toApiTask);
}

export async function listOwnedTasksPage(
  userId: string,
  query: TaskQuery,
): Promise<PaginatedTasks> {
  const { prisma } = await import("@/lib/prisma");
  const where = createTaskWhere(userId, query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const [total, tasks] = await prisma.$transaction([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { [query.sortBy]: query.order },
        { id: "asc" },
      ],
    }),
  ]);

  return {
    tasks: tasks.map(toApiTask),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getOwnedTask(userId: string, taskId: string) {
  const { prisma } = await import("@/lib/prisma");
  const task = await prisma.task.findFirst({
    where: ownedTaskWhere(userId, taskId),
  });

  return task ? toApiTask(task) : null;
}

export async function createOwnedTask(userId: string, input: CreateTaskData) {
  const { prisma } = await import("@/lib/prisma");
  const task = await prisma.task.create({
    data: {
      ...toCreateTaskData(input),
      owner: { connect: { id: userId } },
    },
  });

  return toApiTask(task);
}

export async function updateOwnedTask(
  userId: string,
  taskId: string,
  input: UpdateTaskData,
) {
  const { prisma } = await import("@/lib/prisma");
  const where = ownedTaskWhere(userId, taskId);
  const result = await prisma.task.updateMany({
    where,
    data: toUpdateTaskData(input),
  });
  if (result.count === 0) return null;

  const task = await prisma.task.findFirst({ where });
  return task ? toApiTask(task) : null;
}

export async function deleteOwnedTask(userId: string, taskId: string) {
  const { prisma } = await import("@/lib/prisma");
  const result = await prisma.task.deleteMany({
    where: ownedTaskWhere(userId, taskId),
  });

  return result.count > 0;
}
