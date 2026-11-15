import type { Prisma } from "@/generated/prisma/client";

export function ownedTaskWhere(
  userId: string,
  taskId?: string,
): Prisma.TaskWhereInput {
  return {
    ownerId: userId,
    ...(taskId === undefined ? {} : { id: taskId }),
  };
}
