import type { Prisma } from "@/generated/prisma/client";
import {
  databaseApiDisabled,
  sameOriginFailure,
  jsonError,
  logDatabaseFailure,
  readJsonBody,
  validationError,
} from "@/lib/tasks/http";
import {
  toApiTask,
  toCreateTaskData,
  toDatabasePriority,
  toDatabaseStatus,
} from "@/lib/tasks/database";
import { requireApiUser } from "@/lib/auth/server";
import { ownedTaskWhere } from "@/lib/tasks/authorization";
import {
  createTaskSchema,
  taskQuerySchema,
} from "@/lib/tasks/validation";

export const runtime = "nodejs";

function getTaskQuery(searchParams: URLSearchParams) {
  return taskQuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    priority: searchParams.get("priority") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    assignee: searchParams.get("assignee") ?? undefined,
    dueBefore: searchParams.get("dueBefore") ?? undefined,
    dueAfter: searchParams.get("dueAfter") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    order: searchParams.get("order") ?? undefined,
  });
}

export async function GET(request: Request) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("GET /api/tasks");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  const parsedQuery = getTaskQuery(new URL(request.url).searchParams);
  if (!parsedQuery.success) return validationError(parsedQuery.error);

  const { data: query } = parsedQuery;
  const where: Prisma.TaskWhereInput = ownedTaskWhere(userId);

  if (query.status) {
    where.status = toDatabaseStatus(query.status);
  }
  if (query.priority) {
    where.priority = toDatabasePriority(query.priority);
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

  try {
    const { prisma } = await import("@/lib/prisma");
    const tasks = await prisma.task.findMany({
      where,
      orderBy: { [query.sortBy]: query.order },
    });
    return Response.json(tasks.map(toApiTask));
  } catch (error) {
    logDatabaseFailure("GET /api/tasks", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to retrieve tasks.");
  }
}

export async function POST(request: Request) {
  const disabled = databaseApiDisabled();
  if (disabled) return disabled;

  const authenticated = await requireApiUser("POST /api/tasks");
  if ("response" in authenticated) return authenticated.response;
  const { userId } = authenticated;

  const originError = sameOriginFailure(request);
  if (originError) return originError;

  const parsedBody = await readJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const parsedTask = createTaskSchema.safeParse(parsedBody.body);
  if (!parsedTask.success) return validationError(parsedTask.error);

  try {
    const { prisma } = await import("@/lib/prisma");
    const task = await prisma.task.create({
      data: {
        ...toCreateTaskData(parsedTask.data),
        owner: { connect: { id: userId } },
      },
    });
    return Response.json(toApiTask(task), { status: 201 });
  } catch (error) {
    logDatabaseFailure("POST /api/tasks", error);
    return jsonError(500, "DATABASE_ERROR", "Unable to create the task.");
  }
}
